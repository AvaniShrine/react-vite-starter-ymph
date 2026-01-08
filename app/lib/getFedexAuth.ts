let fedexAuthToken: string | null = null;
let fedexAuthTokenExpiry = 0; // Store absolute timestamp in ms

export const fedexBaseUrl =   'https://apis-sandbox.fedex.com'; //'https://apis.fedex.com'; 
// ------------------------------------------
// 2. Utility to get or refresh the FedEx token
// ------------------------------------------
export async function getFedexAuthToken() {
    // If we already have a valid token (not expired), return it
    if (fedexAuthToken && Date.now() < fedexAuthTokenExpiry) {
        return fedexAuthToken;
    }

    // Otherwise, request a new token
    const tokenUrl = `${fedexBaseUrl}/oauth/token`;
    const client_id = process.env.FEDEX_CLIENT_ID ?? 'YOUR_CLIENT_ID';
    const client_secret = process.env.FEDEX_CLIENT_SECRET ?? 'YOUR_SECRET';

    // Build the body as x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', client_id);
    params.append('client_secret', client_secret);

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
    });

    if (!response.ok) {
        throw new Error(`Failed to retrieve FedEx token. Status: ${response.status}`);
    }

    const data = await response.json();

    /*
      Typical FedEx response includes:
        {
          "access_token": "...",
          "scope": "...",
          "token_type": "Bearer",
          "expires_in": 3600
        }
    */
    fedexAuthToken = data.access_token;
    const expiresInSeconds = data.expires_in || 1800; // default 30 min if not provided

    // Current time + expiresIn (converting seconds → milliseconds)
    fedexAuthTokenExpiry = (Date.now() + expiresInSeconds * 1000) - 1000;

    return fedexAuthToken;
}
