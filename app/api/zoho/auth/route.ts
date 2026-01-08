import { NextResponse } from 'next/server'

export async function GET() {
    const clientId = process.env.ZOHO_CLIENT_ID
    const redirectUri = process.env.ZOHO_REDIRECT_URI
    const oauthDomain = process.env.ZOHO_OAUTH_DOMAIN || 'accounts.zoho.com'
    const scope = 'ZohoBooks.fullaccess.all,ZohoBooks.settings.read,ZohoCRM.modules.ALL,ZohoCRM.settings.ALL,ZohoCRM.functions.execute.READ,ZohoCRM.functions.execute.CREATE,ZohoInventory.items.READ,ZohoInventory.shipmentorders.READ,ZohoCRM.coql.READ,ZohoMail.messages.ALL,ZohoBooks.settings.UPDATE,ZohoCRM.send_mail.all.CREATE,ZohoInventory.salesorders.READ,ZohoForms.forms.ALL'

    if (!clientId || !redirectUri) {
        return NextResponse.json({ error: 'Missing Zoho env vars' }, { status: 500 })
    }

    const authUrl = new URL(`https://${oauthDomain}/oauth/v2/auth`)
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', scope)
    authUrl.searchParams.set('access_type', 'offline')

    return NextResponse.redirect(authUrl.toString())
}
