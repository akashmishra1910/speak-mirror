-- Alter profiles table to add daily prompt cache columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS daily_prompt text,
ADD COLUMN IF NOT EXISTS daily_prompt_generated_at timestamptz;

-- Create streaks table
CREATE TABLE IF NOT EXISTS public.streaks (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak integer NOT NULL DEFAULT 0,
    longest_streak integer NOT NULL DEFAULT 0,
    last_active_date date,
    freeze_available boolean NOT NULL DEFAULT true
);

-- Enable Row Level Security (RLS) on streaks table
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for streaks table
CREATE POLICY "Allow users to view their own streak" ON public.streaks
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow users to modify their own streak" ON public.streaks
    FOR ALL TO authenticated USING (auth.uid() = user_id);
