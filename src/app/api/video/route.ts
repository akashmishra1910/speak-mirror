import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get('file');

    if (!file) {
      return NextResponse.json({ error: "Missing file parameter" }, { status: 400 });
    }

    // Generate a very short-lived signed URL (15 seconds)
    const { data } = await supabaseAdmin.storage.from('videos').createSignedUrl(file, 15);
    
    if (!data?.signedUrl) {
      return NextResponse.json({ error: "Failed to generate access to video" }, { status: 500 });
    }

    // Proxy the video stream directly from Supabase so the client never sees the Supabase URL
    const response = await fetch(data.signedUrl);
    
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch video stream" }, { status: response.status });
    }

    // Return the stream with appropriate headers
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'video/webm',
        'Cache-Control': 'private, max-age=3600',
      }
    });

  } catch (err: any) {
    console.error('Video Proxy Error:', err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
