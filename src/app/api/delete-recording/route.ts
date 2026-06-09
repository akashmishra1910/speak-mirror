import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { z } from 'zod';

const RequestSchema = z.object({
  recordingId: z.string().uuid("Invalid recordingId format"),
  roomId: z.string().uuid("Invalid roomId format"),
});

export async function DELETE(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const { searchParams } = new URL(request.url);
    const parsedParams = RequestSchema.safeParse({
      recordingId: searchParams.get('recordingId'),
      roomId: searchParams.get('roomId'),
    });

    if (!parsedParams.success) {
      return errorResponse(parsedParams.error.issues[0].message, 400);
    }

    const { recordingId, roomId } = parsedParams.data;

    // 1. Authenticate user securely
    let user;
    try {
      user = await requireAuth(request);
    } catch (authErr: any) {
      return errorResponse(authErr.message || "Unauthorized", 401);
    }

    // 2. Verify that the user is the host of the room
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('created_by')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return errorResponse("Room not found", 404);
    }

    if (room.created_by !== user.id) {
      return errorResponse("Forbidden: Only the room host can delete submissions", 403);
    }

    // 3. Delete the recording
    const { error: deleteError } = await supabaseAdmin
      .from('recordings')
      .delete()
      .eq('id', recordingId);

    if (deleteError) {
      return errorResponse("Failed to delete recording", 500);
    }

    return successResponse({ message: "Recording deleted securely" });

  } catch (err: any) {
    console.error('API Error:', err);
    return errorResponse(err.message || "Internal Server Error", 500);
  }
}
