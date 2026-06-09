-- Alter profiles table to add personalization fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS goal text CHECK (goal IN ('interview_prep', 'public_speaking', 'team_presentations', 'personal_growth')),
ADD COLUMN IF NOT EXISTS experience_level text CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
ADD COLUMN IF NOT EXISTS focus_metric text CHECK (focus_metric IN ('confidence', 'clarity', 'pacing', 'fillers', 'eye_contact')),
ADD COLUMN IF NOT EXISTS practice_duration integer CHECK (practice_duration IN (1, 3, 5)),
ADD COLUMN IF NOT EXISTS reminder_time time,
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
