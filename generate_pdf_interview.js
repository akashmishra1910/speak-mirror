const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("Checking for 'pdfkit' dependency...");
try {
  require.resolve('pdfkit');
} catch (e) {
  console.log("Installing 'pdfkit' temporarily for PDF generation...");
  execSync('npm install --no-save pdfkit');
}

const PDFDocument = require('pdfkit');

// Initialize document
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 }
});

const outputPath = path.join(__dirname, 'SpeakMirror_Interview_Prep.pdf');
const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// Document Colors (Cool techy theme)
const primaryColor = '#09090d';  // Dark Charcoal
const accentColor = '#4f46e5';   // Indigo
const textColor = '#1f2937';     // Charcoal body text
const grayColor = '#4b5563';     // Slate gray
const codeBg = '#f3f4f6';        // Light gray for blockquotes

// Title Banner Header
doc.rect(0, 0, 595, 110).fill(primaryColor);

// Title Text
doc.fillColor('#ffffff')
   .font('Helvetica-Bold')
   .fontSize(22)
   .text('SPEAKMIRROR', 50, 35);

doc.fillColor('#9ca3af')
   .font('Helvetica')
   .fontSize(9)
   .text('// IN-DEPTH SPONTANEOUS SPEECH COACHING INTERVIEW PREP GUIDE', 50, 65);

doc.fillColor('#6366f1')
   .font('Courier-Bold')
   .fontSize(9)
   .text('PRODUCT DEEP-DIVE MATRIX', 545, 35, { align: 'right' });

// Reset margins for body drawing
doc.fillColor(textColor);
let y = 140;

// Draw Question Block Helper
const drawQA = (index, category, question, situation, task, action, result) => {
  // Check page space remaining before drawing header (A4 height is 842. Standard page height limit 720)
  if (y > 700) {
    doc.addPage();
    y = 50;
  }

  // Question Header
  doc.fillColor(accentColor)
     .font('Helvetica-Bold')
     .fontSize(12)
     .text(`${index}. ${category.toUpperCase()}`, 50, y);
  
  y = doc.y + 4;
  
  doc.fillColor(primaryColor)
     .font('Helvetica-Bold')
     .fontSize(10.5)
     .text(`Question: "${question}"`, 50, y, { width: 495 });
  
  y = doc.y + 10;

  // Narrative Label
  doc.fillColor(grayColor)
     .font('Helvetica-Oblique')
     .fontSize(9)
     .text('Narrative Storytelling Response (STAR Method):', 50, y);
  
  y = doc.y + 6;

  // Text contents
  const starSections = [
    { label: 'Situation', text: situation },
    { label: 'Task', text: task },
    { label: 'Action', text: action },
    { label: 'Result', text: result }
  ];

  starSections.forEach(section => {
    // Check page space remaining
    if (y > 720) {
      doc.addPage();
      y = 50;
    }

    doc.fillColor(accentColor)
       .font('Helvetica-Bold')
       .fontSize(9.5)
       .text(`[${section.label}]`, 50, y);

    doc.fillColor(textColor)
       .font('Helvetica')
       .fontSize(9.5)
       .text(section.text, 120, y, { width: 425, align: 'justify' });
    
    y = doc.y + 8;
  });

  y += 8;
  
  // Draw separator line
  if (y < 700) {
    doc.strokeColor('#e5e7eb')
       .lineWidth(1)
       .moveTo(50, y)
       .lineTo(545, y)
       .stroke();
    y += 12;
  } else {
    doc.addPage();
    y = 50;
  }
};

// Data Q&A Contents

drawQA(
  1,
  "System Design & Architecture",
  "Can you walk me through the architecture of SpeakMirror and explain the rationale behind your design decisions?",
  "When planning SpeakMirror, streaming high-definition video feeds to a cloud server to analyze speech introduced severe network latency (often 4-6 seconds) and incurred unsustainable server GPU hosting costs.",
  "I had to architect a zero-latency, cost-effective system that could analyze eye contact and facial expressions in real time, while still utilizing advanced language models for transcript feedback.",
  "I split the architecture: client-side visual telemetry runs locally using Google's MediaPipe FaceLandmarker WebAssembly (WASM) directly on the client's GPU at 60 FPS. Meanwhile, serverless vocal diagnostics are routed at recording completion to Groq Whisper-large-v3 for transcription and Llama 3.1 LLM to generate unified visual-vocal feedback.",
  "This edge-vocal architecture resulted in zero video-network latency, dropped server GPU hosting requirements to zero, and unified visual and audio analytics into cohesive coaching insights."
);

