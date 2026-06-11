"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2, Video, Lightbulb, HelpCircle, Shuffle, Bell, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BEAUTIFY_FILTERS } from "@/lib/filters";
import { useFaceAnalysis } from "@/hooks/useFaceAnalysis";
import { FocusPill } from "./session/FocusPill";
import { PreSessionModal } from "./session/PreSessionModal";

interface RecorderProps {
  onRecordingComplete: (
    videoBlob: Blob,
    audioBlob: Blob,
    eyeContactAvg?: number,
    expressionScoreAvg?: number,
    exportVideoBlob?: Blob,
    fillerLog?: any[],
    avgWpm?: number,
    pacingLog?: any[]
  ) => void;
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
  autoStart?: boolean;
  focusMetric?: string | null;
  showWarmup?: boolean;
  streak?: number;
  isFirstSession?: boolean;
  profileGoal?: string | null;
  profileDuration?: number;
}

// IndexedDB helpers for zero-copy streaming
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not supported"));
      return;
    }
    const request = indexedDB.open("speakMirrorDB", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("storageChunks")) {
        db.createObjectStore("storageChunks", { autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("exportChunks")) {
        db.createObjectStore("exportChunks", { autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("audioChunks")) {
        db.createObjectStore("audioChunks", { autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const clearDB = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction(["storageChunks", "exportChunks", "audioChunks"], "readwrite");
    tx.objectStore("storageChunks").clear();
    tx.objectStore("exportChunks").clear();
    tx.objectStore("audioChunks").clear();
  } catch (err) {
    console.warn("Failed to clear IndexedDB:", err);
  }
};

const writeChunk = (storeName: string, chunk: Blob): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      store.add(chunk);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } catch (err) {
      reject(err);
    }
  });
};

const getChunks = (storeName: string): Promise<Blob[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (err) {
      reject(err);
    }
  });
};

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
  tips,
  autoStart = false,
  focusMetric,
  showWarmup = false,
  streak = 0,
  isFirstSession = false,
  profileGoal = null,
  profileDuration = 1
}: RecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // Camera & Countdown states
  const [cameraLoaded, setCameraLoaded] = useState(false);
  const [hasStartedCountdown, setHasStartedCountdown] = useState(false);
  
  // Warmup state
  const [showWarmupModal, setShowWarmupModal] = useState(false);
  const [hasWarmedUpState, setHasWarmedUpState] = useState(false);
  
  const [topic, setTopic] = useState("Generating topic...");
  const [bullets, setBullets] = useState<{label: string, text: string}[]>([]);
  const [isLoadingTopic, setIsLoadingTopic] = useState(true);
  const [isAssistEnabled, setIsAssistEnabled] = useState(false);

  // Beautify filter preference (default: studio glow)
  const [activeFilter, setActiveFilter] = useState("studio");
  
  // Custom Bell Alert Timing (default: 75 seconds, i.e. 15 seconds remaining)
  const [bellTiming, setBellTiming] = useState(75);
  const hasTriggeredBellRef = useRef(false);

  // High-frequency UI Refs for zero-latency DOM updates
  const timeLeftRef = useRef<number>(timeLimit);
  const timerContainerRef = useRef<HTMLDivElement | null>(null);
  const timerTextRef = useRef<HTMLSpanElement | null>(null);
  const liveFillerContainerRef = useRef<HTMLDivElement | null>(null);
  const liveFillerTextRef = useRef<HTMLSpanElement | null>(null);
  const livePacingContainerRef = useRef<HTMLDivElement | null>(null);
  const liveWpmTextRef = useRef<HTMLSpanElement | null>(null);
  const needleRef = useRef<HTMLDivElement | null>(null);
  const gazeWarningRef = useRef<HTMLDivElement | null>(null);
  const coachNudgeRef = useRef<HTMLDivElement | null>(null);
  const coachNudgeTextRef = useRef<HTMLSpanElement | null>(null);
  const eyeContactTextRef = useRef<HTMLSpanElement | null>(null);
  const eyeContactBarRef = useRef<HTMLDivElement | null>(null);
  const expressionTextRef = useRef<HTMLSpanElement | null>(null);
  const expressionBarRef = useRef<HTMLDivElement | null>(null);
  const concludePromptRef = useRef<HTMLDivElement | null>(null);
  const telemetryCardRef = useRef<HTMLDivElement | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
  const exportRecorderRef = useRef<MediaRecorder | null>(null);
  const exportChunksRef = useRef<BlobPart[]>([]);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const storageWritePromisesRef = useRef<Promise<void>[]>([]);
  const exportWritePromisesRef = useRef<Promise<void>[]>([]);
  const audioWritePromisesRef = useRef<Promise<void>[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const downscaleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const storageStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const exportStreamRef = useRef<MediaStream | null>(null);
  // Speech recognition refs
  const recognitionRef = useRef<any>(null);
  const wordCountRef = useRef<number>(0);

  const {
    isLoading: isFaceLoading,
    isModelReady: isFaceReady,
    startAnalysis,
    stopAnalysis,
  } = useFaceAnalysis(videoRef, !!userId, (metrics) => {
    // High-frequency telemetry direct DOM updates
    if (eyeContactTextRef.current) {
      eyeContactTextRef.current.textContent = metrics.isBlinking ? 'BLINKING...' : `${metrics.eyeContact}%`;
      eyeContactTextRef.current.className = metrics.gazeWarning ? 'text-red-400 font-extrabold text-right drop-shadow-[0_0_6px_rgba(239,68,68,0.4)]' : 'text-cyan-400 font-extrabold text-right drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]';
    }
    if (eyeContactBarRef.current) {
      eyeContactBarRef.current.style.width = `${metrics.isBlinking ? 0 : metrics.eyeContact}%`;
      if (metrics.gazeWarning) {
        eyeContactBarRef.current.className = 'h-full bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.6)] transition-all duration-150 ease-out';
      } else {
        eyeContactBarRef.current.className = 'h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.6)] transition-all duration-150 ease-out';
      }
    }

    if (expressionTextRef.current) {
      expressionTextRef.current.textContent = `${metrics.expression}%`;
    }
    if (expressionBarRef.current) {
      expressionBarRef.current.style.width = `${metrics.expression}%`;
    }

    if (gazeWarningRef.current) {
      gazeWarningRef.current.style.display = (metrics.gazeWarning && !metrics.isBlinking && isRecordingRef.current) ? 'flex' : 'none';
    }
  });

  const faceAnalysisResultsRef = useRef<{ eyeContactAvg: number; expressionScoreAvg: number } | null>(null);

  // Real-time AI session telemetry and Web Worker refs
  const [hasNudgedFiller, setHasNudgedFiller] = useState(false);
  const [hasNudgedPacing, setHasNudgedPacing] = useState(false);

  const transcriptWorkerRef = useRef<Worker | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pacingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const recordingStartTimeRef = useRef<number>(0);
  const fillerLogRef = useRef<any[]>([]);
  const pacingLogRef = useRef<any[]>([]);
  const avgWpmRef = useRef<number>(130);
  const currentRollingWpmRef = useRef<number>(130);
  const fastPacingCountRef = useRef<number>(0);

  // Initialize camera preview on mount (runs once)
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 48000,
          }
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

  const drawWatermark = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const text = "SpeakMirror";
    
    // Scale font size proportionally to canvas width
    const fontSize = Math.max(14, Math.round(width * 0.015)); 
    ctx.font = `bold ${fontSize}px "Plus Jakarta Sans", "Inter", sans-serif`;
    
    // Measure text to size background pill
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;

    const paddingX = Math.round(fontSize * 0.8);
    const paddingY = Math.round(fontSize * 0.4);
    const pillWidth = textWidth + paddingX * 2;
    const pillHeight = textHeight + paddingY * 2;
    
    const marginRight = Math.max(16, Math.round(width * 0.04));
    const marginBottom = Math.max(16, Math.round(height * 0.04));
    const x = width - pillWidth - marginRight;
    const y = height - pillHeight - marginBottom;

    // Draw pill background
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    const radius = pillHeight / 2;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, pillWidth, pillHeight, radius);
    } else {
      ctx.rect(x, y, pillWidth, pillHeight);
    }
    ctx.fill();

    // Draw text
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + pillWidth / 2, y + pillHeight / 2 + 1);
  };

  const startWatermarkRenderLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const render = () => {
      if (!isRecordingRef.current) return;
      const ctx = canvas.getContext("2d");
      if (ctx && video.readyState >= 2) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
        }
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        drawWatermark(ctx, canvas.width, canvas.height);
      }
      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    animationFrameIdRef.current = requestAnimationFrame(render);
  };



  // Sync timer text when timeLimit or mode changes
  useEffect(() => {
    if (timerTextRef.current) {
      timerTextRef.current.textContent = formatTime(timeLimit);
    }
  }, [timeLimit, mode]);

  // Trigger recording automatically if autoStart is true and camera is loaded
  useEffect(() => {
    if (autoStart && cameraLoaded && !hasStartedCountdown && !isRecording && !isProcessing) {
      setHasStartedCountdown(true);
      startRecordingActual();
    }
  }, [autoStart, cameraLoaded, hasStartedCountdown, isRecording, isProcessing]);

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
      const envelope = await res.json();
      // Unwrap standard successResponse envelope { success: true, data: { topic, bullets } }
      const data = envelope.success && envelope.data ? envelope.data : envelope;
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

    // Spawn Speech Helper Web Worker inside startSpeechRecognition
    const worker = new Worker(
      new URL("../workers/transcriptWorker.ts", import.meta.url),
      { type: "module" }
    );
    transcriptWorkerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const { fillerCount, fillerLog, rollingWpm, avgWpm, wordCount } = e.data;

      currentRollingWpmRef.current = rollingWpm;
      avgWpmRef.current = avgWpm;
      wordCountRef.current = wordCount;
      fillerLogRef.current = fillerLog;

      if (liveFillerTextRef.current) {
        liveFillerTextRef.current.textContent = `FILLERS: ${fillerCount}`;
      }

      let status: "slow" | "good" | "fast" = "good";
      if (rollingWpm < 110) status = "slow";
      else if (rollingWpm > 150) status = "fast";

      if (liveWpmTextRef.current) {
        liveWpmTextRef.current.textContent = `${rollingWpm} WPM // ${status.toUpperCase()}`;
        if (status === "good") {
          liveWpmTextRef.current.className = "text-emerald-400 font-extrabold";
        } else if (status === "slow") {
          liveWpmTextRef.current.className = "text-cyan-400 font-extrabold";
        } else {
          liveWpmTextRef.current.className = "text-amber-400 font-extrabold";
        }
      }

      if (needleRef.current) {
        const percent = Math.min(Math.max((rollingWpm - 60) / (220 - 60) * 100, 0), 100);
        needleRef.current.style.left = `${percent}%`;
      }

      // Mid-session coach nudges (C4)
      if (fillerCount > 10 && !hasNudgedFiller) {
        setHasNudgedFiller(true);
        if (coachNudgeRef.current && coachNudgeTextRef.current) {
          coachNudgeTextRef.current.textContent = "Too many fillers — try pausing for transition";
          coachNudgeRef.current.style.display = 'flex';
        }
        setTimeout(() => {
          if (coachNudgeRef.current) {
            coachNudgeRef.current.style.display = 'none';
          }
        }, 4000);
      }

      if (status === "fast") {
        fastPacingCountRef.current += 1;
        if (fastPacingCountRef.current >= 5 && !hasNudgedPacing) {
          setHasNudgedPacing(true);
          if (coachNudgeRef.current && coachNudgeTextRef.current) {
            coachNudgeTextRef.current.textContent = "Pacing is fast — take a deep breath and slow down";
            coachNudgeRef.current.style.display = 'flex';
          }
          setTimeout(() => {
            if (coachNudgeRef.current) {
              coachNudgeRef.current.style.display = 'none';
            }
          }, 4000);
        }
      } else {
        fastPacingCountRef.current = 0;
      }
    };

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
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
          if (transcriptWorkerRef.current) {
            transcriptWorkerRef.current.postMessage({
              text: cleanText,
              startTime: recordingStartTimeRef.current
            });
          }
        }, 300); // 300ms debounce
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
    if (showWarmup && !hasWarmedUpState) {
      setShowWarmupModal(true);
    } else {
      startRecordingActual();
    }
  };

  const startRecordingActual = async () => {
    if (!streamRef.current) return;
    setHasStartedCountdown(false);
    hasTriggeredBellRef.current = false;
    wordCountRef.current = 0;

    // Reset coaching nudges and stats logs
    setHasNudgedFiller(false);
    setHasNudgedPacing(false);
    recordingStartTimeRef.current = Date.now();
    fillerLogRef.current = [];
    pacingLogRef.current = [];
    avgWpmRef.current = 130;
    currentRollingWpmRef.current = 130;
    fastPacingCountRef.current = 0;

    // Start 3-second sample interval for pacing timeline data
    if (pacingIntervalRef.current) {
      clearInterval(pacingIntervalRef.current);
    }
    pacingIntervalRef.current = setInterval(() => {
      const elapsed = Math.round((Date.now() - recordingStartTimeRef.current) / 1000);
      pacingLogRef.current.push({
        wpm: currentRollingWpmRef.current,
        timestamp: elapsed
      });
    }, 3000);

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
      // Clear IndexedDB before starting new recording
      await clearDB().catch(() => {});

      // 1. Setup Video Recorders with dynamic MIME type selection (prioritizing VP9)
      const mimeTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4;codecs=h264,aac",
        "video/mp4;codecs=h264",
        "video/mp4"
      ];
      
      let selectedMimeType = "video/webm";
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      // Verify preview canvas is ready
      if (!canvasRef.current) {
        throw new Error("Preview canvas not ready");
      }

      // Start background canvas watermark render loop
      isRecordingRef.current = true;
      startWatermarkRenderLoop();

      // Create a downscaled 640x360 15fps canvas stream for the storage recorder
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      
      const drawFrame = () => {
        if (canvasRef.current && ctx) {
          // Draw from watermarked canvasRef instead of raw videoRef
          ctx.drawImage(canvasRef.current, 0, 0, 640, 360);
        }
      };

      // Draw frames on a 15fps interval (~66.7ms)
      const downscaleInterval = setInterval(drawFrame, 1000 / 15);
      downscaleIntervalRef.current = downscaleInterval;

      // Extract low resolution video track
      const lowResVideoStream = canvas.captureStream(15);
      const lowResVideoTrack = lowResVideoStream.getVideoTracks()[0];
      const audioTrack = streamRef.current?.getAudioTracks()[0];

      // Combine video track and audio track
      const storageStream = new MediaStream(audioTrack ? [lowResVideoTrack, audioTrack] : [lowResVideoTrack]);
      storageStreamRef.current = storageStream;

      // Storage Recorder (low bitrate: 400 Kbps video, 64 Kbps audio, downscaled 360p stream)
      const mediaRecorder = new MediaRecorder(storageStream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 400000,
        audioBitsPerSecond: 64000
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      storageWritePromisesRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          const p = writeChunk("storageChunks", e.data).catch(console.error) as Promise<void>;
          storageWritePromisesRef.current.push(p);
        }
      };

      // Capture high-res watermarked canvas stream at 30fps
      const canvasExportStream = canvasRef.current.captureStream(30);
      const canvasExportVideoTrack = canvasExportStream.getVideoTracks()[0];
      
      // Combine canvas video track and original audio track
      const exportStream = new MediaStream(audioTrack ? [canvasExportVideoTrack, audioTrack] : [canvasExportVideoTrack]);
      exportStreamRef.current = exportStream;

      // Export Recorder (high quality: 2.5 Mbps video, 128 Kbps audio, watermarked 1080p stream)
      const exportRecorder = new MediaRecorder(exportStream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 128000
      });
      exportRecorderRef.current = exportRecorder;
      exportChunksRef.current = [];
      exportWritePromisesRef.current = [];

      exportRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          const p = writeChunk("exportChunks", e.data).catch(console.error) as Promise<void>;
          exportWritePromisesRef.current.push(p);
        }
      };

      // 2. Setup Audio-Only Recorder for lightweight API analysis
      let audioRecorder: MediaRecorder | null = null;
      audioChunksRef.current = [];
      audioWritePromisesRef.current = [];
      
      try {
        const audioTracks = streamRef.current!.getAudioTracks();
        if (audioTracks.length > 0) {
          const audioStream = new MediaStream(audioTracks);
          let audioMime = 'audio/webm;codecs=opus';
          if (!MediaRecorder.isTypeSupported(audioMime)) {
            audioMime = 'audio/webm';
          }
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
              const p = writeChunk("audioChunks", e.data).catch(console.error) as Promise<void>;
              audioWritePromisesRef.current.push(p);
            }
          };
        }
      } catch (audioErr) {
        console.warn("Failed to initialize separate audio recorder:", audioErr);
      }

      // Synchronize all recorder stops
      let storageBlob: Blob | null = null;
      let exportBlob: Blob | null = null;
      let audioBlob: Blob | null = null;

      const checkComplete = () => {
        const hasValidAudio = audioBlob && audioBlob.size > 500;
        if (storageBlob && exportBlob && (hasValidAudio || !audioRecorder || (audioBlob && audioBlob.size <= 500))) {
          const eyeContactAvg = faceAnalysisResultsRef.current?.eyeContactAvg;
          const expressionScoreAvg = faceAnalysisResultsRef.current?.expressionScoreAvg;
          
          console.log(`[Recorder] Recording complete. Storage blob size: ${storageBlob.size}, Audio blob size: ${audioBlob?.size || 0}. Has valid audio: ${hasValidAudio}`);

          onRecordingComplete(
            storageBlob, 
            hasValidAudio && audioBlob ? audioBlob : storageBlob, 
            eyeContactAvg, 
            expressionScoreAvg,
            exportBlob,
            fillerLogRef.current,
            avgWpmRef.current,
            pacingLogRef.current
          );
          // Clear IndexedDB records asynchronously
          clearDB().catch(console.error);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          // Wait for all chunk writing promises to complete to resolve the race condition
          await Promise.all(storageWritePromisesRef.current);
          const dbChunks = await getChunks("storageChunks");
          storageBlob = new Blob(dbChunks, { type: selectedMimeType });
        } catch (err) {
          console.error("Failed to read storage chunks from IndexedDB:", err);
          storageBlob = new Blob([], { type: selectedMimeType });
        }
        checkComplete();
      };

      exportRecorder.onstop = async () => {
        try {
          // Wait for all chunk writing promises to complete to resolve the race condition
          await Promise.all(exportWritePromisesRef.current);
          const dbChunks = await getChunks("exportChunks");
          exportBlob = new Blob(dbChunks, { type: selectedMimeType });
        } catch (err) {
          console.error("Failed to read export chunks from IndexedDB:", err);
          exportBlob = new Blob([], { type: selectedMimeType });
        }
        checkComplete();
      };

      if (audioRecorder) {
        audioRecorder.onstop = async () => {
          const audioMimeType = audioRecorder?.mimeType || "audio/webm";
          try {
            // Wait for all chunk writing promises to complete to resolve the race condition
            await Promise.all(audioWritePromisesRef.current);
            const dbChunks = await getChunks("audioChunks");
            audioBlob = new Blob(dbChunks, { type: audioMimeType });
          } catch (err) {
            console.error("Failed to read audio chunks from IndexedDB:", err);
            audioBlob = new Blob([], { type: audioMimeType });
          }
          checkComplete();
        };
      }

      // Collect chunks every 5s (reduces callback frequency overhead by 5x)
      mediaRecorder.start(5000);
      exportRecorder.start(5000);
      if (audioRecorder) {
        audioRecorder.start(5000);
      }
      
      setIsRecording(true);
      
      // Initialize zero-latency timer
      timeLeftRef.current = timeLimit;
      if (timerContainerRef.current) {
        timerContainerRef.current.style.display = 'flex';
      }
      if (timerTextRef.current) {
        timerTextRef.current.textContent = formatTime(timeLimit);
      }
      
      // Show telemetry controls if active
      if (userId) {
        if (liveFillerContainerRef.current) {
          liveFillerContainerRef.current.style.display = 'flex';
        }
        if (liveFillerTextRef.current) {
          liveFillerTextRef.current.textContent = "FILLERS: 0";
        }
        if (livePacingContainerRef.current) {
          livePacingContainerRef.current.style.display = 'flex';
        }
        if (liveWpmTextRef.current) {
          liveWpmTextRef.current.textContent = "130 WPM // GOOD";
          liveWpmTextRef.current.className = "text-emerald-400 font-extrabold";
        }
        if (needleRef.current) {
          needleRef.current.style.left = "43.75%";
        }
      }

      timerIntervalRef.current = setInterval(() => {
        if (timeLeftRef.current > 0) {
          timeLeftRef.current -= 1;
          const elapsed = timeLimit - timeLeftRef.current;
          
          if (timerTextRef.current) {
            timerTextRef.current.textContent = formatTime(timeLeftRef.current);
          }
          
          // Update WPM pacing metrics dynamically
          const elapsedSeconds = elapsed;
          const elapsedMinutes = elapsedSeconds / 60;
          let wpm = 130;
          let status: "slow" | "good" | "fast" = "good";
          
          if (elapsedSeconds > 3 && wordCountRef.current > 0) {
            wpm = Math.round(wordCountRef.current / elapsedMinutes);
          }
          currentRollingWpmRef.current = wpm;
          
          if (wpm < 110) {
            status = "slow";
          } else if (wpm <= 150) {
            status = "good";
          } else {
            status = "fast";
          }

          if (liveWpmTextRef.current) {
            liveWpmTextRef.current.textContent = `${wpm} WPM // ${status.toUpperCase()}`;
            if (status === "good") {
              liveWpmTextRef.current.className = "text-emerald-400 font-extrabold";
            } else if (status === "slow") {
              liveWpmTextRef.current.className = "text-cyan-400 font-extrabold";
            } else {
              liveWpmTextRef.current.className = "text-amber-400 font-extrabold";
            }
          }

          if (needleRef.current) {
            const percent = Math.min(Math.max((wpm - 60) / (220 - 60) * 100, 0), 100);
            needleRef.current.style.left = `${percent}%`;
          }

          if (elapsed === bellTiming && !hasTriggeredBellRef.current) {
            hasTriggeredBellRef.current = true;
            playBellSound();
            if (concludePromptRef.current) {
              concludePromptRef.current.style.display = 'flex';
            }
            setTimeout(() => {
              if (concludePromptRef.current) {
                concludePromptRef.current.style.display = 'none';
              }
            }, 4000);
          }
        } else {
          stopRecording();
        }
      }, 1000);

    } catch (err) {
      console.error("Error starting recording", err);
      alert("There was an error starting the recording. Your browser might not support the required video format.");
    }
  };

  function stopRecording() {
    const wasRecording = isRecordingRef.current;
    isRecordingRef.current = false;

    if (wasRecording && userId) {
      faceAnalysisResultsRef.current = stopAnalysis();
    }

    // Stop downscaled loop interval and canvas track
    if (downscaleIntervalRef.current) {
      clearInterval(downscaleIntervalRef.current);
      downscaleIntervalRef.current = null;
    }
    if (storageStreamRef.current) {
      storageStreamRef.current.getVideoTracks().forEach(track => track.stop());
      storageStreamRef.current = null;
    }
    if (exportStreamRef.current) {
      exportStreamRef.current.getVideoTracks().forEach(track => track.stop());
      exportStreamRef.current = null;
    }

    // Stop background canvas rendering loop
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    // Stop timer interval
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Hide DOM containers
    if (timerContainerRef.current) {
      timerContainerRef.current.style.display = 'none';
    }
    if (liveFillerContainerRef.current) {
      liveFillerContainerRef.current.style.display = 'none';
    }
    if (livePacingContainerRef.current) {
      livePacingContainerRef.current.style.display = 'none';
    }
    if (concludePromptRef.current) {
      concludePromptRef.current.style.display = 'none';
    }
    if (coachNudgeRef.current) {
      coachNudgeRef.current.style.display = 'none';
    }
    if (gazeWarningRef.current) {
      gazeWarningRef.current.style.display = 'none';
    }

    // Stop Speech Recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null; // Prevent loop
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    // Terminate Web Workers and clear timers
    if (transcriptWorkerRef.current) {
      transcriptWorkerRef.current.terminate();
      transcriptWorkerRef.current = null;
    }
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    if (pacingIntervalRef.current) {
      clearInterval(pacingIntervalRef.current);
      pacingIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error("Error stopping storage video recorder:", err);
      }
    }
    if (exportRecorderRef.current && exportRecorderRef.current.state === "recording") {
      try {
        exportRecorderRef.current.stop();
      } catch (err) {
        console.error("Error stopping export video recorder:", err);
      }
    }
    if (audioRecorderRef.current && audioRecorderRef.current.state === "recording") {
      try {
        audioRecorderRef.current.stop();
      } catch (err) {
        console.error("Error stopping audio recorder:", err);
      }
    }
    setIsRecording(false);
  }

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
          
          {/* Live Video Feed (Visible camera preview mirrored in hardware, zero copy) */}
          <video 
            ref={videoRef}
            autoPlay 
            playsInline 
            muted 
            className="absolute inset-0 w-full h-full object-cover z-0"
            style={{ 
              transform: 'scaleX(-1) translateZ(0)',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              filter: BEAUTIFY_FILTERS[activeFilter] || BEAUTIFY_FILTERS.none,
              opacity: cameraLoaded ? 1 : 0,
              transition: 'opacity 1s ease-out'
            }}
            onPlay={() => setCameraLoaded(true)}
            onLoadedMetadata={() => setCameraLoaded(true)}
          />
          
          {/* Hidden Canvas used for watermark processing inside background recorder loops only */}
          <canvas 
            ref={canvasRef}
            className="hidden"
            style={{ display: "none" }}
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
                <div ref={telemetryCardRef} className="w-full bg-zinc-950/60 backdrop-blur-lg border border-white/10 rounded-2xl p-4 flex flex-col gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-300 mb-16">
                  {/* Telemetry Header */}
                  <div className="flex justify-between items-center text-[9px] text-zinc-400 border-b border-white/5 pb-1.5 font-bold uppercase tracking-widest">
                    <span>// face_telemetry_feed</span>
                    <span className="text-cyan-400 animate-pulse">LIVE</span>
                  </div>
                  
                  {/* Metric 1: Eye Contact */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs text-white">
                      <span className="text-[10px] font-semibold text-zinc-300 tracking-wider">GAZE // EYE_CONTACT</span>
                      <span ref={eyeContactTextRef} className="text-cyan-400 font-extrabold text-right drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]">
                        100%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-900/80 h-1.5 rounded-full overflow-hidden border border-white/5">
                      <div 
                        ref={eyeContactBarRef}
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.6)] transition-all duration-150 ease-out" 
                        style={{ width: '100%' }} 
                      />
                    </div>
                  </div>

                  {/* Metric 2: Expression / Facial Engagement */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs text-white">
                      <span className="text-[10px] font-semibold text-zinc-300 tracking-wider">EXPR // EXPRESSION</span>
                      <span ref={expressionTextRef} className="text-emerald-400 font-extrabold text-right drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]">50%</span>
                    </div>
                    <div className="w-full bg-zinc-900/80 h-1.5 rounded-full overflow-hidden border border-white/5">
                      <div 
                        ref={expressionBarRef}
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.6)] transition-all duration-150 ease-out" 
                        style={{ width: '50%' }} 
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live Filler Counter HUD Overlay */}
          <div 
            ref={liveFillerContainerRef}
            className="absolute top-16 right-4 z-20 flex-col gap-1 items-end pointer-events-none select-none"
            style={{ display: 'none' }}
          >
            <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-amber-500/30 backdrop-blur-md flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span ref={liveFillerTextRef} className="text-[10px] font-extrabold text-amber-400 tracking-widest uppercase">FILLERS: 0</span>
            </div>
            <span className="text-[8px] text-white/50 tracking-widest uppercase bg-black/35 px-1.5 py-0.5 rounded-md">"um" "uh" "like"</span>
          </div>

          {/* Debounced Gaze Warning (Look at Camera) */}
          <div
            ref={gazeWarningRef}
            className="absolute inset-x-4 top-24 z-30 mx-auto max-w-[200px] bg-red-950/90 border border-red-500/30 backdrop-blur-md px-3.5 py-2 rounded-xl text-center shadow-[0_0_20px_rgba(239,68,68,0.25)] flex items-center justify-center gap-2"
            style={{ display: 'none' }}
          >
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
            <span className="text-[10px] font-extrabold text-red-400 uppercase tracking-widest font-mono">
              Look at camera
            </span>
          </div>

          {/* Real-time Coach Nudges HUD overlay */}
          <div
            ref={coachNudgeRef}
            className="absolute inset-x-4 bottom-32 z-30 mx-auto max-w-[280px] bg-indigo-950/90 border border-indigo-500/30 backdrop-blur-md px-3.5 py-2.5 rounded-xl text-center shadow-[0_0_20px_rgba(99,102,241,0.25)] flex items-center justify-center gap-2 pointer-events-none"
            style={{ display: 'none' }}
          >
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse shrink-0" />
            <span ref={coachNudgeTextRef} className="text-[10px] font-extrabold text-indigo-200 tracking-wider font-mono">
              Nudge
            </span>
          </div>

          {/* Countdown Overlay removed */}

          {/* Warmup Modal overlay */}
          {showWarmupModal && (
            <PreSessionModal
              focusMetric={focusMetric || null}
              goal={profileGoal || null}
              experienceLevel={userLevel || null}
              practiceDuration={profileDuration || 1}
              streak={streak || 0}
              taskTopic={taskTopic || "Free Practice"}
              isFirstSession={isFirstSession || false}
              onStartRecording={() => {
                setShowWarmupModal(false);
                setHasWarmedUpState(true);
                startRecordingActual();
              }}
              onClose={() => {
                setShowWarmupModal(false);
              }}
            />
          )}

          {/* Persistent Focus Pill during active recording */}
          {isRecording && !isProcessing && (
            <FocusPill focusMetric={focusMetric || null} />
          )}

          {/* Visual Conclude Prompt Overlay */}
          <div
            ref={concludePromptRef}
            className="absolute inset-x-4 top-1/3 z-30 mx-auto max-w-[280px] bg-red-950/80 border border-red-500/20 backdrop-blur-md px-4 py-3 rounded-2xl text-center shadow-[0_0_30px_rgba(239,68,68,0.15)] flex flex-col items-center gap-1"
            style={{ display: 'none' }}
          >
            <div className="flex items-center gap-2 text-red-400 font-extrabold text-xs uppercase tracking-wider">
              <Bell className="w-3.5 h-3.5 animate-bounce" />
              Conclude Speech
            </div>
            <p className="text-[11px] text-white/90 font-light leading-relaxed">
              {timeLimit - bellTiming} seconds remaining! Wrap up your final thoughts.
            </p>
          </div>

          {/* Top Section: Timer & Indicators */}
          <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start pointer-events-none">
            {/* PiP Timer */}
            <div 
              ref={timerContainerRef}
              className="bg-black/50 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-lg"
              style={{ display: 'none' }}
            >
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span ref={timerTextRef} className="text-white font-mono font-medium tracking-wider text-xs">0:00</span>
            </div>

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
        <div 
          ref={livePacingContainerRef}
          className="glass-panel w-full p-4 rounded-2xl bg-zinc-950/60 border border-white/5 backdrop-blur-md flex-col gap-2.5 text-left"
          style={{ display: 'none' }}
        >
          <div className="flex justify-between items-center text-[10px] text-zinc-400 font-bold uppercase tracking-widest font-mono">
            <span>// live_pacing_indicator</span>
            <span ref={liveWpmTextRef} className="text-emerald-400 font-extrabold">
              130 WPM // GOOD
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
            <div 
              ref={needleRef}
              className="absolute -top-1 w-4 h-4 bg-white rounded-full border border-zinc-950 shadow-[0_0_8px_rgba(255,255,255,0.8)] -ml-2 flex items-center justify-center cursor-default transition-all duration-300 ease-out"
              style={{ left: '43.75%' }}
            >
              <div className="w-1.5 h-1.5 bg-zinc-950 rounded-full" />
            </div>
          </div>
          
          <div className="flex justify-between text-[8px] text-zinc-500 font-mono tracking-wider font-semibold">
            <span>SLOW (&lt;110)</span>
            <span>STEADY (110-150)</span>
            <span>FAST (&gt;150)</span>
          </div>
        </div>
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
