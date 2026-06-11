-- Create high-performance lookup indexes for query optimization on foreign keys
CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON public.room_members (room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON public.room_members (user_id);
CREATE INDEX IF NOT EXISTS idx_room_tasks_room_id ON public.room_tasks (room_id);
CREATE INDEX IF NOT EXISTS idx_recordings_room_id ON public.recordings (room_id);
CREATE INDEX IF NOT EXISTS idx_recordings_room_created_desc ON public.recordings (room_id, created_at DESC);
