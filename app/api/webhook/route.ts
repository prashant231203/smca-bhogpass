import { NextResponse } from "next/server";

// Meta Webhooks require verification using a GET request
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    // The verify token we expect, configured in our environment
    // Fallback to "bhogpass_secret" if not explicitly defined in .env
    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "bhogpass_secret";

    if (mode && token) {
      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("[Meta Webhook] Successfully verified!");
        // Meta expects the challenge string returned as pure text
        return new Response(challenge, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      } else {
        console.warn("[Meta Webhook] Verification failed: Tokens do not match");
        return new Response("Forbidden", { status: 403 });
      }
    }

    return new Response("Bad Request", { status: 400 });
  } catch (error) {
    console.error("[Meta Webhook] GET Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// Meta sends events (delivery receipts, status updates, new messages) via POST request
export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("[Meta Webhook] Received Event:", JSON.stringify(body, null, 2));

    // Handle specific WhatsApp webhook events here if needed in the future
    // e.g. checking status: sent, delivered, read
    if (body.object) {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value.messages
      ) {
        const message = body.entry[0].changes[0].value.messages[0];
        const from = message.from;
        const text = message.text ? message.text.body : "";
        console.log(`[Meta Webhook] Message from ${from}: ${text}`);
      }
    }

    // Always respond with a 200 OK to acknowledge receipt of the event
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[Meta Webhook] POST Error:", error);
    // Even if it fails internally, returning a 200 prevents Meta from retrying excessively
    return NextResponse.json({ error: "Internal processing error" }, { status: 200 });
  }
}
