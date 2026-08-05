import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { phone, name, passes, eventName } = await req.json();

    if (!phone) {
      return NextResponse.json({ success: false, error: "No phone number provided" }, { status: 400 });
    }

    if (!Array.isArray(passes) || passes.length === 0) {
      return NextResponse.json({ success: false, error: "No passes provided" }, { status: 400 });
    }

    // Integration with Jalpi WhatsApp API
    const apiKey = process.env.JALPI_API_KEY;

    // Clean phone number (Jalpi requires country code + number, e.g., 919876543210)
    let formattedPhone = phone.replace(/[^0-9]/g, '');
    if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    }

    if (apiKey) {
      const passesListString = passes
        .map((p: Record<string, string>) => `👉 ${p.label}: ${p.url}`)
        .join('\n');

      const templateName = process.env.JALPI_WHATSAPP_PASSES_TEMPLATE_NAME || 'bhog_pass';

      const response = await fetch(`https://app.jalpi.com/api/v1/sendTemplateMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: apiKey,
          to: formattedPhone,
          languageCode: 'en_GB',
          TemplateName: templateName,
          headertype: 'text',
          headertext: '🎫 SMCA Event Pass',
          BodyParameter: [
            { type: 'text', text: name },          // {{1}}
            { type: 'text', text: eventName },     // {{2}}
            { type: 'text', text: passesListString } // {{3}}
          ]
        })
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`[WhatsApp Jalpi Template] Sent to ${formattedPhone}: ${passes.length} passes for ${eventName}`);
        return NextResponse.json({ success: true, data });
      }

      console.error("Jalpi API error (template message):", data);
      throw new Error(data?.message || "Failed to send Jalpi WhatsApp template message");
    } else {
      // For now, we simulate success if keys aren't configured so the application logic completes without crashing
      console.log(`[WhatsApp Simulated Template] To ${formattedPhone}: ${passes.length} passes for ${eventName} (Jalpi keys not set)`);
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
