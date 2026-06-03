import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, amount, mode, trustAccount, purpose, receiptId, date } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY is not set. Email not sent.");
      return new Response(JSON.stringify({ error: "Email provider not configured" }), { status: 500 });
    }

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 25px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #4f46e5; text-align: center; margin-bottom: 20px;">Thank You for Your Support!</h2>
        <p style="font-size: 16px; color: #333;">Dear <strong>${name}</strong>,</p>
        <p style="font-size: 16px; color: #333; line-height: 1.5;">We have successfully received your generous contribution. Please find your receipt details below:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 25px; background-color: #f9fafb; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 12px 15px; border-bottom: 1px solid #eaeaea; color: #555;"><strong>Receipt ID</strong></td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #eaeaea; text-align: right; color: #111;">${receiptId}</td>
          </tr>
          <tr>
            <td style="padding: 12px 15px; border-bottom: 1px solid #eaeaea; color: #555;"><strong>Amount</strong></td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #eaeaea; text-align: right; color: #111; font-weight: bold;">₹${amount}</td>
          </tr>
          <tr>
            <td style="padding: 12px 15px; border-bottom: 1px solid #eaeaea; color: #555;"><strong>Purpose</strong></td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #eaeaea; text-align: right; color: #111;">${purpose}</td>
          </tr>
          <tr>
            <td style="padding: 12px 15px; border-bottom: 1px solid #eaeaea; color: #555;"><strong>Account</strong></td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #eaeaea; text-align: right; color: #111;">${trustAccount}</td>
          </tr>
          <tr>
            <td style="padding: 12px 15px; border-bottom: 1px solid #eaeaea; color: #555;"><strong>Mode</strong></td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #eaeaea; text-align: right; color: #111;">${mode}</td>
          </tr>
          <tr>
            <td style="padding: 12px 15px; color: #555;"><strong>Date</strong></td>
            <td style="padding: 12px 15px; text-align: right; color: #111;">${date}</td>
          </tr>
        </table>
        
        <p style="margin-top: 20px; font-size: 15px; color: #444; line-height: 1.5; text-align: center;">May the blessings of the Lord be always with you and your family.</p>
        <p style="margin-top: 15px; font-size: 15px; color: #444; text-align: center;">With gratitude,<br/><strong style="color: #4f46e5;">Team SMCA</strong></p>
      </div>
    `;

    // It's highly recommended to verify your domain (e.g. smcachennai.in) on Resend
    // and replace 'onboarding@resend.dev' with something like 'admin@smcachennai.in'
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'admin@smcachennai.in';

    const data = await resend.emails.send({
      from: `SMCA Desk <${fromEmail}>`,
      to: [email],
      subject: `Donation Receipt [${receiptId}] - SMCA`,
      html: htmlContent,
    });

    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error("Resend Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
