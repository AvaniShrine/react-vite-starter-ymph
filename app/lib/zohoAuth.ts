import { NextResponse } from 'next/server'

const inMemoryRefreshTokens: Record<string, string> = {}

export function storeRefreshToken(userId: string, refreshToken: string) {
    inMemoryRefreshTokens[userId] = refreshToken
}

export function getRefreshToken(userId: string): string | undefined {
    return inMemoryRefreshTokens[userId]
}

export async function refreshAccessToken(userId: string): Promise<string | null> {
    const refreshToken = getRefreshToken(userId)
    if (!refreshToken) {
        return null
    }
    const clientId = process.env.ZOHO_CLIENT_ID!
    const clientSecret = process.env.ZOHO_CLIENT_SECRET!
    const oauthDomain = process.env.ZOHO_OAUTH_DOMAIN || 'accounts.zoho.com'

    const tokenUrl = `https://${oauthDomain}/oauth/v2/token`
    const params = new URLSearchParams()
    params.set('grant_type', 'refresh_token')
    params.set('client_id', clientId)
    params.set('client_secret', clientSecret)
    params.set('refresh_token', refreshToken)

    const resp = await fetch(tokenUrl, {
        method: 'POST',
        body: params,
    })
    const data = await resp.json()
    if (!resp.ok || data.error) {
        return null
    }

    const newAccessToken = data.access_token
    if (!newAccessToken) {
        return null
    }
    if (data.refresh_token) {
        storeRefreshToken(userId, data.refresh_token)
    }
    return newAccessToken
}

export function setAccessTokenCookie(accessToken: string) {
    const res = NextResponse.next()
    res.cookies.set({
        name: 'zoho_access',
        value: accessToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60,
        sameSite: 'lax',
    })
    return res
}
