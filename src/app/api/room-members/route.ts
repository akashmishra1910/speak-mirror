import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { z } from 'zod';

const RequestSchema = z.object({
  roomId: z.string().uuid("Invalid roomId format"),
});

export async function GET(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const { searchParams } = new URL(request.url);
    const parsedParams = RequestSchema.safeParse({
      roomId: searchParams.get('roomId'),
    });

    if (!parsedParams.success) {
      return errorResponse(parsedParams.error.issues[0].message, 400);
    }

    const { roomId } = parsedParams.data;

    // 1. Authenticate requesting user
    let user;
    try {
      user = await requireAuth(request);
    } catch (authErr: any) {
      return errorResponse(authErr.message || "Unauthorized", 401);
    }

    // 2. Fetch room details to check if it's organization-scoped
    const { data: roomData, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('organization_id')
      .eq('id', roomId)
      .single();

    if (roomError || !roomData) {
      return errorResponse("Room not found", 404);
    }

    let members: { user_id: string; joined_at: string }[] = [];

    if (roomData.organization_id) {
      // Fetch members from organization_users mapping table
      const { data: orgUsers, error: orgUsersError } = await supabaseAdmin
        .from('organization_users')
        .select('user_id, created_at')
        .eq('organization_id', roomData.organization_id);

      if (orgUsersError || !orgUsers) {
        return errorResponse("Failed to fetch organization members", 500);
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
        return errorResponse("Failed to fetch room members", 500);
      }

      members = dbMembers;
    }

    // 3. Authorization check: Is the authenticated user a member of this room/org?
    const isMember = members.some(m => m.user_id === user.id);
    if (!isMember) {
      return errorResponse("Forbidden: You are not a member of this room", 403);
    }

    if (members.length === 0) {
      return successResponse({ members: [] });
    }

    const memberIds = members.map(m => m.user_id);

    // 4. Fetch emails/names for members from auth.users (requires service_role)
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError || !authUsers) {
       console.error("Failed to list users:", authError);
       return errorResponse("Failed to fetch user details", 500);
    }

    // 5. Map auth data to the room_members data
    const enrichedMembers = members.map(m => {
      const authUser = authUsers.users.find(u => u.id === m.user_id);
      return {
        user_id: m.user_id,
        joined_at: m.joined_at,
        email: authUser?.email || "Unknown Email",
        full_name: authUser?.user_metadata?.full_name || "Anonymous Member"
      };
    });

    return successResponse({ members: enrichedMembers });

  } catch (err: any) {
    console.error('API Error:', err);
    return errorResponse(err.message || "Internal Server Error", 500);
  }
}
