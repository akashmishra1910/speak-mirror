import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { errorResponse } from '@/lib/api-response';

export async function GET(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get('file');
    const download = searchParams.get('download');

    if (!file) {

      return errorResponse("Missing file parameter", 400);
    }

    // Generate a very short-lived signed URL (15 seconds)
    const options = download ? { download: download === 'true' ? true : download } : undefined;
    const { data } = await supabaseAdmin.storage.from('videos').createSignedUrl(file, 15, options);
    
    if (!data?.signedUrl) {
      return errorResponse("Failed to generate access to video", 500);
    }

    // If download is requested, redirect directly to the signed URL to trigger native download
    if (download) {

      return NextResponse.redirect(data.signedUrl, 307);
    }

    // Proxy the video stream directly from Supabase so the client never sees the Supabase URL
    const response = await fetch(data.signedUrl);
    
    if (!response.ok) {
      return errorResponse("Failed to fetch video stream", response.status);
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

    return errorResponse("Internal Server Error", 500);
  }
}
