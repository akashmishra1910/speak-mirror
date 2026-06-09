import { getSupabaseAdmin } from "./supabase/admin";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });

export interface GreetingData {
  firstName: string;
  currentStreak: number;
  lastActiveDate: string | null;
  greetingText: string;
  subtitleText: string;
}

export interface WeakAreaSpotlight {
  metric: "confidence" | "clarity" | "pacing" | "fillers" | "eye_contact";
  displayName: string;
  averageScore: number;
  tip: string;
}

export interface ProgressMetricData {
  metric: string;
  displayName: string;
  averageScore: number;
  trend: number[];
  isTrendingUp: boolean;
}

export interface RecentSessionData {
  id: string;
  date: string;
  overallScore: number;
  topMetric: string;
  worstMetric: string;
  duration: number; // in seconds
}

export interface HomeFeedData {
  greeting: GreetingData;
  spotlight: WeakAreaSpotlight | null;
  dailyPrompt: string;
  progressSnapshot: ProgressMetricData[] | null;
  recentSessions: RecentSessionData[];
  totalSessions: number;
  goal: string;
  practiceDuration: number;
}

export async function getUserGreetingData(userId: string): Promise<GreetingData> {
  const supabase = getSupabaseAdmin();
  
  // 1. Fetch Profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  const fullName = profile?.full_name || "Speaker";
  const firstName = fullName.split(" ")[0] || fullName;

  // 2. Fetch Streak
  const { data: streak } = await supabase
    .from("streaks")
    .select("current_streak, last_active_date")
    .eq("user_id", userId)
    .maybeSingle();

  const currentStreak = streak?.current_streak || 0;
  const lastActiveDate = streak?.last_active_date || null;

  // 3. Compute Time-of-Day Greeting
  const hour = new Date().getHours();
  let greetingText = "Good evening";
  if (hour < 12) greetingText = "Good morning";
  else if (hour < 18) greetingText = "Good afternoon";

  // 4. Compute Subtitle based on streak status
  let subtitleText = "Welcome to SpeakMirror. Let's get started.";
  if (lastActiveDate) {
    const todayStr = new Date().toDateString();
    const activeDateStr = new Date(lastActiveDate).toDateString();
    
    if (activeDateStr === todayStr) {
      subtitleText = `You're on a 🔥 ${currentStreak}-day streak. Keep it going!`;
    } else {
      subtitleText = "You haven't practiced today yet.";
    }
  }

  return {
    firstName,
    currentStreak,
    lastActiveDate,
    greetingText,
    subtitleText
  };
}

export async function getWeakAreaSpotlight(userId: string): Promise<WeakAreaSpotlight | null> {
  const supabase = getSupabaseAdmin();
  
  // Fetch user profile to get focus_metric preference
  const { data: profile } = await supabase
    .from("profiles")
    .select("focus_metric, weak_area_tip")
    .eq("id", userId)
    .maybeSingle();

  const focusMetricPref = profile?.focus_metric;
  const dbTip = profile?.weak_area_tip;

  // Fetch last 5 sessions
  const { data: recordings } = await supabase
    .from("recordings")
    .select("confidence, clarity, wpm, filler_words, eye_contact")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!recordings || recordings.length === 0) {
    return null;
  }

  // Calculate Averages
  const len = recordings.length;
  let sumConfidence = 0;
  let sumClarity = 0;
  let sumWpm = 0;
  let sumFillers = 0;
  let sumEyeContact = 0;
  let eyeContactCount = 0;

  recordings.forEach(r => {
    sumConfidence += r.confidence || 0;
    sumClarity += r.clarity || 0;
    sumWpm += r.wpm || 0;
    sumFillers += r.filler_words || 0;
    if (r.eye_contact !== null && r.eye_contact !== undefined) {
      sumEyeContact += r.eye_contact;
      eyeContactCount++;
    }
  });

  const avgConfidence = sumConfidence / len;
  const avgClarity = sumClarity / len;
  const avgWpm = sumWpm / len;
  const avgFillers = sumFillers / len;
  const avgEyeContact = eyeContactCount > 0 ? sumEyeContact / eyeContactCount : 75;

  // Map to normalized scores (0-100, where 100 is optimal)
  const normScores = {
    confidence: avgConfidence,
    clarity: avgClarity,
    pacing: 100 - Math.min(100, Math.abs(avgWpm - 140) * 1.5),
    fillers: Math.max(0, 100 - avgFillers * 15),
    eye_contact: avgEyeContact
  };

  const displayNames = {
    confidence: "Confidence",
    clarity: "Clarity",
    pacing: "Pacing",
    fillers: "Filler Words",
    eye_contact: "Eye Contact"
  };

  const tips = {
    confidence: "Start strong — your first 10 seconds set the tone",
    clarity: "Shorter sentences land harder than long ones",
    pacing: "Speak slower than feels natural — it sounds better",
    fillers: "Try pausing instead of saying um or uh",
    eye_contact: "Look directly at the camera, not the screen"
  };

  const averagesMap = {
    confidence: avgConfidence,
    clarity: avgClarity,
    pacing: avgWpm,
    fillers: avgFillers,
    eye_contact: avgEyeContact
  };

  // Determine weakest metric
  let weakestMetric: keyof typeof normScores = "confidence";
  
  if (focusMetricPref && normScores[focusMetricPref as keyof typeof normScores] !== undefined) {
    weakestMetric = focusMetricPref as keyof typeof normScores;
  } else {
    // Find lowest normalized score
    let minScore = 999;
    (Object.keys(normScores) as Array<keyof typeof normScores>).forEach(m => {
      if (normScores[m] < minScore) {
        minScore = normScores[m];
        weakestMetric = m;
      }
    });
  }

  return {
    metric: weakestMetric,
    displayName: displayNames[weakestMetric],
    averageScore: Math.round(averagesMap[weakestMetric]),
    tip: weakestMetric === focusMetricPref && dbTip ? dbTip : tips[weakestMetric]
  };
}

