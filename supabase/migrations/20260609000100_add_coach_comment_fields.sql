-- Alter recordings table to add personalization fields
ALTER TABLE public.recordings
ADD COLUMN IF NOT EXISTS ai_coach_comment text,
ADD COLUMN IF NOT EXISTS improvement_vs_last jsonb,
ADD COLUMN IF NOT EXISTS improvement_vs_best jsonb;

-- Create personal bests view
CREATE OR REPLACE VIEW public.personal_bests AS
SELECT 
  user_id,
  MAX(confidence) as max_confidence,
  MAX(clarity) as max_clarity,
  MAX(eye_contact) as max_eye_contact,
  MAX(expression_score) as max_expression_score,
  MIN(filler_words) as min_filler_words,
  MAX(wpm) as max_wpm
FROM public.recordings
GROUP BY user_id;
