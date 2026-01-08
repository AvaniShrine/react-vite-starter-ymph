import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { refreshAccessToken, setAccessTokenCookie } from '../../../lib/zohoAuth'

const DEMO_USER_ID = 'demoUser'

export async function GET(req: NextRequest) {
  console.log("===== Incoming Request =====")
  console.log("URL:", req.url)

  const cookieStore = cookies()
  let accessToken = (await cookieStore).get('zoho_access')?.value
  console.log("Access Token:", accessToken)

  if (!accessToken) {
    console.log("No access token found")
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('accountId')
  const leadId = searchParams.get('leadId')

  console.log("Query Params - accountId:", accountId, "leadId:", leadId)

  if (!accountId && !leadId) {
    console.log("Missing accountId and leadId")
    return NextResponse.json(
      { error: 'accountId or leadId is required' },
      { status: 400 }
    )
  }

  let criteria = ''
  if (accountId) {
    criteria = `(Account_Name:equals:${accountId})`
  } else if (leadId) {
    criteria = `(Lead:equals:${leadId})`
  }

  const endpoint = `https://www.zohoapis.com/crm/v2/Contacts/search?criteria=${encodeURIComponent(
    criteria
  )}&fields=id,Full_Name,Email,Phone,Account_Name,Lead`

  console.log("Zoho API Endpoint:", endpoint)

  let zohoRes = await fetch(endpoint, {
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
    },
  })
  console.log("Zoho Response Status:", zohoRes.status)

  if (zohoRes.status === 401) {
    console.log("Access token expired, refreshing...")
    const newToken = await refreshAccessToken(DEMO_USER_ID)
    console.log("New Token:", newToken)

    if (!newToken) {
      console.log("Failed to refresh token")
      return NextResponse.json({ error: 'Refresh failed' }, { status: 401 })
    }

    const cookieRes = setAccessTokenCookie(newToken)

    zohoRes = await fetch(endpoint, {
      headers: {
        Authorization: `Zoho-oauthtoken ${newToken}`,
      },
    })
    console.log("Zoho Response After Refresh Status:", zohoRes.status)

    if (!zohoRes.ok) {
      const err = await safeJsonParse(zohoRes)
      console.log("Error after token refresh:", err)
      return NextResponse.json(
        { error: 'Zoho fetch failed after refresh', detail: err },
        { status: 500 }
      )
    }

    const data = await safeJsonParse(zohoRes)
    console.log("Zoho Data After Refresh:", data)

    cookieRes.headers.set('Content-Type', 'application/json')
    return new Response(JSON.stringify(normalizeContacts(data)), {
      ...cookieRes,
      headers: {
        ...cookieRes.headers,
        'Content-Type': 'application/json',
      },
    })
  }

  if (!zohoRes.ok) {
    const err = await safeJsonParse(zohoRes)
    console.log("Zoho fetch error:", err)
    return NextResponse.json(
      { error: 'Zoho contacts fetch error', detail: err },
      { status: 500 }
    )
  }

  const data = await safeJsonParse(zohoRes)
  console.log("Zoho Data:", data)
  return NextResponse.json(normalizeContacts(data))
}

// 🔹 Normalize Zoho response for frontend
function normalizeContacts(data: any) {
  const contacts = (data?.data || []).map((c: any) => ({
    id: c.id,
    name: c.Full_Name,
    email: c.Email || null,
    phone: c.Phone || null,
    accountId: c.Account_Name?.id || null,
    accountName: c.Account_Name?.name || null,
    leadId: c.Lead?.id || null,
  }))
  console.log("Normalized Contacts:", contacts)
  return { data: contacts }
}

async function safeJsonParse(res: Response) {
  try {
    return await res.json()
  } catch (e) {
    console.log("Failed to parse JSON:", e)
    return null
  }
}
