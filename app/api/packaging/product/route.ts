import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { refreshAccessToken, setAccessTokenCookie } from '../../../lib/zohoAuth'

const DEMO_USER_ID = 'demoUser'

export async function GET(req: NextRequest) {
  console.log("===== Incoming Products Request =====")
  console.log("URL:", req.url)

  const cookieStore = cookies()
  let accessToken = (await cookieStore).get('zoho_access')?.value
  console.log("Access Token:", accessToken)

  if (!accessToken) {
    console.log("No access token found")
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // 🔹 EliteChem product criteria
  const criteria =
    "(EliteChem_Product:equals:true) and " +
    "(Finished_EliteChem_Product:equals:Yes) and " +
    "((Product_Website_Status:equals:Live) or (Product_Website_Status:equals:Draft)) and " +
    "((Item_Classification:equals:Organization Only) or (Item_Classification:equals:Public))"

  const endpoint = `https://www.zohoapis.com/crm/v2/Products/search?criteria=${encodeURIComponent(
    criteria
  )}&fields=id,Product_Name,Product_Category,Category,Description,Product_Code,Unit_Price,UoM,Quantity_per_SKU`

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

    if (!newToken) {
      return NextResponse.json({ error: 'Refresh failed' }, { status: 401 })
    }

    const cookieRes = setAccessTokenCookie(newToken)

    zohoRes = await fetch(endpoint, {
      headers: {
        Authorization: `Zoho-oauthtoken ${newToken}`,
      },
    })

    const data = await safeJsonParse(zohoRes)

    cookieRes.headers.set('Content-Type', 'application/json')
    return new Response(JSON.stringify(normalizeProducts(data)), {
      ...cookieRes,
      headers: {
        ...cookieRes.headers,
        'Content-Type': 'application/json',
      },
    })
  }

  if (!zohoRes.ok) {
    const err = await safeJsonParse(zohoRes)
    return NextResponse.json(
      { error: 'Zoho products fetch error', detail: err },
      { status: 500 }
    )
  }

  const data = await safeJsonParse(zohoRes)
  //console.log("Zoho Products Data:", data)

  return NextResponse.json(normalizeProducts(data))
}

// 🔹 Normalize Products for frontend
function normalizeProducts(data: any) {
  const products = (data?.data || []).map((p: any) => ({
    id: p.id,
    name: p.Product_Name,
    category: p.Category || null,
    description: p.Description || null,
    productCode: p.Product_Code || null,
    price: p.Unit_Price || null,
    uom: p.UoM || null,
    qty: p.Quantity_per_SKU || null
  }))

  //console.log("Normalized Products:", products)
  return { data: products }
}

async function safeJsonParse(res: Response) {
  try {
    return await res.json()
  } catch (e) {
    console.log("Failed to parse JSON:", e)
    return null
  }
}
