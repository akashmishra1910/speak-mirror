import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getPreviousSessionMetrics, getPersonalBests, computeImprovement } from "@/lib/coach-comment";
import { updateWeakAreaFocusMetric } from "@/lib/homefeed";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });

export async function POST(request: Request) {
  let user;
  try {
    user = await requireAuth(request);
  } catch (authErr: any) {
    return new Response(authErr.message || "Unauthorized", { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  
  try {
    const body = await request.json();
    const { recordingId, confidence, clarity, pacing, fillers, eyeContact } = body;

    // Fetch user profile preferences
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("goal, experience_level, focus_metric")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) throw profileErr;

    const goal = profile?.goal || "personal_growth";
    const experienceLevel = profile?.experience_level || "intermediate";
    const focusMetric = profile?.focus_metric || "confidence";

    // Fetch historical metrics for delta calculation and prompt context
    const prevMetrics = await getPreviousSessionMetrics(user.id);
    const bestMetrics = await getPersonalBests(user.id);

    const currentMetrics = {
      confidence: confidence || 0,
      clarity: clarity || 0,
      wpm: pacing || 0,
      filler_words: fillers || 0,
      eye_contact: eyeContact !== undefined && eyeContact !== null ? eyeContact : 0
    };

    const improvementVsLast = computeImprovement(currentMetrics, prevMetrics);
    const improvementVsBest = computeImprovement(currentMetrics, bestMetrics);

    // Build the coach prompt with historical comparison if available
    const systemPrompt = `You are an expert human speech and communication coach.
Your task is to write exactly one personalized coaching sentence (maximum 25 words) for a speaker based on their current session scores.
BE SPECIFIC to the scores provided.
Reference their primary focus metric: "${focusMetric}" by name.
Acknowledge what went well before suggesting a specific, actionable area for improvement.
Use a warm, constructive, human tone. Never use generic filler phrases like "great job" or "keep it up".
Keep the response under 25 words. Return ONLY the plain text coach comment. No quotes, no markdown, no JSON wrapper.`;

    const userPrompt = `Speaker Profile:
- Goal: ${goal}
- Experience level: ${experienceLevel}
- Target focus metric: ${focusMetric}

Current Session Telemetry:
- Confidence Score: ${confidence}%
- Clarity Score: ${clarity}%
- Pacing Rate: ${pacing} WPM
- Filler Words Count: ${fillers}
- Eye Contact Quality: ${eyeContact}%

Previous Session Telemetry:
${prevMetrics ? `- Confidence Score: ${prevMetrics.confidence}%
- Clarity Score: ${prevMetrics.clarity}%
- Pacing Rate: ${prevMetrics.wpm} WPM
- Filler Words Count: ${prevMetrics.filler_words}
- Eye Contact Quality: ${prevMetrics.eye_contact}%` : "No previous session data available."}`;

    let comment = "";
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "dummy") {
      comment = "Your clarity was strong, but let's boost your eye contact — try looking directly at the lens more often.";
    } else {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.7,
        max_tokens: 60
      });
      comment = chatCompletion.choices[0]?.message?.content?.trim() || "";
    }

    let finalFocusMetric = focusMetric;

    // Save coach comment and deltas to the recordings table if recordingId is provided
    if (recordingId) {
      const { error: updateErr } = await supabaseAdmin
        .from("recordings")
        .update({
          ai_coach_comment: comment,
          coach_comment: comment, // fallback for legacy code
          improvement_vs_last: improvementVsLast,
          improvement_vs_best: improvementVsBest
        })
        .eq("id", recordingId);

      if (updateErr) {
        console.error("Error updating recording with coach comment:", updateErr);
      }

      // Recompute weak area and update focus metric automatically
      try {
        const computedFocusMetric = await updateWeakAreaFocusMetric(user.id);
        if (computedFocusMetric) {
          finalFocusMetric = computedFocusMetric;
        }
      } catch (weakAreaErr) {
        console.error("Error recomputing weak area focus metric:", weakAreaErr);
      }
    }

    return new Response(
      JSON.stringify({
        ai_coach_comment: comment,
        improvement_vs_last: improvementVsLast,
        improvement_vs_best: improvementVsBest,
        focus_metric: finalFocusMetric
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("AI Coach Comment API Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to generate AI coach comment" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
