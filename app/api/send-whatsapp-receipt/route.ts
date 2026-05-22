import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { phone, name, amount, mode, purpose, receiptId } = await req.json();

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

    const receiptMessage = `Dear ${name}, thank you for your generous ${purpose} of ₹${amount} via ${mode}. Your support helps our trust immensely. Receipt ID: #${receiptId}`;

    if (token && phoneNumberId) {
      // Send the approved Meta Utility Template 'payment_receipt'
      // Note: If you don't have this template approved yet, this will fail.
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
              name: 'payment_receipt', // You need to create and approve this template in Meta
              language: {
                code: lang
              },
              components: [
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', text: name },
                    { type: 'text', text: purpose },
                    { type: 'text', text: amount.toString() },
                    { type: 'text', text: mode },
                    { type: 'text', text: receiptId }
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
        
        if (data.error?.code !== 132001) {
          break;
        }
        console.warn(`[WhatsApp] Receipt template not found in locale: ${lang}, trying next...`);
      }

      if (!response || !response.ok) {
        console.error("Meta API error (template message):", data);
        throw new Error(data?.error?.message || "Failed to send Meta WhatsApp template message");
      }
      
      console.log(`[WhatsApp Meta Template] Sent receipt to ${formattedPhone}`);
      return NextResponse.json({ success: true, data });
    } else {
      // Simulate success if keys aren't configured
      console.log(`[WhatsApp Simulated Template] To ${formattedPhone}: Receipt (Meta keys not set)`);
      console.log(`[WhatsApp Simulated Body]\n${receiptMessage}`);
      return NextResponse.json({ success: true, simulated: true, message: receiptMessage });
    }
  } catch (error: unknown) {
    console.error("WhatsApp API Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
