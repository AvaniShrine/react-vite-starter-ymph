import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

interface Contact {
    id: string
    name: string
    email: string
    firstName: string
}

interface RequestBody {
    contacts: Contact[]
    entityId?: string
    entityName?: string
    publicLink?: string;
}

export async function POST(req: NextRequest) {
    try {
        /* ---------------- READ REQUEST BODY ---------------- */
        const body: RequestBody = await req.json()
        console.log('Incoming Request Body:', JSON.stringify(body, null, 2))

        const cookieStore = cookies()
        const accessToken = (await cookieStore).get('zoho_access')?.value
        console.log('Access Token Present:', !!accessToken)

        if (!accessToken) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        if (!body.contacts || body.contacts.length === 0) {
            return NextResponse.json({ error: 'No contacts provided' }, { status: 400 })
        }

        /* ---------------- BUILD FUNCTION PAYLOAD ---------------- */
        const requestData = {
            contacts: body.contacts,
            entityId: body.entityId,
            entityName: body.entityName,
            publicLink: body.publicLink
        }

        /* Build FORM encoded body */
        const formBody = new URLSearchParams({
            requestData: JSON.stringify(requestData),
            auth_type: 'oauth',
        }).toString()

        //console.log(' Zoho Function Payload:', formBody)

        /* IMPORTANT: Use crm.zoho.com */
        const functionUrl =
            'https://crm.zoho.com/crm/v2/functions/sendproductemails/actions/execute'

        const functionRes = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                Authorization: `Zoho-oauthtoken ${accessToken}`,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            },
            body: formBody,
        })

        const rawResponse = await functionRes.text()
      //  console.log('Zoho Function Raw Response:', rawResponse)

        let jsonResponse = null
        try {
            jsonResponse = JSON.parse(rawResponse)
        } catch (e) {
            console.error('Response is not JSON')
        }

        return NextResponse.json({
            success: true,
            response: jsonResponse ?? rawResponse,
        })
    } catch (err: any) {
        console.error(' Send Product Email Error:', err)
        return NextResponse.json(
            { error: 'Something went wrong', detail: err?.message },
            { status: 500 }
        )
    }
}