export async function updateWeakAreaFocusMetric(userId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  
  // 1. Fetch last 5 recordings
  const { data: recordings } = await supabase
    .from("recordings")
    .select("confidence, clarity, wpm, filler_words, eye_contact")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!recordings || recordings.length === 0) return null;

  const len = recordings.length;
  let sumConfidence = 0, sumClarity = 0, sumWpm = 0, sumFillers = 0, sumEyeContact = 0, eyeContactCount = 0;
  recordings.forEach(r => {
    sumConfidence += r.confidence || 0;
    sumClarity += r.clarity || 0;
    sumWpm += r.wpm || 0;
    sumFillers += r.filler_words || 0;
    if (r.eye_contact !== null && r.eye_contact !== undefined) {
      sumEyeContact += r.eye_contact;
      eyeContactCount++;
    }
  });

  const avgConfidence = sumConfidence / len;
  const avgClarity = sumClarity / len;
  const avgWpm = sumWpm / len;
  const avgFillers = sumFillers / len;
  const avgEyeContact = eyeContactCount > 0 ? sumEyeContact / eyeContactCount : 75;

  const normScores = {
    confidence: avgConfidence,
    clarity: avgClarity,
    pacing: 100 - Math.min(100, Math.abs(avgWpm - 140) * 1.5),
    fillers: Math.max(0, 100 - avgFillers * 15),
    eye_contact: avgEyeContact
  };

  // Find lowest normalized score
  let weakestMetric: keyof typeof normScores = "confidence";
  let minScore = 999;
  (Object.keys(normScores) as Array<keyof typeof normScores>).forEach(m => {
    if (normScores[m] < minScore) {
      minScore = normScores[m];
      weakestMetric = m;
    }
  });

  // 2. Fetch current profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("focus_metric, experience_level")
    .eq("id", userId)
    .maybeSingle();

  if (profile && profile.focus_metric !== weakestMetric) {
    let newTip = null;
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "dummy") {
      try {
        const level = profile.experience_level || "intermediate";
        const roundedAvg = Math.round(normScores[weakestMetric]);
        const systemPrompt = "You are an expert executive speaking coach. Generate exactly one actionable advice sentence.";
        const userPrompt = `The user is an ${level} speaker whose current weakest area is ${weakestMetric}, with a recent average score of ${roundedAvg}%. Write exactly one actionable, highly specific, and motivational advice sentence (max 20 words) that targets how they can improve this specific score level. Do not mention the percentage number.`;
        
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          model: "llama-3.1-8b-instant",
          temperature: 0.7,
          max_tokens: 60
        });
        const responseText = chatCompletion.choices[0]?.message?.content?.trim();
        if (responseText) {
          newTip = responseText.replace(/^["']|["']$/g, "");
        }
      } catch (err) {
        console.error("Error generating weak area tip:", err);
      }
    }

    // Save update to profile
    await supabase
      .from("profiles")
      .update({
        focus_metric: weakestMetric,
        weak_area_tip: newTip || undefined
      })
      .eq("id", userId);
  }

  return weakestMetric;
}

