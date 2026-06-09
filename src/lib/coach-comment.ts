import { getSupabaseAdmin } from "./supabase/admin";

interface TelemetryMetrics {
  confidence: number;
  clarity: number;
  wpm: number;
  filler_words: number;
  eye_contact: number;
}

export async function getPreviousSessionMetrics(userId: string): Promise<TelemetryMetrics | null> {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const { data, error } = await supabaseAdmin
      .from("recordings")
      .select("confidence, clarity, wpm, filler_words, eye_contact")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    
    const rec = data[0];
    return {
      confidence: rec.confidence || 0,
      clarity: rec.clarity || 0,
      wpm: rec.wpm || 0,
      filler_words: rec.filler_words || 0,
      eye_contact: rec.eye_contact || 0
    };
  } catch (err) {
    console.error("Error fetching previous session metrics:", err);
    return null;
  }
}

export async function getPersonalBests(userId: string): Promise<TelemetryMetrics | null> {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const { data, error } = await supabaseAdmin
      .from("personal_bests")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      confidence: data.max_confidence || 0,
      clarity: data.max_clarity || 0,
      wpm: data.max_wpm || 0,
      filler_words: data.min_filler_words || 0,
      eye_contact: data.max_eye_contact || 0
    };
  } catch (err) {
    console.error("Error fetching personal bests:", err);
    return null;
  }
}

export function computeImprovement(current: TelemetryMetrics, reference: TelemetryMetrics | null): Record<string, number> {
  if (!reference) {
    return {
      confidence: 0,
      clarity: 0,
      pacing: 0,
      fillers: 0,
      eye_contact: 0
    };
  }

  return {
    confidence: current.confidence - reference.confidence,
    clarity: current.clarity - reference.clarity,
    pacing: current.wpm - reference.wpm,
    fillers: current.filler_words - reference.filler_words,
    eye_contact: current.eye_contact - reference.eye_contact
  };
}
