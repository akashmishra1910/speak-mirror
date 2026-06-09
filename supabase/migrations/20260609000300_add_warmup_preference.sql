-- Alter profiles table to add show_warmup preference
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS show_warmup boolean NOT NULL DEFAULT true;