export async function getDailyPrompt(
  userId: string,
  goal: string,
  level: string,
  weakestMetric: string
): Promise<string> {
  const supabase = getSupabaseAdmin();

  // 1. Fetch profile prompt cache
  const { data: profile } = await supabase
    .from("profiles")
    .select("daily_prompt, daily_prompt_generated_at")
    .eq("id", userId)
    .maybeSingle();

  const todayStr = new Date().toDateString();
  
  if (
    profile?.daily_prompt &&
    profile.daily_prompt_generated_at &&
    new Date(profile.daily_prompt_generated_at).toDateString() === todayStr
  ) {
    return profile.daily_prompt;
  }

  // 2. Fetch last 5 sessions to find 3 weakest metrics
  const { data: recordings } = await supabase
    .from("recordings")
    .select("confidence, clarity, wpm, filler_words, eye_contact")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  let sortedMetrics: string[] = [];
  if (recordings && recordings.length > 0) {
    const len = recordings.length;
    let sumConfidence = 0, sumClarity = 0, sumWpm = 0, sumFillers = 0, sumEyeContact = 0, eyeContactCount = 0;
    recordings.forEach(r => {
      sumConfidence += r.confidence || 0;
      sumClarity += r.clarity || 0;
      sumWpm += r.wpm || 0;
      sumFillers += r.filler_words || 0;
      if (r.eye_contact !== null && r.eye_contact !== undefined) {
        sumEyeContact += r.eye_contact;
        eyeContactCount++;
      }
    });
    const avgConfidence = sumConfidence / len;
    const avgClarity = sumClarity / len;
    const avgWpm = sumWpm / len;
    const avgFillers = sumFillers / len;
    const avgEyeContact = eyeContactCount > 0 ? sumEyeContact / eyeContactCount : 75;

    const normScores = {
      confidence: avgConfidence,
      clarity: avgClarity,
      pacing: 100 - Math.min(100, Math.abs(avgWpm - 140) * 1.5),
      fillers: Math.max(0, 100 - avgFillers * 15),
      eye_contact: avgEyeContact
    };

    sortedMetrics = (Object.keys(normScores) as Array<keyof typeof normScores>)
      .sort((a, b) => normScores[a] - normScores[b])
      .slice(0, 3);
  } else {
    sortedMetrics = ["confidence", "clarity", "pacing"];
  }

  // 3. Generate difficulty based on Day of Week
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDay = days[new Date().getDay()];
  const difficultyLabel = currentDay === "Monday" ? "easy" : (currentDay === "Friday" ? "hard" : "medium");

  // 4. Generate Prompt - Fallback default
  let defaultPrompt = "Introduce yourself and talk about your main goals for the upcoming year.";
  if (goal === "interview_prep") {
    defaultPrompt = "Describe a time you overcame a major professional challenge under tight deadlines.";
  } else if (goal === "public_speaking") {
    defaultPrompt = "Deliver a 1-minute pitch on why remote work is the future of productivity.";
  } else if (goal === "team_presentations") {
    defaultPrompt = "Explain a complex technical concept to a non-technical stakeholder.";
  } else if (goal === "personal_growth") {
    defaultPrompt = "Tell a story about a hobby or passion that taught you an unexpected life lesson.";
  }

  let prompt = defaultPrompt;

  // 5. Request from Groq if key exists
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "dummy") {
    try {
      const systemPrompt = "You are an expert speech coach. Generate exactly one practice prompt (under 30 words) for a speaker. Return ONLY the prompt text, no quotes or additional text.";
      const userPrompt = `Goal: ${goal}, Experience Level: ${level}, Stated Focus Metric: ${weakestMetric}. The speaker's 3 weakest metrics from last 5 sessions are: ${sortedMetrics.join(", ")}. Today is ${currentDay}, so make the prompt ${difficultyLabel} difficulty.`;
      
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.7,
        max_tokens: 60
      });

      const responseText = chatCompletion.choices[0]?.message?.content?.trim();
      if (responseText) {
        prompt = responseText.replace(/^["']|["']$/g, ""); // strip quotes
      }
    } catch (err) {
      console.error("Error generating daily prompt via Groq:", err);
    }
  }

  // 6. Save to profiles table cache
  await supabase
    .from("profiles")
    .update({
      daily_prompt: prompt,
      daily_prompt_generated_at: new Date().toISOString()
    })
    .eq("id", userId);

  return prompt;
}

