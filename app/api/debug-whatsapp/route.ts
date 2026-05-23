import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.META_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    return NextResponse.json({ error: "Missing env variables" }, { status: 500 });
  }

  try {
    const wabaId = "840325311996734";

    // 2. Get Templates
    const tplRes = await fetch(`https://graph.facebook.com/v18.0/${wabaId}/message_templates?limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const tplData = await tplRes.json();

    return NextResponse.json({ success: true, templates: tplData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
