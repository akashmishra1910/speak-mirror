import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  let userId: string | null = null;
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const token = cookieHeader
      .split("; ")
      .find(c => c.trim().startsWith("sb-access-token="))
      ?.split("=")[1];
      
    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) userId = user.id;
    }
  } catch (e) {
    // Ignore auth error during logging
  }

  try {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get('file');
    const download = searchParams.get('download');

    if (!file) {
      try {
        await supabaseAdmin.from('api_usage_logs').insert({
          route: '/api/video',
          user_id: userId,
          status: 'error'
        });
      } catch (logErr) {
        console.error("Failed to log API error:", logErr);
      }
      return NextResponse.json({ error: "Missing file parameter" }, { status: 400 });
    }

    // Generate a very short-lived signed URL (15 seconds)
    const options = download ? { download: download === 'true' ? true : download } : undefined;
    const { data } = await supabaseAdmin.storage.from('videos').createSignedUrl(file, 15, options);
    
    if (!data?.signedUrl) {
      return NextResponse.json({ error: "Failed to generate access to video" }, { status: 500 });
    }

    // If download is requested, redirect directly to the signed URL to trigger native download
    if (download) {
      try {
        await supabaseAdmin.from('api_usage_logs').insert({
          route: '/api/video',
          user_id: userId,
          status: 'success'
        });
      } catch (logErr) {
        console.error("Failed to log API success:", logErr);
      }
      return NextResponse.redirect(data.signedUrl, 307);
    }

    // Proxy the video stream directly from Supabase so the client never sees the Supabase URL
    const response = await fetch(data.signedUrl);
    
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch video stream" }, { status: response.status });
    }

    // Return the stream with appropriate headers
    try {
      await supabaseAdmin.from('api_usage_logs').insert({
        route: '/api/video',
        user_id: userId,
        status: 'success'
      });
    } catch (logErr) {
      console.error("Failed to log API success:", logErr);
    }

    return new NextResponse(response.body, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'video/webm',
        'Cache-Control': 'private, max-age=3600',
      }
    });

  } catch (err: any) {
    console.error('Video Proxy Error:', err);
    try {
      await supabaseAdmin.from('api_usage_logs').insert({
        route: '/api/video',
        user_id: userId,
        status: 'error'
      });
    } catch (logErr) {
      console.error("Failed to log API error:", logErr);
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
