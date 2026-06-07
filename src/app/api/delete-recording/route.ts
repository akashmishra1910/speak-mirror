import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function DELETE(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const { searchParams } = new URL(request.url);
    const recordingId = searchParams.get('recordingId');
    const roomId = searchParams.get('roomId');

    if (!recordingId || !roomId) {
      return NextResponse.json({ error: "Missing recordingId or roomId" }, { status: 400 });
    }

    // 1. Get the Authorization token from the header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');

    // 2. Verify the user using the token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
    }

    // 3. Verify that the user is the host of the room
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('created_by')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.created_by !== user.id) {
      return NextResponse.json({ error: "Forbidden: Only the room host can delete submissions" }, { status: 403 });
    }

    // 4. Delete the recording
    const { error: deleteError } = await supabaseAdmin
      .from('recordings')
      .delete()
      .eq('id', recordingId);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to delete recording" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Recording deleted securely" });

  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
