import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { phone, name, amount, mode, purpose, receiptId } = await req.json();

    if (!phone) {
      return NextResponse.json({ success: false, error: "No phone number provided" }, { status: 400 });
    }

    // Integration with Jalpi WhatsApp API
    const apiKey = process.env.JALPI_API_KEY;

    // Clean phone number (Jalpi requires format without '+' or '00', just country code + number)
    let formattedPhone = phone.replace(/[^0-9]/g, '');
    if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone; 
    }

    const receiptMessage = `Dear ${name}, thank you for your generous ${purpose} of ₹${amount} via ${mode}. Your support helps our trust immensely. Receipt ID: #${receiptId}`;

    if (apiKey) {
      const templateName = process.env.JALPI_WHATSAPP_RECEIPT_TEMPLATE_NAME || 'payment_receipt';

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
          BodyParameter: [
            { type: 'text', text: name },
            { type: 'text', text: purpose },
            { type: 'text', text: amount.toString() },
            { type: 'text', text: mode },
            { type: 'text', text: receiptId }
          ]
        })
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`[WhatsApp Jalpi Template] Sent receipt to ${formattedPhone}`);
        return NextResponse.json({ success: true, data });
      }

      console.error("Jalpi API error (template message):", data);
      throw new Error(data?.message || "Failed to send Jalpi WhatsApp template message");
    } else {
      // Simulate success if keys aren't configured
      console.log(`[WhatsApp Simulated Template] To ${formattedPhone}: Receipt (Jalpi keys not set)`);
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
