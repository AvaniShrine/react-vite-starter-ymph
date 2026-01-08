import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { accountId, contactId } = body;

    if (!accountId || !contactId) {
      return NextResponse.json(
        { error: "Missing accountId or contactId" },
        { status: 400 }
      );
    }

    /* -------- TOKEN PAYLOAD -------- */
    const payload = {
      accountId,
      contactId,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 30 // 30 days
    };

    const secret = process.env.PUBLIC_LINK_SECRET!;
    const data = Buffer.from(JSON.stringify(payload)).toString("base64");

    const signature = crypto
      .createHmac("sha256", secret)
      .update(data)
      .digest("hex");

    const token = `${data}.${signature}`;

    const publicUrl = `${process.env.BASE_URL}/product-list?t=${token}&a=${accountId}`;

    return NextResponse.json({
      success: true,
      url: publicUrl
    });
  } catch (err) {
    console.error("Generate Public Link Error:", err);
    return NextResponse.json(
      { error: "Failed to generate public link" },
      { status: 500 }
    );
  }
}
