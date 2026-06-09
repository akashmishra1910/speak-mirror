-- Alter recordings table to add real-time transcription and pacing fields
ALTER TABLE public.recordings
ADD COLUMN IF NOT EXISTS filler_log jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS avg_wpm integer,
ADD COLUMN IF NOT EXISTS pacing_log jsonb DEFAULT '[]'::jsonb;

-- Alter profiles table to cache dynamic daily prompts and AI weak area tips
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS weak_area_tip text,
ADD COLUMN IF NOT EXISTS daily_prompt text,
ADD COLUMN IF NOT EXISTS daily_prompt_generated_at timestamptz;

-- Create high-performance indexes for home feed queries and statistics
CREATE INDEX IF NOT EXISTS idx_recordings_user_created_desc
ON public.recordings (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recordings_user_task
ON public.recordings (user_id, task_id);

CREATE INDEX IF NOT EXISTS idx_recordings_user_recording_type
ON public.recordings (user_id, recording_type);