drawQA(
  2,
  "Performance & Optimization",
  "You ran a 3D FaceLandmarker model in the browser at 60 FPS. How did you optimize React to prevent UI lag and browser lockups?",
  "In the initial prototype, triggering standard React state updates inside the animation frame loop to update the live HUD meters caused 60 re-renders per second, freezing the video recording preview and causing high CPU utilization.",
  "I needed to decouple the high-frequency WASM processing loop from React's rendering pipeline to achieve a smooth 60 FPS video recording preview.",
  "I stored the landmarker instances, frame IDs, and tracking arrays inside refs rather than React states, running the computer vision loop silently. I then implemented a timestamp check (performance.now()) that throttled React state updates to once every 150ms (reducing re-renders from 60 to ~7 per second). Finally, I attached cleanup listeners to free WebAssembly memory on unmount.",
  "CPU usage dropped by over 75%, page lag was completely eliminated, and we achieved a smooth 60 FPS video recording preview on desktop and mobile."
);

drawQA(
  3,
  "Cross-Browser Compatibility",
  "How did you solve the cross-browser recording and playback compatibility issues (specifically regarding WebM vs MP4 containers)?",
  "Browser media recording is highly fragmented. Safari only supports MP4 (H.264/AAC) and crashes with WebM, while Firefox and older Chrome versions only support WebM, which fails to play natively on standard slide presentations, iOS QuickTime, Slack, or WhatsApp.",
  "I had to build a recording pipeline that works on Chrome, Safari, and Firefox, and outputs files in a format that can be played universally.",
  "I wrote a runtime feature-negotiation module using MediaRecorder.isTypeSupported() to check and select MP4 (H.264/AAC) containers first, falling back to WebM container types. I then updated the Supabase file storage upload script to dynamically extract the extension (mp4/webm) from the recorded Blob type, and refactored the download handlers to fetch the correct file headers.",
  "The system achieves 100% browser compatibility. Safari users record in native MP4, Chrome/Edge users record in MP4 when supported, and Firefox users fall back to WebM. All exported files play seamlessly on all platforms."
);

drawQA(
  4,
  "Edge ML & Mathematical Modeling",
  "How did you calculate 'Eye Contact Quality' and 'Facial Expression Score' from raw facial blendshapes?",
  "MediaPipe's FaceLandmarker returns a raw list of 52 blendshape values (decimal scores between 0.0 and 1.0) which do not represent human-friendly indicators for gaze focus or facial engagement.",
  "I needed to design mathematical models for 'Eye Contact Quality' and 'Facial Expression' that align with human coaching perception and allow for natural movement.",
  "I calculated horizontal eye gaze shift (gazeX) by comparing inward and outward look blendshapes, and vertical shift (gazeY) by comparing lookUp and lookDown scores. Using the Euclidean distance deviation, I established a dead-zone of 0.08 (allowing natural micro-movements) and a linear drop-off threshold up to 0.28 (looking away). For expressions, I averaged smile intensity (40%), eyebrow raising (30%), and eye widening (30%) to score engagement rather than just smiles.",
  "The metrics feel natural. Users can look around the screen without penalization, but looking fully away drops eye contact immediately. The expression score rewards visual warmth and facial animation."
);

drawQA(
  5,
  "Database Security & Tenancy",
  "How did you design the database schemas and security policies to handle sandboxed personal practices vs shared team workspaces?",
  "SpeakMirror caters to B2C (private sandboxes) and B2B (collaborative team organizations). A major risk in PostgreSQL RLS (Row-Level Security) is recursive query loops that slow down data queries and cause memory exhaustion under load.",
  "I had to write high-performance, recursion-free Postgres policies that strictly separate personal workspace records from team records.",
  "I mapped all rooms, tasks, and recordings to an organization_id. Every user upon signup is provisioned a 'Personal Space' organization. I then wrote a recursion-free PL/pgSQL helper function marked as 'security definer' to query memberships directly using the session context (bypassing table loops), and mapped this function to all recordings RLS policies.",
  "The database enforces absolute multi-tenancy. Personal recordings are fully private, while team workflows allow collaborative mentor reviews with minimal query latency."
);

