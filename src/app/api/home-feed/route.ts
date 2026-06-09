import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  getUserGreetingData,
  getWeakAreaSpotlight,
  getDailyPrompt,
  getProgressSnapshot,
  getRecentSessions
} from "@/lib/homefeed";

export async function GET(request: Request) {
  let user;
  try {
    user = await requireAuth(request);
  } catch (authErr: any) {
    return new Response(
      JSON.stringify({ error: authErr.message || "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = getSupabaseAdmin();

  try {
    // 1. Fetch profile goal, level, practice_duration
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("goal, experience_level, practice_duration")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) throw profileErr;

    const goal = profile?.goal || "personal_growth";
    const level = profile?.experience_level || "intermediate";
    const practiceDuration = profile?.practice_duration || 3;

    // 2. Count total recordings to check empty state
    const { count: totalSessions, error: countErr } = await supabase
      .from("recordings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countErr) throw countErr;

    // 3. Parallel execute greeting, spotlight, snapshot, and recent sessions
    const [greeting, spotlight, progressSnapshot, recentSessions] = await Promise.all([
      getUserGreetingData(user.id),
      getWeakAreaSpotlight(user.id),
      getProgressSnapshot(user.id),
      getRecentSessions(user.id)
    ]);

    // 4. Generate/Fetch Daily Prompt
    const weakestMetric = spotlight?.metric || "confidence";
    const dailyPrompt = await getDailyPrompt(user.id, goal, level, weakestMetric);

    return new Response(
      JSON.stringify({
        greeting,
        spotlight,
        dailyPrompt,
        progressSnapshot,
        recentSessions,
        totalSessions: totalSessions || 0,
        goal,
        practiceDuration
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("API Home Feed Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to load home feed data" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