export async function getProgressSnapshot(userId: string): Promise<ProgressMetricData[] | null> {
  const supabase = getSupabaseAdmin();

  // Fetch last 7 recordings
  const { data: recordings } = await supabase
    .from("recordings")
    .select("confidence, clarity, wpm, filler_words, eye_contact, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(7);

  if (!recordings || recordings.length < 3) {
    return null;
  }

  // Reverse to make chronological (left to right)
  const chronRecordings = [...recordings].reverse();

  // Extract individual arrays
  const confidenceTrend = chronRecordings.map(r => r.confidence || 0);
  const clarityTrend = chronRecordings.map(r => r.clarity || 0);
  const wpmTrend = chronRecordings.map(r => r.wpm || 0);
  const fillersTrend = chronRecordings.map(r => r.filler_words || 0);
  const eyeContactTrend = chronRecordings.map(r => r.eye_contact || 0);

  const calculateTrendDirection = (trend: number[], reverse: boolean = false): boolean => {
    if (trend.length < 2) return true;
    
    // Compare average of last 3 to average of preceding ones
    const last3 = trend.slice(-3);
    const prev = trend.slice(0, -3);
    
    const last3Avg = last3.reduce((a, b) => a + b, 0) / last3.length;
    const prevAvg = prev.length > 0 ? prev.reduce((a, b) => a + b, 0) / prev.length : trend[0];

    return reverse ? last3Avg <= prevAvg : last3Avg >= prevAvg;
  };

  const getRecentAvg = (trend: number[]): number => {
    // Average of last 5
    const last5 = trend.slice(-5);
    return last5.reduce((a, b) => a + b, 0) / last5.length;
  };

  return [
    {
      metric: "confidence",
      displayName: "Confidence",
      averageScore: Math.round(getRecentAvg(confidenceTrend)),
      trend: confidenceTrend,
      isTrendingUp: calculateTrendDirection(confidenceTrend)
    },
    {
      metric: "clarity",
      displayName: "Clarity",
      averageScore: Math.round(getRecentAvg(clarityTrend)),
      trend: clarityTrend,
      isTrendingUp: calculateTrendDirection(clarityTrend)
    },
    {
      metric: "pacing",
      displayName: "Pacing (WPM)",
      averageScore: Math.round(getRecentAvg(wpmTrend)),
      trend: wpmTrend,
      // Pacing is trending up if it is closer to optimal (140) compared to before
      isTrendingUp: calculateTrendDirection(wpmTrend.map(w => -Math.abs(w - 140)))
    },
    {
      metric: "fillers",
      displayName: "Filler Words",
      averageScore: Math.round(getRecentAvg(fillersTrend) * 10) / 10,
      trend: fillersTrend,
      isTrendingUp: calculateTrendDirection(fillersTrend, true) // reverse: less fillers is better
    },
    {
      metric: "eye_contact",
      displayName: "Eye Contact",
      averageScore: Math.round(getRecentAvg(eyeContactTrend)),
      trend: eyeContactTrend,
      isTrendingUp: calculateTrendDirection(eyeContactTrend)
    }
  ];
}

export async function getRecentSessions(userId: string): Promise<RecentSessionData[]> {
  const supabase = getSupabaseAdmin();

  // Fetch last 5 recordings
  const { data: recordings } = await supabase
    .from("recordings")
    .select("id, created_at, confidence, clarity, wpm, filler_words, eye_contact")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!recordings) return [];

  return recordings.map(r => {
    const confidence = r.confidence || 0;
    const clarity = r.clarity || 0;
    const eyeContact = r.eye_contact || 0;
    
    // Overall score = simple average of confidence, clarity, and eyeContact
    const overallScore = Math.round((confidence + clarity + eyeContact) / 3);

    // Date formatting
    const d = new Date(r.created_at);
    const formattedDate = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });

    // Determine top and weakest metrics
    const wpm = r.wpm || 0;
    const fillers = r.filler_words || 0;

    const normScores = {
      Confidence: confidence,
      Clarity: clarity,
      Pacing: 100 - Math.min(100, Math.abs(wpm - 145) * 1.5),
      "Filler Words": Math.max(0, 100 - fillers * 15),
      "Eye Contact": eyeContact
    };

    let topMetric = "Confidence";
    let worstMetric = "Confidence";
    let maxVal = -1;
    let minVal = 999;

    Object.entries(normScores).forEach(([name, val]) => {
      if (val > maxVal) {
        maxVal = val;
        topMetric = name;
      }
      if (val < minVal) {
        minVal = val;
        worstMetric = name;
      }
    });

    return {
      id: r.id,
      date: formattedDate,
      overallScore,
      topMetric,
      worstMetric,
      duration: 90 // fallback average recording duration
    };
  });
}
