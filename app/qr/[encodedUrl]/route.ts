import { NextResponse } from 'next/server';

export async function GET(request: Request, context: any) {
  // We use context: any or await context.params to handle Next.js 15 route params correctly
  const params = await context.params;
  let { encodedUrl } = params;
  
  if (!encodedUrl) {
    return new NextResponse("Missing URL", { status: 400 });
  }

  // Remove .png extension
  encodedUrl = encodedUrl.replace(/\.png$/, '');
  
  try {
    // Decode from base64url format
    const decodedUrl = Buffer.from(encodedUrl, 'base64url').toString('utf-8');
    
    // Redirect to the QR generator
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=png&data=${encodeURIComponent(decodedUrl)}`;
    return NextResponse.redirect(qrUrl);
  } catch (error) {
    console.error("QR Decode Error:", error);
    return new NextResponse("Invalid Base64 URL", { status: 400 });
  }
}
