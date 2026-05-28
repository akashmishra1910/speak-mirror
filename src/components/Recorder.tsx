"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2, Video, Lightbulb, HelpCircle, Shuffle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RecorderProps {
  onRecordingComplete: (videoBlob: Blob, audioBlob: Blob) => void;
  isProcessing: boolean;
  readingText?: string | null;
  taskTopic?: string | null;
  userId?: string | null;
  mode?: "freeform" | "reading" | "warmup";
  timeLimit?: number;
  wordOfTheDay?: string | null;
  wordDefinition?: string | null;
  tips?: string[] | null;
}

export function Recorder({ 
  onRecordingComplete, 
  isProcessing, 
  readingText, 
  taskTopic, 
  userId, 
  mode = "freeform",
  timeLimit = 90,
  wordOfTheDay,
  wordDefinition,
  tips
}: RecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [topic, setTopic] = useState("Generating topic...");
  const [bullets, setBullets] = useState<{label: string, text: string}[]>([]);
  const [isLoadingTopic, setIsLoadingTopic] = useState(true);
  const [isAssistEnabled, setIsAssistEnabled] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera preview on mount (runs once)
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: { facingMode: "user" } 
        });
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasPermission(true);
      } catch (err) {
        console.error("Error accessing media devices", err);
        setHasPermission(false);
      }
    };

    initCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Sync timeLeft when timeLimit or mode changes
  useEffect(() => {
    setTimeLeft(timeLimit);
  }, [timeLimit, mode]);

  // Initialize topic and bullets when mode/taskTopic changes
  useEffect(() => {
    if (mode === "reading") {
      setTopic(taskTopic || "Reading Task");
      setIsLoadingTopic(false);
    } else if (mode === "warmup") {
      setTopic(taskTopic || "Daily Warm-up Challenge");
      setIsLoadingTopic(false);
    } else {
      if (taskTopic) {
        setTopic(taskTopic);
        setIsLoadingTopic(false);
        // We still fetch bullets for assist mode
        fetchDynamicTopic(true);
      } else {
        fetchDynamicTopic();
      }
    }
  }, [mode, taskTopic]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && isRecording) {
      stopRecording();
    }
    return () => clearInterval(timer);
  }, [isRecording, timeLeft]);

  const fetchDynamicTopic = async (bulletsOnly = false) => {
    if (!bulletsOnly) {
      setIsLoadingTopic(true);
      setTopic("Generating topic...");
    }
    setBullets([]);
    try {
      const endpoint = userId ? `/api/generate-topic?userId=${userId}` : "/api/generate-topic";
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.topic && data.bullets) {
        if (!bulletsOnly) setTopic(data.topic);
        setBullets(data.bullets);
      } else {
        console.warn("Invalid format from API, using fallback data");
        setTopic("What is the most important lesson you've learned?");
        setBullets([
          { label: "Who", text: "The main people involved were..." },
          { label: "What", text: "The core idea or challenge was..." },
          { label: "Where", text: "This took place in the context of..." },
          { label: "When", text: "This originally occurred when..." },
          { label: "How", text: "Ultimately, it was approached by..." },
        ]);
      }
    } catch (err) {
      console.warn("Failed to fetch topic, using fallback:", err);
      setBullets([
        { label: "Who", text: "The main people involved were..." },
        { label: "What", text: "The core idea or challenge was..." },
        { label: "Where", text: "This took place in the context of..." },
        { label: "When", text: "This originally occurred when..." },
        { label: "How", text: "Ultimately, it was approached by..." },
      ]);
    } finally {
      setIsLoadingTopic(false);
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    
    try {
      // 1. Setup Video Recorder (lowered bitrate to keep fallbacks under 3MB)
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm',
        videoBitsPerSecond: 250000, // 250 kbps (keeps a 90s recording ~2.8MB in total)
        audioBitsPerSecond: 48000   // 48 kbps
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      // 2. Setup Audio-Only Recorder for lightweight API analysis
      let audioRecorder: MediaRecorder | null = null;
      audioChunksRef.current = [];
      
      try {
        const audioTracks = streamRef.current.getAudioTracks();
        if (audioTracks.length > 0) {
          const audioStream = new MediaStream(audioTracks);
          let audioMime = 'audio/webm';
          if (!MediaRecorder.isTypeSupported(audioMime)) {
            if (MediaRecorder.isTypeSupported('audio/mp4')) {
              audioMime = 'audio/mp4';
            } else if (MediaRecorder.isTypeSupported('audio/aac')) {
              audioMime = 'audio/aac';
            }
          }

          audioRecorder = new MediaRecorder(audioStream, {
            mimeType: audioMime,
            audioBitsPerSecond: 48000
          });
          audioRecorderRef.current = audioRecorder;

          audioRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };
        }
      } catch (audioErr) {
        console.warn("Failed to initialize separate audio recorder:", audioErr);
      }

      // Synchronize both recorder stops to prevent race conditions
      let videoBlob: Blob | null = null;
      let audioBlob: Blob | null = null;

      const checkComplete = () => {
        // If we have the video blob, and either we have the audio blob OR the audio recorder failed to start
        if (videoBlob && (audioBlob || !audioRecorder)) {
          onRecordingComplete(videoBlob, audioBlob || videoBlob);
        }
      };

      mediaRecorder.onstop = () => {
        videoBlob = new Blob(chunksRef.current, { type: "video/webm" });
        checkComplete();
      };

      if (audioRecorder) {
        audioRecorder.onstop = () => {
          const audioMimeType = audioRecorder?.mimeType || "audio/webm";
          audioBlob = new Blob(audioChunksRef.current as any, { type: audioMimeType });
          checkComplete();
        };
      }

      mediaRecorder.start();
      if (audioRecorder) {
        audioRecorder.start();
      }
      
      setIsRecording(true);
      setTimeLeft(timeLimit);
    } catch (err) {
      console.error("Error starting recording", err);
      alert("There was an error starting the recording. Your browser might not support the required video format.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error("Error stopping video recorder:", err);
      }
    }
    if (audioRecorderRef.current && isRecording) {
      try {
        audioRecorderRef.current.stop();
      } catch (err) {
        console.error("Error stopping audio recorder:", err);
      }
    }
    setIsRecording(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (hasPermission === false) {
    return (
      <div className="glass-panel p-8 rounded-3xl flex flex-col items-center justify-center w-full max-w-sm mx-auto text-center h-[500px] float-slow">
        <Video className="w-12 h-12 text-red-400 mb-4 animate-pulse" />
        <h2 className="text-xl font-bold mb-2 text-white">Camera Access Required</h2>
        <p className="text-foreground/60 text-sm">Please allow camera and microphone access to use SpeakMirror.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 items-center md:items-start justify-center w-full">
      {/* Main Video Card */}
      <div className="glass-panel rounded-[2rem] flex flex-col items-center justify-center w-full max-w-sm relative overflow-hidden aspect-[9/16] max-h-[calc(100vh-120px)] shadow-2xl border border-white/5 group bg-black shrink-0 float-slow interactive-card">
        
        {/* Live Video Feed with Mirror Effect & Confident Filter */}
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted 
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{ 
            transform: 'scaleX(-1)', // Mirror effect
            filter: 'brightness(1.05) contrast(1.05) saturate(1.1)' // Confident filter
          }}
        />
        
        {/* Subtle Overlay gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 z-10 pointer-events-none" />

        {/* Top Section: Timer & Indicators */}
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start pointer-events-none">
          {/* PiP Timer */}
          <AnimatePresence>
            {isRecording && !isProcessing && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="bg-black/50 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-lg"
              >
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-white font-mono font-medium tracking-wider text-xs">{formatTime(timeLeft)}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toggle Button for Assist or Teleprompter */}
          {mode === "reading" ? (
            <button 
              onClick={() => setIsAssistEnabled(!isAssistEnabled)}
              className={`pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-md transition-all border ${isAssistEnabled ? 'bg-white text-zinc-950 border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.15)] font-semibold' : 'bg-black/50 border-white/10 text-white/70 hover:bg-black/80 hover:text-white'}`}
            >
              <HelpCircle className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Teleprompter</span>
            </button>
          ) : (
            <button 
              onClick={() => setIsAssistEnabled(!isAssistEnabled)}
              className={`pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-md transition-all border ${isAssistEnabled ? 'bg-white text-zinc-950 border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.15)] font-semibold' : 'bg-black/50 border-white/10 text-white/70 hover:bg-black/80 hover:text-white'}`}
            >
              <HelpCircle className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Assist</span>
            </button>
          )}
        </div>

        {/* Center content (Assist Overlay or Teleprompter) */}
        <AnimatePresence>
          {isAssistEnabled && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="z-20 absolute inset-x-4 top-16 md:inset-x-6 md:top-20 bg-black/75 backdrop-blur-md p-4 md:p-5 rounded-2xl border border-white/10 shadow-xl overflow-y-auto max-h-[60%]"
            >
              {mode === "reading" ? (
                <>
                  <h3 className="text-white font-bold mb-3 flex items-center gap-2 text-sm md:text-base">
                    <Lightbulb className="w-4 h-4 text-zinc-300" />
                    Read Aloud
                  </h3>
                  <p className="text-white/90 text-sm md:text-base leading-relaxed font-light">
                    {readingText}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-white font-bold mb-3 flex items-center gap-2 text-sm md:text-base">
                    <Lightbulb className="w-4 h-4 text-zinc-300" />
                    Guide (4W + 1H)
                  </h3>
                  <ul className="space-y-3">
                    {bullets.map((b, i) => (
                      <li key={i} className="flex flex-col md:flex-row md:items-start gap-1 md:gap-2">
                        <span className="text-zinc-400 font-bold text-[10px] md:text-xs uppercase tracking-wider md:w-10 md:mt-0.5">{b.label}</span>
                        <span className="text-white/90 text-xs md:text-sm italic">"{b.text}"</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pre-recording Prompt */}
        {!isRecording && !isProcessing && !isAssistEnabled && (
           <div className="z-20 absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
             <div className="bg-black/50 backdrop-blur-sm px-6 py-4 rounded-2xl text-center border border-white/5">
               <h2 className="text-lg font-bold mb-1 text-white">Looking good! ✨</h2>
               <p className="text-xs text-white/70">Press record to start.</p>
             </div>
           </div>
        )}

        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 z-30 bg-[#050508]/80 backdrop-blur-md flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-[0_0_35px_0_rgba(255,255,255,0.05)]">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
            <span className="mt-4 text-xs font-semibold text-white tracking-widest uppercase">Analyzing...</span>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="absolute bottom-6 left-0 right-0 z-20 flex flex-col items-center">
          {!isProcessing && (
            isRecording ? (
              <button
                onClick={stopRecording}
                className="w-16 h-16 md:w-20 md:h-20 bg-red-600/90 hover:bg-red-500 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all shadow-[0_0_30px_0_rgba(239,68,68,0.3)] hover:shadow-[0_0_40px_0_rgba(239,68,68,0.5)] border border-red-400/30 scale-100 hover:scale-105 active:scale-95"
              >
                <Square className="w-6 h-6 md:w-8 md:h-8 fill-current" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="w-16 h-16 md:w-20 md:h-20 bg-white hover:bg-zinc-200 backdrop-blur-md text-zinc-950 rounded-full flex items-center justify-center transition-all shadow-[0_0_30px_0_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_0_rgba(255,255,255,0.25)] border border-white/20 scale-100 hover:scale-105 active:scale-95"
              >
                <Mic className="w-6 h-6 md:w-8 md:h-8" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Side Panel: Topic display */}
      <div className="w-full md:w-64 shrink-0 flex flex-col gap-4 mt-2 md:mt-0 float-medium interactive-card">
        <div className="glass-panel p-5 md:p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              {mode === "reading" ? "Reading Practice" : (mode === "warmup" ? "Daily Warm-up" : "Your Topic")}
            </span>
            {mode === "freeform" && !taskTopic && (
              <button 
                onClick={() => fetchDynamicTopic(false)}
                disabled={isRecording || isLoadingTopic}
                className="p-1.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-colors rounded-full text-foreground/70 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Shuffle Topic"
              >
                <Shuffle className={`w-3.5 h-3.5 ${isLoadingTopic ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
          <p className="font-semibold text-sm md:text-base leading-relaxed text-white">
            {topic}
          </p>
        </div>

        {mode === "warmup" && wordOfTheDay && (
          <div className="glass-panel p-5 md:p-6 rounded-3xl bg-indigo-500/[0.02] border-indigo-500/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
              Vocabulary Word
            </span>
            <p className="font-extrabold text-lg text-white mt-1.5 leading-tight">
              {wordOfTheDay}
            </p>
            {wordDefinition && (
              <p className="text-[11px] text-zinc-400 font-light mt-1.5 leading-relaxed">
                {wordDefinition}
              </p>
            )}
          </div>
        )}

        {mode === "warmup" && tips && tips.length > 0 ? (
          <div className="glass-panel p-5 md:p-6 rounded-3xl bg-white/[0.01] border-white/5 hidden md:block">
            <h3 className="text-xs font-bold mb-2 flex items-center gap-2 text-white">
              <Lightbulb className="w-4 h-4 text-zinc-300 animate-pulse" />
              Warm-up Tips
            </h3>
            <ul className="space-y-2 text-xs text-foreground/60 leading-relaxed font-light list-disc list-inside">
              {tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="glass-panel p-5 md:p-6 rounded-3xl bg-white/[0.01] border-white/5 hidden md:block">
            <h3 className="text-xs font-bold mb-2 flex items-center gap-2 text-white">
              <Lightbulb className="w-4 h-4 text-zinc-300 animate-pulse" />
              Pro Tip
            </h3>
            <p className="text-xs text-foreground/60 leading-relaxed font-light">
              {mode === "reading" 
                ? "Use the Teleprompter button on the camera view to reveal the exact text you need to read aloud. The AI will grade your pronunciation!"
                : "Use the Assist button on the camera view to reveal the 4W+1H guiding framework if you get stuck!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
