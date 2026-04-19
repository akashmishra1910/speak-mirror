import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy' });

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as Blob;
    const expectedText = formData.get("expectedText") as string | null;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      // Fallback for missing API key
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return NextResponse.json({
        confidence: 72,
        clarity: 80,
        energy: 65,
        fillerWords: 3,
        wpm: 125,
        transcript: "Um, hi everyone. I'm really excited to be here today. Uh, I think we have a great opportunity to, like, build something amazing. You know?",
        suggestions: [
          { type: "filler", text: 'You used 3 filler words (like "um", "uh"). Try pausing instead of filling the silence.' },
          { type: "pace", text: 'Great pacing! 125 WPM is right in the sweet spot for clear communication.' },
          { type: "confidence", text: 'Your confidence score was 72%. Focus on strong endings to your sentences.' }
        ]
      });
    }

    // Convert Blob to File object for the SDK
    const file = new File([audioFile], "recording.webm", { type: "video/webm" });

    // 1. Get Transcription using Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3",
      response_format: "verbose_json",
    });

    const transcriptText = transcription.text;
    const duration = (transcription as any).duration || 60; // Seconds

    // Calculate approximate WPM
    const wordCount = transcriptText.split(/\s+/).filter(w => w.length > 0).length;
    const wpm = Math.round((wordCount / duration) * 60);

    // 2. Analyze transcript using Llama3
    let analysisPrompt = `You are an expert speech analyst. Analyze the following transcript and extract metrics.

Transcript: "${transcriptText}"

Return ONLY a JSON object with the following schema:
{
  "confidence": <integer 0-100 based on word choice and assertiveness>,
  "clarity": <integer 0-100 based on structure and coherence>,
  "fillerWords": <integer count of filler words like um, uh, like, you know>,
  "suggestions": [
    { "type": "filler" | "pace" | "confidence" | "clarity" | "pronunciation", "text": "Actionable feedback sentence" }
  ]
}
Note: Provide 2-3 highly specific suggestions.`;

    if (expectedText) {
      analysisPrompt = `You are an expert speech and pronunciation analyst. The speaker was tasked to read a specific text. Compare what they actually said (Transcript) against what they were supposed to say (Expected Text).

Expected Text: "${expectedText}"
Actual Transcript: "${transcriptText}"

Grade their pronunciation and articulation. A low clarity score indicates they mispronounced words or stumbled. A high clarity score means they read it perfectly.

Return ONLY a JSON object with the following schema:
{
  "confidence": <integer 0-100 based on pacing and assertiveness>,
  "clarity": <integer 0-100 representing their pronunciation/articulation accuracy compared to expected text>,
  "fillerWords": <integer count of filler words or stutters>,
  "suggestions": [
    { "type": "pronunciation", "text": "Specific feedback on words they missed or mispronounced, or praise for clear articulation." },
    { "type": "pace", "text": "Feedback on their reading pace." }
  ]
}
Note: Provide 2-3 highly specific suggestions.`;
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You respond strictly with valid JSON." },
        { role: "user", content: analysisPrompt }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) throw new Error("No analysis generated");

    const analysis = JSON.parse(content);

    return NextResponse.json({
      confidence: analysis.confidence,
      clarity: analysis.clarity,
      energy: Math.round((analysis.confidence + analysis.clarity) / 2),
      fillerWords: analysis.fillerWords,
      wpm: wpm || 0,
      transcript: transcriptText,
      suggestions: analysis.suggestions || []
    });

  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json({ error: "Failed to analyze speech" }, { status: 500 });
  }
}
