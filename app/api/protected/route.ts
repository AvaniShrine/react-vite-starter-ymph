import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { refreshAccessToken, setAccessTokenCookie } from '../../lib/zohoAuth'

const DEMO_USER_ID = 'demoUser'

export async function GET(req: NextRequest) {
    const cookieStore = cookies()
    let accessToken = (await cookieStore).get('zoho_access')?.value
    if (!accessToken) {
        return NextResponse.redirect(new URL(process.env.BASE_URL));
        // return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Make a call to Zoho (e.g. inventory items)
    const orgId = process.env.ZOHO_INVENTORY_ORG_ID
    const inventoryDomain = 'inventory.zoho.com' // or inventory.zoho.eu etc.
    const endpoint = `https://${inventoryDomain}/api/v1/items?organization_id=${orgId}`

    let zohoRes = await fetch(endpoint, {
        headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
    })
    if (zohoRes.status === 401) {
        // Attempt refresh
        const newToken = await refreshAccessToken(DEMO_USER_ID)
        if (!newToken) {
            return NextResponse.json({ error: 'Refresh failed' }, { status: 401 })
        }
        // Set the new cookie
        const newCookieRes = setAccessTokenCookie(newToken)
        // Retry once
        zohoRes = await fetch(endpoint, {
            headers: {
                Authorization: `Zoho-oauthtoken ${newToken}`,
            },
        })
        if (!zohoRes.ok) {
            const errData = await zohoRes.json()
            return NextResponse.json({ error: 'Failed after refresh', detail: errData }, { status: 500 })
        }
        const data = await zohoRes.json()
        // Return with updated cookie
        newCookieRes.headers.set('Content-Type', 'application/json')
        return new NextResponse(JSON.stringify({ data }), {
            headers: newCookieRes.headers,
            status: 200,
        })
    }

    if (!zohoRes.ok) {
        const errData = await zohoRes.json()
        return NextResponse.json({ error: 'Zoho error', detail: errData }, { status: 500 })
    }

    // success
    const data = await zohoRes.json()
    return NextResponse.json({ data }, { status: 200 })
}
