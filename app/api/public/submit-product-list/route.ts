export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { cookies } from 'next/headers'
import { refreshAccessToken } from '@/app/lib/zohoAuth'
import FormData from 'form-data'
import { Readable } from 'stream'

const DEMO_USER_ID = 'demoUser'
const ZOHO_BASE_URL = 'https://www.zohoapis.com/crm/v8'

export async function POST(req: NextRequest) {
  try {
    const { products, accountId } = await req.json()

    if (!accountId || !products) {
      return NextResponse.json(
        { error: 'accountId and products are required' },
        { status: 400 }
      )
    }

    const pdfBuffer = await generateProductListPDF(products)
    const accessToken = await getZohoAccessToken()

    const attachment = await attachPdfToAccount({
      accessToken,
      accountId,
      fileBuffer: pdfBuffer,
      fileName: 'Elitechem-Product-List-2026.pdf'
    })

    return NextResponse.json({
      success: true,
      attachmentId: attachment.attachmentId
    })

  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Unexpected server error' },
      { status: 500 }
    )
  }
}

async function getZohoAccessToken(): Promise<string> {
  const cookieStore = cookies()
  let token = (await cookieStore).get('zoho_access')?.value

  if (!token) {
    token = await refreshAccessToken(DEMO_USER_ID)
  }

  if (!token) {
    throw new Error('Zoho authentication failed')
  }

  return token
}

async function generateProductListPDF(products: Record<string, any>): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let page = pdfDoc.addPage([595.28, 841.89])
  let { width, height } = page.getSize()
  let y = height - 50

  const drawText = (
    text: string,
    options: { size?: number; bold?: boolean; center?: boolean } = {}
  ) => {
    const size = options.size || 11
    const font = options.bold ? helveticaBold : helvetica
    const textWidth = font.widthOfTextAtSize(text, size)

    let x = 50
    if (options.center) x = (width - textWidth) / 2

    if (y < 60) {
      page = pdfDoc.addPage([595.28, 841.89])
      y = page.getSize().height - 50
    }

    page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) })
    y -= size + 6
  }

  drawText('Elitechem Product List – 2026', { size: 18, bold: true, center: true })
  drawText(`Submitted on: ${new Date().toLocaleString()}`, { size: 10, center: true })
  y -= 10

  drawText('Submitted Response', { size: 13, bold: true })

  Object.entries(products).forEach(([key, value]) => {
    drawText(`${key}: ${value ?? ''}`, { size: 10 })
  })

  y -= 10
  drawText('Thank you for your submission.', { size: 10, center: true })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

async function attachPdfToAccount({
  accessToken,
  accountId,
  fileBuffer,
  fileName
}: {
  accessToken: string
  accountId: string
  fileBuffer: Buffer
  fileName: string
}) {
  const url = `${ZOHO_BASE_URL}/Accounts/${accountId}/Attachments`

  const formData = new FormData()
  formData.append(
    'file',
    Readable.from(fileBuffer),
    {
      filename: fileName,
      contentType: 'application/pdf'
    }
  )

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      ...formData.getHeaders()
    },
   // body: formData
  })

  const raw = await res.text()

  if (!res.ok) {
    throw new Error(`Zoho attachment failed: ${raw}`)
  }

  const parsed = JSON.parse(raw)
  const attachmentId = parsed?.data?.[0]?.id

  if (!attachmentId) {
    throw new Error('Attachment uploaded but ID not returned')
  }

  return { attachmentId }
}
