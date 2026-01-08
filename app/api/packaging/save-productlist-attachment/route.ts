import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { refreshAccessToken, setAccessTokenCookie } from '../../../lib/zohoAuth'

const DEMO_USER_ID = 'demoUser'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const recordId = body?.recordId
    const fileName = body?.fileName || 'product-list.pdf'
    const fileBase64 = body?.fileBase64

    if (!recordId || !fileBase64) {
      return NextResponse.json({ error: 'Missing recordId or fileBase64 in request body' }, { status: 400 })
    }

    const cookieStore = cookies()
    let accessToken = (await cookieStore).get('zoho_access')?.value

    if (!accessToken) {
      return NextResponse.json({ error: 'Zoho access token missing' }, { status: 401 })
    }

    const endpoint = `https://www.zohoapis.com/crm/v2/Accounts/${recordId}/Attachments` // v2 attachments endpoint

    // Prepare form-data with binary buffer
    const FormDataClass = (await import('form-data')).default
    const formData = new FormDataClass()
    const buffer = Buffer.from(fileBase64, 'base64')
    formData.append('file', buffer, { filename: fileName })

    let zohoRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        ...formData.getHeaders()
      },
      body: formData as any
    })

    // If token expired, refresh and retry
    if (zohoRes.status === 401) {
      const newToken = await refreshAccessToken(DEMO_USER_ID)
      if (!newToken) {
        return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 })
      }

      const newCookieRes = setAccessTokenCookie(newToken)

      zohoRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Zoho-oauthtoken ${newToken}`,
          ...formData.getHeaders()
        },
        body: formData as any
      })

      if (!zohoRes.ok) {
        const e = await safeJsonParse(zohoRes)
        return new Response(JSON.stringify({ error: 'Upload failed after token refresh', detail: e }), {
          ...newCookieRes,
          status: 500,
          headers: {
            ...newCookieRes.headers,
            'Content-Type': 'application/json'
          }
        })
      }

      const result = await zohoRes.json()
      return new Response(JSON.stringify({ success: true, result }), {
        ...newCookieRes,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!zohoRes.ok) {
      const err = await safeJsonParse(zohoRes)
      return NextResponse.json({ error: 'Upload failed', detail: err }, { status: 500 })
    }

    const result = await zohoRes.json()
    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    console.error('save-productlist-attachment error:', err)
    return NextResponse.json({ error: 'Unexpected error', detail: err.message }, { status: 500 })
  }
}

async function safeJsonParse(res: Response): Promise<any> {
  try {
    return await res.json()
  } catch {
    return null
  }
}
