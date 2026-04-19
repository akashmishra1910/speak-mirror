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

    let recordingCount = 0;
    if (userId && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const { count } = await supabaseAdmin
        .from('recordings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      recordingCount = count || 0;
    }

    let difficultyLevel = "Beginner";
    let difficultyDescription = "Simple, relatable, everyday topics (e.g., 'What is your favorite hobby?', 'Describe a memorable trip').";
    
    if (recordingCount >= 15) {
      difficultyLevel = "Advanced";
      difficultyDescription = "Complex, philosophical, or highly technical thought-provoking topics (e.g., 'The ethical implications of AI', 'Strategies for managing global supply chain disruptions').";
    } else if (recordingCount >= 5) {
      difficultyLevel = "Intermediate";
      difficultyDescription = "Professional or slightly abstract topics (e.g., 'How do you handle workplace conflict?', 'The most important trait of a leader').";
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an expert communication coach. Generate a thought-provoking topic for a 90-second speech.
          
          DIFFICULTY LEVEL: ${difficultyLevel}
          GUIDELINES: ${difficultyDescription}
          
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
