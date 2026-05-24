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

    // Integration with Meta WhatsApp Cloud API
    const token = process.env.META_WHATSAPP_TOKEN;
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

    // Clean phone number (Meta requires format without '+' or '00', just country code + number)
    let formattedPhone = phone.replace(/[^0-9]/g, '');
    if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone; // default to India if just 10 digits
    }

    if (token && phoneNumberId) {
      const passesListString = passes
        .map((p: Record<string, string>) => `👉 ${p.label}: ${p.url}`)
        .join('\n');

      const templateName = process.env.META_WHATSAPP_PASSES_TEMPLATE_NAME || 'bhogappointment';
      const tryLanguages = ['en_US', 'en', 'en_GB', 'en_IN']; // prioritized en_US based on user request
      let response: Response | undefined;
      let data: any;
      
      // Extract the dynamic part of the URL for the button (assuming base URL is set in Meta)
      // e.g. from https://smca-bhogpass.vercel.app/pass/123 -> 123
      const firstPassUrl = passes[0]?.url || "";
      const passId = firstPassUrl.split('/').pop() || "";

      response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
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
            name: templateName,
            language: {
              code: "en_US"
            },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: name }, // {{1}} Name
                  { type: 'text', text: "SMCA" }, // {{2}} Business Name
                  { type: 'text', text: "Bhog Pass" }, // {{3}} Appointment for
                  { type: 'text', text: eventName }, // {{4}} Date/Event
                  { type: 'text', text: "Event Time" } // {{5}} Time
                ]
              },
              {
                type: 'button',
                sub_type: 'url',
                index: '0',
                parameters: [
                  { type: 'text', text: passId } // The dynamic suffix for the URL button
                ]
              }
            ]
          }
        })
      });

      data = await response.json();

      if (response.ok) {
        console.log(`[WhatsApp Meta Template] Sent to ${formattedPhone}: ${passes.length} passes for ${eventName} using ${templateName}/en_US`);
        return NextResponse.json({ success: true, data });
      }

      console.warn(`[WhatsApp] Template ${templateName} failed in en_US.`);

      // Fallback to a regular text message if template is missing / not translated.
      if (data?.error?.code === 132001) {
        const textResponse = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: formattedPhone,
            type: 'text',
            text: {
              body: `Hello ${name},\n\nYour passes for ${eventName} are ready:\n${passesListString}`
            }
          })
        });

        const textData = await textResponse.json();
        if (textResponse.ok) {
          console.warn(`[WhatsApp] Template ${templateName} unavailable. Sent text fallback to ${formattedPhone}.`);
          return NextResponse.json({ success: true, data: textData, fallback: 'text' });
        }
      }

      console.error("Meta API error (template message):", data);
      throw new Error(data?.error?.message || "Failed to send Meta WhatsApp template message");
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
