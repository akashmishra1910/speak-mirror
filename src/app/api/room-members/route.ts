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

    // 1. Fetch room details to check if it's organization-scoped
    const { data: roomData, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('organization_id')
      .eq('id', roomId)
      .single();

    if (roomError || !roomData) {
      return NextResponse.json({ error: 'Failed to fetch room details' }, { status: 500 });
    }

    let members: { user_id: string; joined_at: string }[] = [];

    if (roomData.organization_id) {
      // Fetch members from organization_users mapping table instead
      const { data: orgUsers, error: orgUsersError } = await supabaseAdmin
        .from('organization_users')
        .select('user_id, created_at')
        .eq('organization_id', roomData.organization_id);

      if (orgUsersError || !orgUsers) {
        return NextResponse.json({ error: 'Failed to fetch organization members' }, { status: 500 });
      }

      members = orgUsers.map(ou => ({
        user_id: ou.user_id,
        joined_at: ou.created_at
      }));
    } else {
      // Fallback: Get all members of the room from room_members
      const { data: dbMembers, error: membersError } = await supabaseAdmin
        .from('room_members')
        .select('user_id, joined_at')
        .eq('room_id', roomId);

      if (membersError || !dbMembers) {
        return NextResponse.json({ error: 'Failed to fetch room members' }, { status: 500 });
      }

      members = dbMembers;
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
