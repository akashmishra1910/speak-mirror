import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import Groq from "groq-sdk";
import { z } from 'zod';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy' });

const RequestParamsSchema = z.object({
  level: z.enum(["beginner", "intermediate", "advanced", "Beginner", "Intermediate", "Advanced"]).optional().nullable(),
});

export async function GET(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    let user;
    let userId: string | null = null;
    try {
      user = await requireAuth(request);
      userId = user?.id || null;
    } catch {
      // Allow unauthenticated requests without personalization
    }

    if (!process.env.GROQ_API_KEY && !userId) {
      // Quick fallback if unauthenticated and no API key
      return successResponse({
        topic: "What is the most important lesson you've learned?",
        bullets: [
          { label: "Who", text: "The main people involved were..." },
          { label: "What", text: "The core idea or challenge was..." },
          { label: "Where", text: "This took place in the context of..." },
          { label: "When", text: "This originally occurred when..." },
          { label: "How", text: "Ultimately, it was approached by..." },
        ]
      });
    }

    const { searchParams } = new URL(request.url);
    const parsed = RequestParamsSchema.safeParse({
      level: searchParams.get('level'),
    });

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const levelParam = parsed.data.level;
    let userGoal: string | null = null;
    let userFocusMetric: string | null = null;
    let userExpLevel: string | null = null;
    let pastTopics: string[] = [];

    // Fetch user profile and past topics for personalization
    if (userId) {
      try {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('goal, experience_level, focus_metric')
          .eq('id', userId)
          .single();
        
        if (profile) {
          userGoal = profile.goal;
          userFocusMetric = profile.focus_metric;
          userExpLevel = profile.experience_level;
        }

        const { data: recordingsData } = await supabaseAdmin
          .from('recordings')
          .select('topic')
          .eq('user_id', userId)
          .not('topic', 'is', null)
          .neq('topic', 'Free Practice')
          .neq('topic', 'Free Speech Sandbox')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (recordingsData) {
          pastTopics = recordingsData
            .map(r => r.topic)
            .filter(t => t && t.trim() !== "" && !t.startsWith("Reading:"));
        }
      } catch (err) {
        console.warn("Failed to fetch personalization info:", err);
      }
    }

    // Determine target difficulty level
    let difficultyLevel = "Beginner";
    const activeLevel = userExpLevel || levelParam;
    if (activeLevel) {
      const lower = activeLevel.toLowerCase();
      if (lower === "intermediate") difficultyLevel = "Intermediate";
      else if (lower === "advanced") difficultyLevel = "Advanced";
    } else if (userId) {
      let recordingCount = 0;
      try {
        const { count } = await supabaseAdmin
          .from('recordings')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        recordingCount = count || 0;
      } catch (err) {
        console.warn("Failed to count recordings:", err);
      }
      if (recordingCount >= 15) {
        difficultyLevel = "Advanced";
      } else if (recordingCount >= 5) {
        difficultyLevel = "Intermediate";
      }
    }


    // Fallback to live AI topic generation using Groq
    if (!process.env.GROQ_API_KEY) {
      return successResponse({
        topic: "What is the most important lesson you've learned?",
        bullets: [
          { label: "Who", text: "The main people involved were..." },
          { label: "What", text: "The core idea or challenge was..." },
          { label: "Where", text: "This took place in the context of..." },
          { label: "When", text: "This originally occurred when..." },
          { label: "How", text: "Ultimately, it was approached by..." },
        ]
      });
    }

    let difficultyDescription = "Simple, relatable, everyday topics (e.g., 'What is your favorite hobby?', 'Describe a memorable trip').";
    if (difficultyLevel === "Intermediate") {
      difficultyDescription = "Professional or slightly abstract topics (e.g., 'How do you handle workplace conflict?', 'The most important trait of a leader').";
    } else if (difficultyLevel === "Advanced") {
      difficultyDescription = "Complex, philosophical, or highly technical thought-provoking topics (e.g., 'The ethical implications of AI', 'Strategies for managing global supply chain disruptions').";
    }

    const excludeInstructions = pastTopics.length > 0
      ? `CRITICAL REQUIREMENT: Do NOT generate any topic that is identical or semantically similar to any of these previously practiced topics by the user:\n${pastTopics.map(t => `- ${t}`).join("\n")}`
      : "";

    const goalStr = userGoal ? `Goal: ${userGoal}` : "";
    const focusMetricStr = userFocusMetric ? `Focus Metric: ${userFocusMetric}` : "";
    const promptContext = [goalStr, focusMetricStr].filter(Boolean).join(", ");
    const contextPrompt = promptContext ? `The user's personalized context is: ${promptContext}. Ensure the generated topic is highly relevant and helpful for this goal and focus area.` : "";

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an expert communication coach. Generate a unique, thought-provoking topic for a 90-second speech.
          
          DIFFICULTY LEVEL: ${difficultyLevel}
          GUIDELINES: ${difficultyDescription}
          
          ${contextPrompt}
          
          ${excludeInstructions}
          
          Also generate exactly 5 incomplete starter sentences based on the 4W and 1H framework (Who, What, Where, When, How) tailored specifically to that topic.
          
          Respond ONLY in the following JSON format:
          {
            "topic": "The generated topic string",
            "bullets": [
              { "label": "Who", "text": "..." },
              { "label": "What", "text": "..." },
              { "label": "Where", "text": "..." },
              { "label": "When", "text": "..." },
              { "label": "How", "text": "..." }
            ]
          }`
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.8,
      max_tokens: 256,
      response_format: { type: "json_object" }
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) throw new Error("No content generated");

    const parsedData = JSON.parse(content);
    return successResponse(parsedData);

  } catch (error: any) {
    console.warn("Topic generation error, falling back to default:", error);
    return successResponse({
      topic: "What is the most important lesson you've learned?",
      bullets: [
        { label: "Who", text: "The main people involved were..." },
        { label: "What", text: "The core idea or challenge was..." },
        { label: "Where", text: "This took place in the context of..." },
        { label: "When", text: "This originally occurred when..." },
        { label: "How", text: "Ultimately, it was approached by..." },
      ]
    });
  }
}
