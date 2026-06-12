import Groq, { toFile } from "groq-sdk";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy' });

export async function POST(request: Request) {
  // Authenticate to safeguard AI processing credits
  try {
    await requireAuth(request);
  } catch (authErr: any) {
    return errorResponse(authErr.message || "Unauthorized", 401);
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as Blob;
    const expectedText = formData.get("expectedText") as string | null;
    const eyeContact = formData.get("eyeContact") as string | null;
    const expression = formData.get("expression") as string | null;

    if (!audioFile) {

      return errorResponse("No audio file provided", 400);
    }

    if (!process.env.GROQ_API_KEY) {
      // Fallback for missing API key
      await new Promise((resolve) => setTimeout(resolve, 2000));

      return successResponse({
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

    // Convert Blob to Buffer, then use toFile for SDK compatibility
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const mimeType = audioFile.type || "audio/webm";
    
    // Strip codecs parameters (e.g. 'audio/webm;codecs=opus' -> 'audio/webm')
    let baseMimeType = mimeType.split(";")[0];
    if (baseMimeType.startsWith("video/")) {
      baseMimeType = baseMimeType.replace("video/", "audio/");
    }
    let extension = baseMimeType.split("/")[1] || "webm";
    
    // Map extensions to Groq's allowed Whisper types: [flac mp3 mp4 mpeg mpga m4a ogg opus wav webm]
    const supportedExtensions = ["flac", "mp3", "mp4", "mpeg", "mpga", "m4a", "ogg", "opus", "wav", "webm"];
    if (!supportedExtensions.includes(extension)) {
      if (extension === "aac" || extension === "x-m4a") {
        extension = "m4a";
      } else {
        extension = "webm"; // safe fallback
      }
    }
    
    const file = await toFile(buffer, `recording.${extension}`, { type: baseMimeType });

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

    // Construct visual presence telemetry context
    let visualContext = "";
    if (eyeContact || expression) {
      visualContext = `\nWe also tracked the speaker's physical behavior using browser-side camera telemetry:
${eyeContact ? `- Eye Contact Quality Score: ${eyeContact}% (A score below 80% indicates looking away from the camera/screen frequently)\n` : ""}${expression ? `- Facial Expression / Engagement Score: ${expression}% (A score below 50% indicates a neutral or flat face; higher scores show good expressiveness, smiling, and eyebrow movements)\n` : ""}Please analyze these metrics and incorporate them into the suggestions. Provide at least one recommendation specifically addressing their eye contact (of type "gaze") or facial expressions (of type "expression") based on these numbers, advising them how to connect better with their audience.`;
    }

    // 2. Analyze transcript using Llama3
    let analysisPrompt = `You are an expert speech and communication analyst. Analyze the following transcript and camera telemetry metrics.

Transcript: "${transcriptText}"${visualContext}

Return ONLY a JSON object with the following schema:
{
  "confidence": <integer 0-100 based on word choice and assertiveness>,
  "clarity": <integer 0-100 based on structure and coherence>,
  "fillerWords": <integer count of filler words like um, uh, like, you know>,
  "coachComment": "A single personalized, encouraging, and actionable coaching sentence highlighting a key strength and area of improvement.",
  "suggestions": [
    { "type": "filler" | "pace" | "confidence" | "clarity" | "pronunciation" | "expression" | "gaze", "text": "Actionable feedback sentence" }
  ],
  "annotations": [
    { "text": "specific exact word or phrase from the transcript", "type": "filler" | "pace", "comment": "coaching tip/explanation for this specific moment" }
  ]
}
Note: Provide 2-3 highly specific suggestions. Ensure annotations are exact substrings of the transcript.`;

    if (expectedText) {
      analysisPrompt = `You are an expert speech, pronunciation, and communication analyst. The speaker was tasked to read a specific text. Compare what they actually said (Transcript) against what they were supposed to say (Expected Text), and take camera telemetry into account.

Expected Text: "${expectedText}"
Actual Transcript: "${transcriptText}"${visualContext}

Grade their pronunciation, articulation, and visual presence. A low clarity score indicates they mispronounced words or stumbled. A high clarity score means they read it perfectly.

Return ONLY a JSON object with the following schema:
{
  "confidence": <integer 0-100 based on pacing and assertiveness>,
  "clarity": <integer 0-100 representing their pronunciation/articulation accuracy compared to expected text>,
  "fillerWords": <integer count of filler words or stutters>,
  "coachComment": "A single personalized, encouraging, and actionable coaching sentence highlighting a key strength and area of improvement.",
  "suggestions": [
    { "type": "pronunciation" | "pace" | "expression" | "gaze", "text": "Actionable feedback sentence" }
  ],
  "annotations": [
    { "text": "specific exact word or phrase from the transcript", "type": "filler" | "pace", "comment": "coaching tip/explanation for this specific moment" }
  ]
}
Note: Provide 2-3 highly specific suggestions. Ensure annotations are exact substrings of the transcript.`;
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



    return successResponse({
      confidence: analysis.confidence,
      clarity: analysis.clarity,
      energy: Math.round((analysis.confidence + analysis.clarity) / 2),
      fillerWords: analysis.fillerWords,
      wpm: wpm || 0,
      transcript: transcriptText,
      suggestions: analysis.suggestions || [],
      coachComment: analysis.coachComment || "Great work on your practice session! Keep practicing to refine your delivery.",
      annotations: analysis.annotations || []
    });

  } catch (error: any) {
    console.error("Analysis error:", error);

    return errorResponse(error.message || "Failed to analyze speech", 500);
  }
}
