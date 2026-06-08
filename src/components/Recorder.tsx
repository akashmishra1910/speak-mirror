"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2, Video, Lightbulb, HelpCircle, Shuffle, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BEAUTIFY_FILTERS } from "@/lib/filters";
import { useFaceAnalysis } from "@/hooks/useFaceAnalysis";

interface RecorderProps {
  onRecordingComplete: (videoBlob: Blob, audioBlob: Blob, eyeContactAvg?: number, expressionScoreAvg?: number) => void;
  isProcessing: boolean;
  readingText?: string | null;
  taskTopic?: string | null;
  userId?: string | null;
  userLevel?: string | null;
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
  userLevel,
  mode = "freeform",
  timeLimit = 90,
  wordOfTheDay,
  wordDefinition,
  tips
}: RecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // Warm-up breathing states
  const [showWarmupScreen, setShowWarmupScreen] = useState(false);
  const [warmupCountdown, setWarmupCountdown] = useState(30);
  const [breathingState, setBreathingState] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [breathingSeconds, setBreathingSeconds] = useState(4);
  
  // Live speech analysis states
  const [liveFillerCount, setLiveFillerCount] = useState(0);
  const [liveWpm, setLiveWpm] = useState(130);
  const [pacingStatus, setPacingStatus] = useState<"slow" | "good" | "fast">("good");
  
  const [topic, setTopic] = useState("Generating topic...");
  const [bullets, setBullets] = useState<{label: string, text: string}[]>([]);
  const [isLoadingTopic, setIsLoadingTopic] = useState(true);
  const [isAssistEnabled, setIsAssistEnabled] = useState(false);

  // Beautify filter preference (default: studio glow)
  const [activeFilter, setActiveFilter] = useState("studio");
  
  // Custom Bell Alert Timing (default: 75 seconds, i.e. 15 seconds remaining)
  const [bellTiming, setBellTiming] = useState(75);
  const [showConcludePrompt, setShowConcludePrompt] = useState(false);
  const hasTriggeredBellRef = useRef(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedFilter = localStorage.getItem("speak_mirror_beautify_filter");
    if (savedFilter) {
      setActiveFilter(savedFilter);
    }
    if (userId) {
      const savedTiming = localStorage.getItem("speak_mirror_bell_timing");
      if (savedTiming) {
        setBellTiming(parseInt(savedTiming));
      }
    } else {
      setBellTiming(75); // Strictly fixed for unauthenticated users
    }
  }, [userId]);

  // Synthesize a pleasant chime/bell sound dynamically using Web Audio API
  const playBellSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // High A chime
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.6);
      
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2); // Decay
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.2);
    } catch (err) {
      console.warn("Failed to play bell sound:", err);
    }
  };
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Warmup and speech recognition refs
  const warmupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const wordCountRef = useRef<number>(0);

  const {
    isLoading: isFaceLoading,
    isModelReady: isFaceReady,
    liveEyeContact,
    liveExpression,
    startAnalysis,
    stopAnalysis,
  } = useFaceAnalysis(videoRef, !!userId);

  const faceAnalysisResultsRef = useRef<{ eyeContactAvg: number; expressionScoreAvg: number } | null>(null);

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
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          const nextTime = prev - 1;
          const elapsed = timeLimit - nextTime;
          
          // Update WPM pacing metrics dynamically
          const elapsedSeconds = elapsed;
          const elapsedMinutes = elapsedSeconds / 60;
          if (elapsedSeconds > 3 && wordCountRef.current > 0) {
            const currentWpm = Math.round(wordCountRef.current / elapsedMinutes);
            setLiveWpm(currentWpm);
            if (currentWpm < 110) {
              setPacingStatus("slow");
            } else if (currentWpm <= 150) {
              setPacingStatus("good");
            } else {
              setPacingStatus("fast");
            }
          } else {
            setPacingStatus("good");
            setLiveWpm(130); // Baseline default
          }

          if (elapsed === bellTiming && !hasTriggeredBellRef.current) {
            hasTriggeredBellRef.current = true;
            playBellSound();
            setShowConcludePrompt(true);
            setTimeout(() => setShowConcludePrompt(false), 4000);
          }
          
          return nextTime;
        });
      }, 1000);
    } else if (timeLeft === 0 && isRecording) {
      stopRecording();
    }
    return () => clearInterval(timer);
  }, [isRecording, timeLeft, timeLimit, bellTiming]);

  const fetchDynamicTopic = async (bulletsOnly = false) => {
    if (!bulletsOnly) {
      setIsLoadingTopic(true);
      setTopic("Generating topic...");
    }
    setBullets([]);
    try {
      const levelQuery = userLevel ? `&level=${encodeURIComponent(userLevel)}` : "";
      const endpoint = userId ? `/api/generate-topic?userId=${userId}${levelQuery}` : `/api/generate-topic?${levelQuery.substring(1)}`;
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

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }
    
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    
    rec.onresult = (event: any) => {
      let fullTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript + " ";
      }
      
      const cleanText = fullTranscript.toLowerCase().trim();
      if (cleanText.length > 0) {
        const words = cleanText.split(/\s+/).filter(w => w.length > 0);
        const totalWords = words.length;
        wordCountRef.current = totalWords;
        
        // Count fillers: "um", "uh", "like"
        const fillers = words.filter(w => {
          const cleanedWord = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
          return cleanedWord === "um" || cleanedWord === "uh" || cleanedWord === "like";
        }).length;
        
        setLiveFillerCount(fillers);
      }
    };

    rec.onerror = (err: any) => {
      console.warn("Speech recognition error:", err);
    };
    
    rec.onend = () => {
      // Restart if still recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        try {
          rec.start();
        } catch (e) {}
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
    }
  };

  const startRecording = () => {
    if (!userId) {
      startRecordingActual();
      return;
    }
    // Start warm-up breathing exercise first
    setShowWarmupScreen(true);
    setWarmupCountdown(30);
    setBreathingState('inhale');
    setBreathingSeconds(4);
    
    let wCountdown = 30;
    let bSeconds = 4;
    let bState: 'inhale' | 'hold' | 'exhale' = 'inhale';
    
    if (warmupTimerRef.current) clearInterval(warmupTimerRef.current);
    
    warmupTimerRef.current = setInterval(() => {
      wCountdown -= 1;
      setWarmupCountdown(wCountdown);
      
      bSeconds -= 1;
      if (bSeconds === 0) {
        bSeconds = 4;
        if (bState === 'inhale') bState = 'hold';
        else if (bState === 'hold') bState = 'exhale';
        else bState = 'inhale';
        setBreathingState(bState);
      }
      setBreathingSeconds(bSeconds);
      
      if (wCountdown === 0) {
        skipWarmup(false);
      }
    }, 1000);
  };

  const skipWarmup = (userSkipped = false) => {
    if (warmupTimerRef.current) {
      clearInterval(warmupTimerRef.current);
      warmupTimerRef.current = null;
    }
    setShowWarmupScreen(false);
    startRecordingActual();
  };

  const startRecordingActual = () => {
    if (!streamRef.current) return;
    hasTriggeredBellRef.current = false;
    setShowConcludePrompt(false);
    setLiveFillerCount(0);
    setLiveWpm(130);
    setPacingStatus("good");
    wordCountRef.current = 0;
    
    // Clear and start face analysis session
    faceAnalysisResultsRef.current = null;
    if (userId) {
      startAnalysis();
    }

    // Start Web Speech recognition
    if (userId) {
      startSpeechRecognition();
    }
    
    try {
      // 1. Setup Video Recorder with dynamic MIME type selection (prioritizing MP4)
      const mimeTypes = [
        "video/mp4;codecs=h264,aac",
        "video/mp4;codecs=h264",
        "video/mp4",
        "video/webm;codecs=h264,opus",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm"
      ];
      
      let selectedMimeType = "video/webm";
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: selectedMimeType,
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
          const eyeContactAvg = faceAnalysisResultsRef.current?.eyeContactAvg;
          const expressionScoreAvg = faceAnalysisResultsRef.current?.expressionScoreAvg;
          onRecordingComplete(
            videoBlob, 
            audioBlob || videoBlob, 
            eyeContactAvg, 
            expressionScoreAvg
          );
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
    if (isRecording && userId) {
      faceAnalysisResultsRef.current = stopAnalysis();
    }

    // Stop Speech Recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null; // Prevent loop
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

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
        <h2 className="text-xl font-bold mb-2 text-slate-800 dark:text-white">Camera Access Required</h2>
        <p className="text-slate-600 dark:text-zinc-400 text-sm">Please allow camera and microphone access to use SpeakMirror.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 items-center md:items-start justify-center w-full">
      {/* Video & Pacing Wrapper */}
      <div className="flex flex-col gap-4 w-full max-w-sm shrink-0">
        {/* Main Video Card */}
        <div className="glass-panel rounded-[2rem] flex flex-col items-center justify-center w-full max-w-sm relative overflow-hidden aspect-[9/16] max-h-[calc(100vh-120px)] shadow-2xl border border-white/5 group bg-black float-slow interactive-card">
          
          {/* Live Video Feed with Mirror Effect & Beautify Filter */}
          <video 
            ref={videoRef}
            autoPlay 
            playsInline 
            muted 
            className="absolute inset-0 w-full h-full object-cover z-0"
            style={{ 
              transform: 'scaleX(-1)', // Mirror effect
              filter: BEAUTIFY_FILTERS[activeFilter] || BEAUTIFY_FILTERS.none
            }}
          />
          
          {/* Subtle Overlay gradient for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 z-10 pointer-events-none" />

          {/* AI Face Analysis HUD Overlay (Logged-in users only) */}
          {userId && (
            <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 font-mono select-none">
              {/* Top HUD Row */}
              <div className="flex justify-between items-center w-full">
                {/* Model / Recording Status Badge */}
                <div className="px-3 py-1.5 rounded-xl bg-black/45 border border-white/10 backdrop-blur-md flex items-center gap-2 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                  {isFaceLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest animate-pulse">Loading AI Model...</span>
                    </>
                  ) : isFaceReady ? (
                    isRecording ? (
                      <>
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                        <span className="text-[10px] font-extrabold text-red-400 uppercase tracking-widest">RECORDING...</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                        <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest">AI READY</span>
                      </>
                    )
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-zinc-600 rounded-full" />
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">AI INACTIVE</span>
                    </>
                  )}
                </div>
              </div>

              {/* Bottom HUD Telemetry Card */}
              {isFaceReady && (
                <div className="w-full bg-zinc-950/60 backdrop-blur-lg border border-white/10 rounded-2xl p-4 flex flex-col gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-300 mb-16">
                  {/* Telemetry Header */}
                  <div className="flex justify-between items-center text-[9px] text-zinc-400 border-b border-white/5 pb-1.5 font-bold uppercase tracking-widest">
                    <span>// face_telemetry_feed</span>
                    <span className="text-cyan-400 animate-pulse">LIVE</span>
                  </div>
                  
                  {/* Metric 1: Eye Contact */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs text-white">
                      <span className="text-[10px] font-semibold text-zinc-300 tracking-wider">GAZE // EYE_CONTACT</span>
                      <span className="text-cyan-400 font-extrabold text-right drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]">{liveEyeContact}%</span>
                    </div>
                    <div className="w-full bg-zinc-900/80 h-1.5 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.6)] transition-all duration-150 ease-out" 
                        style={{ width: `${liveEyeContact}%` }} 
                      />
                    </div>
                  </div>

                  {/* Metric 2: Expression / Facial Engagement */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs text-white">
                      <span className="text-[10px] font-semibold text-zinc-300 tracking-wider">EXPR // EXPRESSION</span>
                      <span className="text-emerald-400 font-extrabold text-right drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]">{liveExpression}%</span>
                    </div>
                    <div className="w-full bg-zinc-900/80 h-1.5 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.6)] transition-all duration-150 ease-out" 
                        style={{ width: `${liveExpression}%` }} 
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live Filler Counter HUD Overlay */}
          {isRecording && userId && (
            <div className="absolute top-16 right-4 z-20 flex flex-col gap-1 items-end pointer-events-none select-none">
              <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-amber-500/30 backdrop-blur-md flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-extrabold text-amber-400 tracking-widest uppercase">FILLERS: {liveFillerCount}</span>
              </div>
              <span className="text-[8px] text-white/50 tracking-widest uppercase bg-black/35 px-1.5 py-0.5 rounded-md">"um" "uh" "like"</span>
            </div>
          )}

          {/* Pre-session Warm-up Breathing Overlay */}
          <AnimatePresence>
            {showWarmupScreen && userId && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 bg-[#050508]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
              >
                {/* Header */}
                <div className="absolute top-8 left-0 right-0 flex flex-col items-center px-4">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest animate-pulse">// pre_session_focus</span>
                  <h3 className="text-white font-extrabold text-lg mt-1 tracking-tight">Breathing & Warm-up</h3>
                </div>

                {/* Breathing Circle Container */}
                <div className="relative w-48 h-48 flex items-center justify-center my-6">
                  {/* Glowing Ring */}
                  <motion.div 
                    className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500/20 via-sky-500/25 to-emerald-500/20 blur-xl"
                    animate={{
                      scale: breathingState === 'inhale' ? 1.6 : (breathingState === 'hold' ? 1.6 : 1.0)
                    }}
                    transition={{
                      duration: 4,
                      ease: "easeInOut"
                    }}
                  />

                  {/* Animated Breathing Circle */}
                  <motion.div 
                    className="w-32 h-32 rounded-full border-2 border-indigo-400/40 bg-indigo-500/10 backdrop-blur-lg flex flex-col items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.2)]"
                    animate={{
                      scale: breathingState === 'inhale' ? 1.4 : (breathingState === 'hold' ? 1.4 : 1.0)
                    }}
                    transition={{
                      duration: 4,
                      ease: "easeInOut"
                    }}
                  >
                    <span className="text-white text-base font-extrabold tracking-widest uppercase">
                      {breathingState}
                    </span>
                    <span className="text-indigo-300 font-mono text-xl font-bold mt-1">
                      {breathingSeconds}s
                    </span>
                  </motion.div>
                </div>

                {/* Prompt instructions */}
                <div className="max-w-[260px] flex flex-col items-center gap-1.5 mt-4">
                  <p className="text-xs text-white/90 font-light leading-relaxed min-h-[36px]">
                    {breathingState === 'inhale' && "Slowly breathe in, expanding your chest."}
                    {breathingState === 'hold' && "Hold your breath. Keep your mind calm."}
                    {breathingState === 'exhale' && "Exhale slowly, releasing any tension."}
                  </p>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Session starts in {warmupCountdown}s
                  </span>
                </div>

                {/* Skip Button */}
                <button
                  onClick={() => skipWarmup(true)}
                  className="absolute bottom-10 px-6 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/25 text-white/90 hover:text-white text-[11px] font-bold tracking-widest uppercase transition-all duration-200 cursor-pointer"
                >
                  Skip Warm-up
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Visual Conclude Prompt Overlay */}
          <AnimatePresence>
            {showConcludePrompt && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                className="absolute inset-x-4 top-1/3 z-30 mx-auto max-w-[280px] bg-red-950/80 border border-red-500/20 backdrop-blur-md px-4 py-3 rounded-2xl text-center shadow-[0_0_30px_rgba(239,68,68,0.15)] flex flex-col items-center gap-1"
              >
                <div className="flex items-center gap-2 text-red-400 font-extrabold text-xs uppercase tracking-wider">
                  <Bell className="w-3.5 h-3.5 animate-bounce" />
                  Conclude Speech
                </div>
                <p className="text-[11px] text-white/90 font-light leading-relaxed">
                  {timeLimit - bellTiming} seconds remaining! Wrap up your final thoughts.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

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
                className={`pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-md transition-all border ${isAssistEnabled ? 'bg-white text-zinc-950 border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.15)] font-semibold cursor-pointer' : 'bg-black/50 border-white/10 text-white/70 hover:bg-black/80 hover:text-white cursor-pointer'}`}
              >
                <HelpCircle className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Teleprompter</span>
              </button>
            ) : (
              <button 
                onClick={() => setIsAssistEnabled(!isAssistEnabled)}
                className={`pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-md transition-all border ${isAssistEnabled ? 'bg-white text-zinc-950 border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.15)] font-semibold cursor-pointer' : 'bg-black/50 border-white/10 text-white/70 hover:bg-black/80 hover:text-white cursor-pointer'}`}
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
                  className="w-16 h-16 md:w-20 md:h-20 bg-red-600/90 hover:bg-red-500 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all shadow-[0_0_30px_0_rgba(239,68,68,0.3)] hover:shadow-[0_0_40px_0_rgba(239,68,68,0.5)] border border-red-400/30 scale-100 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Square className="w-6 h-6 md:w-8 md:h-8 fill-current" />
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white rounded-full flex items-center justify-center transition-all shadow-[0_4px_20px_rgba(2,132,199,0.3)] hover:shadow-[0_4px_30px_rgba(2,132,199,0.5)] border border-white/20 scale-100 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Mic className="w-6 h-6 md:w-8 md:h-8" />
                </button>
              )
            )}
          </div>
        </div>

        {/* Pacing Speedometer Bar */}
        <AnimatePresence>
          {isRecording && userId && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="glass-panel w-full p-4 rounded-2xl bg-zinc-950/60 border border-white/5 backdrop-blur-md flex flex-col gap-2.5 text-left"
            >
              <div className="flex justify-between items-center text-[10px] text-zinc-400 font-bold uppercase tracking-widest font-mono">
                <span>// live_pacing_indicator</span>
                <span className={`${pacingStatus === 'good' ? 'text-emerald-400' : pacingStatus === 'slow' ? 'text-cyan-400' : 'text-amber-400'} font-extrabold`}>
                  {liveWpm} WPM // {pacingStatus.toUpperCase()}
                </span>
              </div>
              
              {/* Horizontal Speedometer Bar */}
              <div className="relative h-2 w-full bg-zinc-900 rounded-full border border-white/5 overflow-visible mt-1">
                {/* Slow zone */}
                <div className="absolute left-0 top-0 bottom-0 w-[31.25%] bg-gradient-to-r from-cyan-500/40 to-blue-500/40 rounded-l-full border-r border-white/10" />
                {/* Good zone */}
                <div className="absolute left-[31.25%] top-0 bottom-0 w-[25%] bg-gradient-to-r from-emerald-500/50 to-teal-500/50 border-r border-white/10" />
                {/* Fast zone */}
                <div className="absolute left-[56.25%] top-0 bottom-0 w-[43.75%] bg-gradient-to-r from-amber-500/40 to-red-500/40 rounded-r-full" />
                
                {/* Needle / Pointer */}
                <motion.div 
                  className="absolute -top-1 w-4 h-4 bg-white rounded-full border border-zinc-950 shadow-[0_0_8px_rgba(255,255,255,0.8)] -ml-2 flex items-center justify-center cursor-default"
                  animate={{ left: `${Math.min(Math.max((liveWpm - 60) / (220 - 60) * 100, 0), 100)}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 14 }}
                >
                  <div className="w-1.5 h-1.5 bg-zinc-950 rounded-full" />
                </motion.div>
              </div>
              
              <div className="flex justify-between text-[8px] text-zinc-500 font-mono tracking-wider font-semibold">
                <span>SLOW (&lt;110)</span>
                <span>STEADY (110-150)</span>
                <span>FAST (&gt;150)</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Side Panel: Topic display */}
      <div className="w-full md:w-64 shrink-0 flex flex-col gap-4 mt-2 md:mt-0 float-medium interactive-card">
        {/* Beautify Filters (Available to all users) */}
        <div className="glass-panel p-5 md:p-6 rounded-3xl bg-white/[0.01] border-white/5 text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Beautify Filters
          </span>
          <div className="mt-3 flex flex-col gap-2">
            <select
              value={activeFilter}
              onChange={(e) => {
                const val = e.target.value;
                setActiveFilter(val);
                localStorage.setItem("speak_mirror_beautify_filter", val);
              }}
              disabled={isRecording}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 hover:border-slate-300 text-xs text-slate-700 dark:bg-white/5 dark:border-white/10 dark:hover:border-white/20 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-[#5B7C99] cursor-pointer"
            >
              <option value="none" className="bg-white text-slate-800 dark:bg-[#09090d] dark:text-white">Original</option>
              <option value="studio" className="bg-white text-slate-800 dark:bg-[#09090d] dark:text-white">Studio Glow ✨</option>
              <option value="warm" className="bg-white text-slate-800 dark:bg-[#09090d] dark:text-white">Warm Golden ☀️</option>
              <option value="cool" className="bg-white text-slate-800 dark:bg-[#09090d] dark:text-white">Nordic Cool ❄️</option>
              <option value="smooth" className="bg-white text-slate-800 dark:bg-[#09090d] dark:text-white">Soft Focus 🌸</option>
            </select>
            <span className="text-[9px] text-slate-500 dark:text-zinc-400 font-light leading-snug">
              Enhance video lighting and clarity. Applies instantly to your practice and shareable playback.
            </span>
          </div>
        </div>


        {/* Alert Settings (Only visible when logged in) */}
        {userId && (
          <div className="glass-panel p-5 md:p-6 rounded-3xl bg-white/[0.01] border-white/5 text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Alert Settings
            </span>
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex justify-between text-xs text-slate-700 dark:text-zinc-300 font-medium">
                <span>Bell Alarm:</span>
                <span className="text-[#5B7C99] dark:text-indigo-400 font-bold">{bellTiming}s</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max={timeLimit - 5} 
                value={bellTiming}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setBellTiming(val);
                  localStorage.setItem("speak_mirror_bell_timing", val.toString());
                }}
                disabled={isRecording}
                className="w-full h-1 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#5B7C99] dark:accent-indigo-500 mt-1"
              />
              <span className="text-[9px] text-slate-500 dark:text-zinc-400 font-light leading-snug">
                Plays a chime and prompts you to conclude your speech at {bellTiming} seconds ({timeLimit - bellTiming}s remaining).
              </span>
            </div>
          </div>
        )}
        <div className="glass-panel p-5 md:p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              {mode === "reading" ? "Reading Practice" : (mode === "warmup" ? "Daily Warm-up" : "Your Topic")}
            </span>
            {mode === "freeform" && !taskTopic && (
              <button 
                onClick={() => fetchDynamicTopic(false)}
                disabled={isRecording || isLoadingTopic}
                className="p-1.5 bg-slate-100 border border-slate-200 hover:bg-slate-200 hover:text-slate-800 text-slate-500 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:hover:text-white dark:text-zinc-400 transition-colors rounded-full disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title="Shuffle Topic"
              >
                <Shuffle className={`w-3.5 h-3.5 ${isLoadingTopic ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
          <p className="font-semibold text-sm md:text-base leading-relaxed text-slate-800 dark:text-white">
            {topic}
          </p>
        </div>

        {mode === "warmup" && wordOfTheDay && (
          <div className="glass-panel p-5 md:p-6 rounded-3xl bg-indigo-500/[0.02] border-[#5B7C99]/15 dark:border-indigo-500/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B7C99] dark:text-indigo-400">
              Vocabulary Word
            </span>
            <p className="font-extrabold text-lg text-slate-800 dark:text-white mt-1.5 leading-tight">
              {wordOfTheDay}
            </p>
            {wordDefinition && (
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-light mt-1.5 leading-relaxed">
                {wordDefinition}
              </p>
            )}
          </div>
        )}

        {mode === "warmup" && tips && tips.length > 0 ? (
          <div className="glass-panel p-5 md:p-6 rounded-3xl bg-white/[0.01] border-white/5 hidden md:block">
            <h3 className="text-xs font-bold mb-2 flex items-center gap-2 text-slate-800 dark:text-white">
              <Lightbulb className="w-4 h-4 text-slate-500 dark:text-zinc-300 animate-pulse" />
              Warm-up Tips
            </h3>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed font-light list-disc list-inside">
              {tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="glass-panel p-5 md:p-6 rounded-3xl bg-white/[0.01] border-white/5 hidden md:block">
            <h3 className="text-xs font-bold mb-2 flex items-center gap-2 text-slate-800 dark:text-white">
              <Lightbulb className="w-4 h-4 text-slate-500 dark:text-zinc-300 animate-pulse" />
              Pro Tip
            </h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed font-light">
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
