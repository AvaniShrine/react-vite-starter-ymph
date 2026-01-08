import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { refreshAccessToken, setAccessTokenCookie } from '../../../lib/zohoAuth'

const DEMO_USER_ID = 'demoUser'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const recordId = body?.recordId

  if (!recordId) {
    return NextResponse.json({ error: 'Missing recordId in request body' }, { status: 400 })
  }

  const cookieStore = cookies()
  let accessToken = (await cookieStore).get('zoho_access')?.value

  if (!accessToken) {
    return NextResponse.redirect(new URL(process.env.BASE_URL!))
  }

  const endpoint = `https://www.zohoapis.com/crm/v2/producttab__Sample_Requests/${recordId}/Attachments?include_download_url=true`
  console.log(`Fetching attachments from: ${endpoint}`)

  let zohoRes = await fetch(endpoint, {
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
    },
  })

  // Handle token expiry
  if (zohoRes.status === 401) {
    const newToken = await refreshAccessToken(DEMO_USER_ID)
    if (!newToken) {
      return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 })
    }

    const newCookieRes = setAccessTokenCookie(newToken)
    zohoRes = await fetch(endpoint, {
      headers: {
        Authorization: `Zoho-oauthtoken ${newToken}`,
      },
    })
    console.log(JSON.stringify(zohoRes));
    if (!zohoRes.ok) {
      const e = await safeJsonParse(zohoRes)
      return new Response(JSON.stringify({ error: 'Error after token refresh', detail: e }), {
        ...newCookieRes,
        status: 500,
        headers: {
          ...newCookieRes.headers,
          'Content-Type': 'application/json',
        },
      })
    }

    const result = await safeJsonParse(zohoRes)
    const attachments = extractAttachments(result)
    return new Response(JSON.stringify({ attachments }), {
      ...newCookieRes,
      headers: {
        ...newCookieRes.headers,
        'Content-Type': 'application/json',
      },
    })
  }

  // Normal success path
  if (!zohoRes.ok) {
    const errData = await safeJsonParse(zohoRes)
    return NextResponse.json({ error: 'Failed to fetch attachments', detail: errData }, { status: 500 })
  }

  const result = await safeJsonParse(zohoRes)
  const attachments = extractAttachments(result)
  return NextResponse.json({ attachments })
}

// Helper functions
function extractAttachments(result: any) {
  const ORG_ID = "853227453"; // Replace with your actual Org ID

  return (
    result?.data?.map((file: any) => {
      const fileNameEncoded = encodeURIComponent(file.File_Name || "Attachment.pdf");

      const previewUrl = `https://crm.zoho.com/crm/org853227453/ViewAttachment?fileId=${file.$file_id}&module=${file.$se_module}&parentId=${file.Parent_Id?.id}&creatorId=${file.Created_By?.id}&id=${file.id}&name=${fileNameEncoded}&downLoadMode=pdfViewPlugin&attach=undefined`;

      return {
        id: file.id,
        name: file.File_Name,
        url: previewUrl, 
      };
    }) ?? []
  );
}


async function safeJsonParse(res: Response): Promise<any> {
  try {
    return await res.json()
  } catch {
    return null
  }
}
