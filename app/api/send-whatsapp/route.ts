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

      // Send the approved Meta Utility Template 'bhogpass'
      // This bypasses the 24-hour customer service window constraint!
      const tryLanguages = ['en', 'en_US', 'en_GB', 'en_IN'];
      let response;
      let data;

      for (const lang of tryLanguages) {
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
              name: 'bhogpass',
              language: {
                code: lang
              },
              components: [
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', text: name },
                    { type: 'text', text: eventName },
                    { type: 'text', text: passesListString }
                  ]
                }
              ]
            }
          })
        });
        
        data = await response.json();
        
        if (response.ok) {
          break;
        }
        
        // If the error is NOT "Template name does not exist in the translation" (132001), 
        // there is no point trying other languages.
        if (data.error?.code !== 132001) {
          break;
        }
        console.warn(`[WhatsApp] Template not found in locale: ${lang}, trying next...`);
      }

      if (!response || !response.ok) {
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
