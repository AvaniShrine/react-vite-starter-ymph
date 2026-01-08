import { NextResponse } from 'next/server'
import { storeRefreshToken } from '../../../lib/zohoAuth'
import { headers } from 'next/headers'

const DEMO_USER_ID = 'demoUser'

export async function GET(request: Request) {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')
    // Use next/headers() to read raw headers
    const h = headers()
    const forwardedHost = (await h).get('x-forwarded-host') || 'localhost:3000'
    const forwardedProto = (await h).get('x-forwarded-proto') || 'http'

    // Reconstruct the origin from the forwarded headers
    const origin = `${forwardedProto}://${forwardedHost}`

    if (error) {
        return NextResponse.redirect(`${origin}/?error=` + encodeURIComponent(error))
    }
    if (!code) {
        return NextResponse.redirect(`${origin}/?error=MissingCode`)
    }

    try {
        const clientId = process.env.ZOHO_CLIENT_ID!
        const clientSecret = process.env.ZOHO_CLIENT_SECRET!
        const redirectUri = process.env.ZOHO_REDIRECT_URI!
        const oauthDomain = process.env.ZOHO_OAUTH_DOMAIN || 'accounts.zoho.com'

        const tokenUrl = `https://${oauthDomain}/oauth/v2/token`
        const params = new URLSearchParams()
        params.set('grant_type', 'authorization_code')
        params.set('client_id', clientId)
        params.set('client_secret', clientSecret)
        params.set('redirect_uri', redirectUri)
        params.set('code', code)

        const resp = await fetch(tokenUrl, {
            method: 'POST',
            body: params,
        })
        const data = await resp.json()
        if (!resp.ok || data.error) {
            return NextResponse.redirect(`${origin}/?error=` + encodeURIComponent(data.error || 'TokenError'))
        }

        const { access_token, refresh_token } = data
        if (!access_token) {
            return NextResponse.redirect(`${origin}/?error=NoAccessToken`)
        }

        if (refresh_token) {
            storeRefreshToken(DEMO_USER_ID, refresh_token)
        }

        const response = NextResponse.redirect(`${origin}/productlist`)
        response.cookies.set({
            name: 'zoho_access',
            value: access_token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60 * 60,
            sameSite: 'lax',
        })

        return response
    } catch (err: any) {
        return NextResponse.redirect(`${origin}/?error=` + encodeURIComponent(err.message))
    }
}
