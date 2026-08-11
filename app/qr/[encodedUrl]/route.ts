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
    
    // Fetch the image from qrserver instead of redirecting
    // Meta does not follow redirects for media URLs
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=png&data=${encodeURIComponent(decodedUrl)}`;
    
    const imageResponse = await fetch(qrUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to fetch image");
    }
    
    const arrayBuffer = await imageResponse.arrayBuffer();
    
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable'
      },
    });
  } catch (error) {
    console.error("QR Decode/Fetch Error:", error);
    return new NextResponse("Invalid Request", { status: 400 });
  }
}
