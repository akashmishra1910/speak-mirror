import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy' });

export async function GET(request: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      // Fallback for missing API key
      return NextResponse.json({
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

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const levelParam = url.searchParams.get('level');

    let difficultyLevel = "Beginner";
    let pastTopics: string[] = [];

    // Set up Supabase Admin client if configuration is present
    const hasSupabaseEnv = !!(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL);
    const supabaseAdmin = hasSupabaseEnv
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      : null;

    if (userId && supabaseAdmin) {
      try {
        // Fetch past recording topics for this user to avoid duplication
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
        console.warn("Failed to fetch past topics:", err);
      }
    }

    // Try to load from pre-generated pool first for cost control
    if (supabaseAdmin) {
      try {
        const { data: poolTasks } = await supabaseAdmin
          .from("practice_tasks")
          .select("*");
          
        if (poolTasks && poolTasks.length > 0) {
          // Filter out past topics
          const availableTasks = poolTasks.filter(t => !pastTopics.includes(t.topic_of_the_day));
          const selectedTask = availableTasks.length > 0
            ? availableTasks[Math.floor(Math.random() * availableTasks.length)]
            : poolTasks[Math.floor(Math.random() * poolTasks.length)];
            
          if (selectedTask) {
            return NextResponse.json({
              topic: selectedTask.topic_of_the_day,
              bullets: selectedTask.bullets || []
            });
          }
        }
      } catch (poolErr) {
        console.warn("Failed to fetch from practice_tasks pool, falling back to live AI:", poolErr);
      }
    }

    if (levelParam) {
      const lower = levelParam.toLowerCase();
      if (lower === "intermediate") difficultyLevel = "Intermediate";
      else if (lower === "advanced") difficultyLevel = "Advanced";
      else difficultyLevel = "Beginner";
    } else {
      let recordingCount = 0;
      if (userId && supabaseAdmin) {
        try {
          const { count } = await supabaseAdmin
            .from('recordings')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
          recordingCount = count || 0;
        } catch (err) {
          console.warn("Failed to count recordings:", err);
        }
      }
      if (recordingCount >= 15) {
        difficultyLevel = "Advanced";
      } else if (recordingCount >= 5) {
        difficultyLevel = "Intermediate";
      } else {
        difficultyLevel = "Beginner";
      }
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

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an expert communication coach. Generate a unique, thought-provoking topic for a 90-second speech.
          
          DIFFICULTY LEVEL: ${difficultyLevel}
          GUIDELINES: ${difficultyDescription}
          
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

    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);

  } catch (error) {
    console.warn("Topic generation error, falling back to default:", error);
    return NextResponse.json({
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
