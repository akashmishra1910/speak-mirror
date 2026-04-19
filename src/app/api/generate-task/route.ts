import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy' });

export async function GET() {
  try {
    if (!process.env.GROQ_API_KEY) {
      // Fallback
      return NextResponse.json({
        topic: "The Importance of Adaptability",
        word: "Resilient",
        meaning: "Able to withstand or recover quickly from difficult conditions.",
        example: "The team proved to be highly resilient, bouncing back stronger after the initial project failure.",
        idiom: "Weather the storm",
        reading_text: "In today's fast-paced corporate environment, being resilient is an absolute necessity. We often face unexpected challenges that threaten our timelines. However, if we can weather the storm together, we will emerge much stronger. It is not about avoiding failure, but rather learning how to adapt and push forward."
      });
    }

    const prompt = `You are an expert communications coach for a corporate team. 
Generate a daily speaking practice task. 

Return ONLY a JSON object with the following schema:
{
  "topic": "A professional or interesting speaking topic (e.g., 'Pitching a new idea', 'Handling conflict', 'The future of AI')",
  "word": "An advanced vocabulary word related to the topic",
  "meaning": "A clear, concise dictionary definition of the word",
  "example": "A professional example sentence using the word",
  "idiom": "A common English idiom related to the topic (e.g., 'Break the ice', 'Elephant in the room')",
  "reading_text": "A cohesive 3-4 sentence paragraph that naturally incorporates BOTH the vocabulary word and the idiom. This text will be used as a teleprompter script for pronunciation practice."
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You respond strictly with valid JSON." },
        { role: "user", content: prompt }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7, // Higher temp for more variety
      response_format: { type: "json_object" }
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) throw new Error("No task generated");

    const taskData = JSON.parse(content);

    return NextResponse.json(taskData);

  } catch (error) {
    console.error("Task generation error:", error);
    return NextResponse.json({ error: "Failed to generate task" }, { status: 500 });
  }
}
