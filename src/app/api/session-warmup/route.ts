import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });

export async function POST(request: Request) {
  let user;
  try {
    user = await requireAuth(request);
  } catch (authErr: any) {
    return new Response(authErr.message || "Unauthorized", { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const { focusMetric, goal, experienceLevel, streak, taskTopic, mode } = body;

    const metricKey = focusMetric?.toLowerCase() || "confidence";

    // 1. Fetch last session score for that metric
    const { data: lastRecs } = await supabase
      .from("recordings")
      .select("confidence, clarity, wpm, filler_words, eye_contact, created_at, recording_type")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    let lastScore = 75;
    if (lastRecs && lastRecs.length > 0) {
      const fieldMap: Record<string, keyof typeof lastRecs[0]> = {
        confidence: "confidence",
        clarity: "clarity",
        pacing: "wpm",
        fillers: "filler_words",
        eye_contact: "eye_contact"
      };
      const key = fieldMap[metricKey] || "confidence";
      lastScore = Number(lastRecs[0][key]) || 75;
    }

    // 2. Call Groq for dynamic Focus Tip (B1)
    let focusTip = "Keep your head high and remember to maintain a steady pacing.";
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "dummy") {
      try {
        const systemPrompt = "You are an expert executive speaking coach. Generate exactly one motivational focus tip (max 15 words).";
        const userPrompt = `Write one motivational focus tip (max 15 words) for a speaker practicing '${metricKey}'. Their last score was ${lastScore}%. Stated Goal: ${goal}, Level: ${experienceLevel}. Focus on immediate speaking technique. Return ONLY the tip text, no quotes.`;
        
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          model: "llama-3.1-8b-instant",
          temperature: 0.7,
          max_tokens: 50
        });
        const resText = chatCompletion.choices[0]?.message?.content?.trim();
        if (resText) {
          focusTip = resText.replace(/^["']|["']$/g, "");
        }
      } catch (err) {
        console.error("Error generating warmup focus tip via Groq:", err);
      }
    }

    // 3. Find last session score for the same task category to create AI Insight (B2)
    const targetType = mode === "reading" ? "reading" : (mode === "warmup" ? "warmup" : "freeform");
    
    const { data: categoryRec } = await supabase
      .from("recordings")
      .select("confidence, clarity, wpm, filler_words, eye_contact, created_at")
      .eq("user_id", user.id)
      .eq("recording_type", targetType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let aiInsight = null;
    if (categoryRec) {
      let catScore = 70;
      if (metricKey === "confidence") catScore = categoryRec.confidence || 70;
      else if (metricKey === "clarity") catScore = categoryRec.clarity || 70;
      else if (metricKey === "eye_contact") catScore = categoryRec.eye_contact || 70;
      else if (metricKey === "pacing") {
        const wpm = categoryRec.wpm || 140;
        catScore = Math.round(100 - Math.min(100, Math.abs(wpm - 140) * 1.5));
      } else if (metricKey === "fillers") {
        const fillers = categoryRec.filler_words || 2;
        catScore = Math.round(Math.max(0, 100 - fillers * 15));
      }
      
      const targetScore = Math.min(95, catScore + 8);
      const displayNameMap: Record<string, string> = {
        confidence: "confidence",
        clarity: "clarity",
        pacing: "pacing score",
        fillers: "filler word score",
        eye_contact: "eye contact"
      };
      const dispName = displayNameMap[metricKey] || "performance";
      aiInsight = `Last time you attempted this type of task, your ${dispName} was ${catScore}% — aim for ${targetScore}% today.`;
    }

    // 4. Dynamic Difficulty Assignment (B3)
    let assignedDifficulty = "Medium";
    let explanation = "Medium — based on your recent scores";
    
    if (lastRecs && lastRecs.length > 0) {
      const last3 = lastRecs.slice(0, 3);
      let overallSum = 0;
      last3.forEach(r => {
        const conf = r.confidence || 70;
        const clar = r.clarity || 70;
        const eye = r.eye_contact || 70;
        overallSum += (conf + clar + eye) / 3;
      });
      const overallAvg = overallSum / last3.length;
      
      const effectiveScore = overallAvg + (Number(streak || 0) * 1.5);
      
      if (effectiveScore < 60) {
        assignedDifficulty = "Easy";
        explanation = "Easy — based on your recent scores";
      } else if (effectiveScore > 80) {
        assignedDifficulty = "Advanced";
        explanation = "Hard — based on your recent scores and streak";
      } else {
        assignedDifficulty = "Intermediate";
        explanation = "Medium — based on your recent scores";
      }
    }

    return new Response(
      JSON.stringify({
        focusTip,
        aiInsight,
        assignedDifficulty,
        explanation
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Warmup API Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to load session warmup data" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
