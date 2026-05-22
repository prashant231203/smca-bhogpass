import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { phone, name, passes, eventName } = await req.json();

    if (!phone) {
      return NextResponse.json({ success: false, error: "No phone number provided" }, { status: 400 });
    }

    // Integration with Meta WhatsApp Cloud API
    const token = process.env.META_WHATSAPP_TOKEN;
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

    // Clean phone number (Meta requires format without '+' or '00', just country code + number)
    let formattedPhone = phone.replace(/[^0-9]/g, '');
    if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone; // default to India if just 10 digits
    }

    let messageBody = `Hello ${name},\n\nYour passes for ${eventName} are ready:\n`;
    passes.forEach((p: Record<string, string>) => {
      messageBody += `- ${p.label}: ${p.url}\n`;
    });

    if (token && phoneNumberId) {
      // Format all passes (e.g. Primary, Spouse, Children) into a bulleted string for {{3}}
      const passesListString = passes
        .map((p: Record<string, string>) => `👉 ${p.label}: ${p.url}`)
        .join('\n');

      const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'template',
          template: {
            name: 'bhogpass',
            language: {
              code: 'en'
            }
          }
        })
      });
      
      const data = await response.json();

      if (!response.ok) {
        console.error("Meta API error (template message):", data);
        throw new Error(data?.error?.message || "Failed to send Meta WhatsApp template message");
      }
      
      console.log(`[WhatsApp Meta Template] Sent to ${formattedPhone}: ${passes.length} passes for ${eventName}`);
      return NextResponse.json({ success: true, data });
    } else {
      // For now, we simulate success if keys aren't configured so the application logic completes without crashing
      console.log(`[WhatsApp Simulated Template] To ${formattedPhone}: ${passes.length} passes for ${eventName} (Meta keys not set)`);
      const passesListString = passes
        .map((p: Record<string, string>) => `👉 ${p.label}: ${p.url}`)
        .join('\n');
      console.log(`[WhatsApp Simulated Body]\nHello ${name},\n\nYour passes for ${eventName} are ready!\n\n${passesListString}`);
      return NextResponse.json({ success: true, simulated: true });
    }
  } catch (error: unknown) {
    console.error("WhatsApp API Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
