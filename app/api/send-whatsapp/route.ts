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
      const templateName = process.env.JALPI_WHATSAPP_PASSES_TEMPLATE_NAME || 'bhog_pass_image';
      let overallSuccess = true;
      const responses = [];

      for (let i = 0; i < passes.length; i++) {
        const pass = passes[i];
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=png&data=${encodeURIComponent(pass.url)}`;

        try {
          const response = await fetch(`https://app.jalpi.com/api/v1/sendTemplateMessage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              Key: apiKey,
              to: formattedPhone,
              languageCode: 'en_GB',
              TemplateName: templateName,
              headertype: 'image',
              link: qrImageUrl,
              BodyParameter: [
                { type: 'TEXT', text: name },          // {{1}}
                { type: 'TEXT', text: eventName },     // {{2}}
                { type: 'TEXT', text: pass.label }     // {{3}}
              ]
            })
          });

          const data = await response.json();
          responses.push(data);

          if (!response.ok || data.ErrorCode !== "000") {
            overallSuccess = false;
            console.error(`Jalpi API error for pass ${pass.label}:`, data);
          } else {
            console.log(`[WhatsApp Jalpi Template] Sent pass ${pass.label} to ${formattedPhone}`);
          }
        } catch (err) {
          console.error(`Failed to send pass ${pass.label}:`, err);
          overallSuccess = false;
        }

        // Add a 1-second delay between sending passes to avoid rate limits
        if (i < passes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (overallSuccess) {
        return NextResponse.json({ success: true, data: responses });
      } else {
        throw new Error("Failed to send one or more WhatsApp messages. Check server logs.");
      }
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
