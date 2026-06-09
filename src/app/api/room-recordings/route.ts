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
    const parsed = RequestSchema.safeParse({
      roomId: searchParams.get('roomId'),
    });

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { roomId } = parsed.data;

    // 1. Authenticate user
    let user;
    try {
      user = await requireAuth(request);
    } catch (authErr: any) {
      return errorResponse(authErr.message || "Unauthorized", 401);
    }

    // 2. Fetch room details to check organization-scoped access
    const { data: roomData, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('organization_id')
      .eq('id', roomId)
      .single();

    if (roomError || !roomData) {
      return errorResponse("Room not found", 404);
    }

    // 3. Verify membership of the requesting user
    let isAuthorized = false;
    if (roomData.organization_id) {
      const { data: membership } = await supabaseAdmin
        .from('organization_users')
        .select('role')
        .eq('organization_id', roomData.organization_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (membership) isAuthorized = true;
    } else {
      const { data: member } = await supabaseAdmin
        .from('room_members')
        .select('joined_at')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (member) isAuthorized = true;
    }

    if (!isAuthorized) {
      return errorResponse("Forbidden: You are not authorized to access this room's recordings", 403);
    }

    // 4. Get recordings for the room
    const { data: recordings, error: recError } = await supabaseAdmin
      .from('recordings')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });

    if (recError || !recordings) {
      return errorResponse("Failed to fetch recordings", 500);
    }

    if (recordings.length === 0) {
      return successResponse({ recordings: [] });
    }

    // 5. Fetch names for these users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError || !authUsers) {
       console.error("Failed to list users:", authError);
       return successResponse({ recordings }); // Return without names if auth fails
    }

    // 6. Map auth data and set proxy URLs for the recordings
    const enrichedRecordings = recordings.map(rec => {
      const authUser = authUsers.users.find(u => u.id === rec.user_id);
      
      let videoUrl = rec.video_url;
      if (videoUrl) {
        const filename = videoUrl.startsWith('http') ? videoUrl.split('/').pop() : videoUrl;
        if (filename) {
          videoUrl = `/api/video?file=${filename}`;
        }
      }

      return {
        ...rec,
        video_url: videoUrl,
        user_name: authUser?.user_metadata?.full_name || "Team Member"
      };
    });

    return successResponse({ recordings: enrichedRecordings });

  } catch (err: any) {
    console.error('API Error:', err);
    return errorResponse(err.message || "Internal Server Error", 500);
  }
}