drawQA(
  6,
  "Speech Telemetry & Audio Math",
  "How does the application calculate speech metrics such as WPM (Words Per Minute) and filler word frequency from the audio recording?",
  "Vocal pacing and filter word tracking must be computed dynamically from the speech recording. Hardcoding these or performing naive silence-length checks does not yield accurate verbal diagnostics.",
  "I needed to build a serverless pipeline to accurately extract words, speaking duration, and filler word counts from recorded audio segments.",
  "At recording end, the client uploads the raw audio chunk to our serverless /api/analyze API. The audio is routed to Groq's Whisper-large-v3 model, which yields a full transcript complete with word-level timestamps. We calculate duration directly from the transcription timestamps and compute WPM as (wordCount / duration) * 60. To calculate filler word frequency, we run regex scanners matching filler expressions (e.g., 'um', 'uh', 'like', 'you know', 'basically') against the transcript.",
  "We provide lightning-fast, 2-second vocal analytics feedback. The output classifies user pacing as Balanced (110-170 WPM), compressed, or laconic, and classifies filler usage from Clean (<= 2 stumbles) to high frequency."
);

drawQA(
  7,
  "GPU Filters & Live Aesthetics",
  "SpeakMirror features a collection of 'Beautify Filters' (Studio Glow, Warm Golden, etc.). How did you implement this to run at zero runtime performance cost?",
  "Standard video lighting enhancement filters require heavy canvas pixel manipulation (WebGL) that consumes massive CPU/GPU cycles, lagging the camera preview and making recordings stutter.",
  "I had to provide real-time aesthetic filters (lighting correction, soft pink bloom, and warm golden hues) that look professional but incur zero performance cost.",
  "I utilized hardware-accelerated CSS Filter functions (e.g., contrast, saturate, brightness, hue-rotate, blur) applied directly to the video element. By binding these filters to a CSS variable class (e.g. filter: contrast(1.05) saturate(1.1) brightness(1.05) blur(0px) for Studio Glow), the browser applies the filters directly using the OS-level GPU composition tree during playback and recording stream capture.",
  "The beautify filters run at absolute zero JavaScript runtime cost, preserving 60 FPS camera previews and WebAssembly face landmarker performance. Enhancements apply instantly to practice runs and exports."
);

drawQA(
  8,
  "HUD Overlays & Teleprompter UX",
  "How did you design and implement the interactive Teleprompter and the '4W+1H' Assist coaching guides to overlay on active recording sessions?",
  "Speakers often experience visual anxiety or go blank during a speech task. We needed to overlay coaching cues (scrolling text or framework prompt lists) without blocking the camera preview or distracting the speaker's eyes away from the lens.",
  "I had to build responsive teleprompter scrolling and prompt overlays on top of the live video recording stream.",
  "I designed absolute-positioned glassmorphic overlay cards layered directly over the camera feed, utilizing Framer Motion's AnimatePresence for smooth transition fade-ins. For reading tasks, the teleprompter presents text with automatic CSS scroll tracking. For freeform tasks, the 'Assist' panel displays structured prompt bullets (Who, What, Where, When, How) inside a translucent dark backdrop overlay that preserves high visibility.",
  "This UI structure boosted user task completion rate and decreased average silence duration by providing visual guides directly beneath the camera boundary, maintaining the user's eye-line near the lens."
);

drawQA(
  9,
  "PWA capabilities & Streak notifications",
  "How did you configure the Progressive Web App (PWA) capabilities and the notification systems to drive user engagement and habits?",
  "Habit building is core to speech coaching, but users easily forget to complete daily practice, leading to broken streaks and low user retention.",
  "I needed to implement offline support, home screen installation, and daily push reminders to maintain streaks.",
  "I integrated @ducanh2912/next-pwa to cache static pages and Wasm bundles, enabling offline access. I then configured browser Service Workers to handle push notification permissions. On the backend, I created a cron job route (/api/cron/reminders) that scans for inactive users who haven't completed their daily challenge and sends push reminders prior to midnight.",
  "The PWA configuration provides fully native installation support. Streak reminders automate push notifications to prevent streak loss, driving daily practice completion rates."
);

// End document
doc.end();

stream.on('finish', () => {
  console.log(`Successfully generated SpeakMirror_Interview_Prep.pdf! Saved to: ${outputPath}`);
});
