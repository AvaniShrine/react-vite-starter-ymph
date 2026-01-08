import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    const [data, signature] = token.split(".");
    const expected = crypto
      .createHmac("sha256", process.env.PUBLIC_LINK_SECRET!)
      .update(data)
      .digest("hex");

    if (signature !== expected) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const payload = JSON.parse(
      Buffer.from(data, "base64").toString("utf-8")
    );

    if (payload.exp < Date.now()) {
      return NextResponse.json({ error: "Link expired" }, { status: 401 });
    }

    return NextResponse.json({ success: true, payload });
  } catch (e) {
    return NextResponse.json({ error: "Token validation failed" }, { status: 401 });
  }
}
