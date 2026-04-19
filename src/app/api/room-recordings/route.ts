import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS and access auth.users
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
    }

    // 1. Get recordings for the room
    const { data: recordings, error: recError } = await supabaseAdmin
      .from('recordings')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });

    if (recError || !recordings) {
      return NextResponse.json({ error: 'Failed to fetch recordings' }, { status: 500 });
    }

    if (recordings.length === 0) {
      return NextResponse.json({ recordings: [] });
    }

    const userIds = [...new Set(recordings.map(r => r.user_id).filter(Boolean))];

    // 2. Fetch names for these users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError || !authUsers) {
       console.error("Failed to list users:", authError);
       return NextResponse.json({ recordings }); // Return without names if auth fails
    }

    // 3. Map auth data to the recordings
    const enrichedRecordings = recordings.map(rec => {
      const authUser = authUsers.users.find(u => u.id === rec.user_id);
      return {
        ...rec,
        user_name: authUser?.user_metadata?.full_name || "Team Member"
      };
    });

    return NextResponse.json({ recordings: enrichedRecordings });

  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
