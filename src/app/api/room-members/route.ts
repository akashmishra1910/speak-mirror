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

    // 1. Get all members of the room
    const { data: members, error: membersError } = await supabaseAdmin
      .from('room_members')
      .select('user_id, joined_at')
      .eq('room_id', roomId);

    if (membersError || !members) {
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    if (members.length === 0) {
      return NextResponse.json({ members: [] });
    }

    const memberIds = members.map(m => m.user_id);

    // 2. Fetch emails/names for members from auth.users (requires service_role)
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError || !authUsers) {
       console.error("Failed to list users:", authError);
       return NextResponse.json({ error: "Failed to fetch user details" }, { status: 500 });
    }

    // 3. Map auth data to the room_members data
    const enrichedMembers = members.map(m => {
      const authUser = authUsers.users.find(u => u.id === m.user_id);
      return {
        user_id: m.user_id,
        joined_at: m.joined_at,
        email: authUser?.email || "Unknown Email",
        full_name: authUser?.user_metadata?.full_name || "Anonymous Member"
      };
    });

    return NextResponse.json({ members: enrichedMembers });

  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
