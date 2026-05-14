import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { email, name, passes, eventName } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!passes || passes.length === 0) {
       return NextResponse.json({ error: 'No passes provided' }, { status: 400 });
    }

    const brevoApiKey = process.env.BREVO_API_KEY;

    // In local development or if testing without an API key, fake the success
    if (!brevoApiKey) {
      console.log(`Mock Email Sent via Brevo Logger to: ${email} with ${passes.length} passes.`);
      return NextResponse.json({ 
        success: true, 
        message: "Mock email successful! Set BREVO_API_KEY to send real emails." 
      });
    }

    const passesHtml = passes.map((p: any) => `
      <div style="margin: 24px auto; padding: 24px; border: 2px dashed #94a3b8; border-radius: 12px; background: #ffffff; max-width: 300px;">
        <h3 style="margin-top: 0; color: #1e293b; font-size: 18px; margin-bottom: 16px;">${p.label}</h3>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${p.id}&margin=10" alt="QR Code" width="200" height="200" style="display: block; margin: 0 auto; border-radius: 8px; border: 1px solid #e2e8f0;" />
      </div>
    `).join('');

    // Call Brevo REST API Directly
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": brevoApiKey
      },
      body: JSON.stringify({
        sender: { 
          name: "SMCA BhogPass", 
          email: process.env.BREVO_VERIFIED_SENDER || "noreply@smca.com" // Brevo requires a verified sender email!
        },
        to: [{ email, name }],
        subject: `Your Entry Passes for ${eventName}`,
        htmlContent: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 30px; background: #f8fafc; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0;">
            <h1 style="color: #4338ca; font-size: 24px; font-weight: 800; margin-bottom: 8px;">Hi ${name}!</h1>
            <p style="font-size: 16px; color: #475569; margin-bottom: 24px; line-height: 1.5;">Here are your digital entry passes for <strong style="color: #0f172a;">${eventName}</strong>.</p>
            
            ${passesHtml}

            <p style="font-size: 13px; color: #94a3b8; margin-top: 32px;">Please present these QR codes at the gate to enter. Have a great time!</p>
          </div>
        `
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Brevo API Error:", errorData);
      return NextResponse.json({ error: 'Brevo API Error', details: errorData }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error("Email Error:", error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
