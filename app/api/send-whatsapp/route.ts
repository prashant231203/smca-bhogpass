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
      // 1. Send the text summary message
      // Note: If the user hasn't messaged this business number within 24 hours,
      // Meta requires you to send an approved 'template' message rather than a free-form 'text'.
      // For production, you may need to change 'type' to 'template' and map the variables.
      const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: { body: messageBody }
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        console.error("Meta API error (text message):", data);
        throw new Error(data.error?.message || "Failed to send Meta WhatsApp text message");
      }
      
      console.log(`[WhatsApp Meta] Summary sent to ${formattedPhone}: ${passes.length} passes for ${eventName}`);

      // 2. Send QR code images for each pass
      const mediaResults = [];
      for (const pass of passes) {
        if (pass.id) {
          // Generate a public QR Code image URL using qrserver.com
          const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${pass.id}`;
          const imageCaption = `🎟️ Pass for ${pass.label}\n🔗 View online: ${pass.url}`;
          
          try {
            const mediaResponse = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: formattedPhone,
                type: 'image',
                image: {
                  link: qrImageUrl,
                  caption: imageCaption
                }
              })
            });
            
            const mediaData = await mediaResponse.json();
            if (!mediaResponse.ok) {
              console.error(`Meta API error (image for ${pass.label}):`, mediaData);
            } else {
              console.log(`[WhatsApp Meta QR] Successfully sent QR image for ${pass.label} to ${formattedPhone}`);
              mediaResults.push(mediaData);
            }
          } catch (mediaErr) {
            console.error(`Failed to send QR image for ${pass.label}:`, mediaErr);
          }
        }
      }
      
      return NextResponse.json({ success: true, textData: data, mediaResults });
    } else {
      // For now, we simulate success if keys aren't configured so the application logic completes without crashing
      console.log(`[WhatsApp Simulated] To ${formattedPhone}: ${passes.length} passes for ${eventName} (Meta keys not set)`);
      passes.forEach((pass: Record<string, string>) => {
        console.log(`[WhatsApp Simulated QR] ${pass.label} URL: https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${pass.id}`);
      });
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
