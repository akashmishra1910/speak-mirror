"use client";

import { useState, useRef, useEffect } from "react";
import { Video } from "lucide-react";
import { BEAUTIFY_FILTERS } from "@/lib/filters";
import { useFaceAnalysis } from "@/hooks/useFaceAnalysis";
import { Stage } from "./session/Stage";
import { InfoSidebar } from "./session/InfoSidebar";
import { PracticeAssignment } from "@/types";

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
  initialBullets?: { label: string; text: string }[] | null;
  onTopicGenerated?: (topic: string, bullets: { label: string; text: string }[]) => void;
  
  // Custom suggestion & AI topic generation props
  customSuggestedTopics?: string[];
  onGenerateAITopic?: () => void;

  // Workspace configuration (for when not recording)
  isPersonal: boolean;
  activeTaskId: string | null;
  pendingAssignments: PracticeAssignment[];
  selectedChallenge: any;
  completedWarmupToday: boolean;
  onStartChallenge: () => void;
  onShuffleChallenge: () => void;
  onSelectAssignment: (assignment: PracticeAssignment) => void;
  onClearAssignment: () => void;
  onShowChallengeModal: () => void;

  // Lifted states
  activeFilter?: string;
  setActiveFilter?: (val: string) => void;
  bellTiming?: number;
  setBellTiming?: (val: number) => void;
  streak?: number;
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
  initialBullets,
  onTopicGenerated,
  
  customSuggestedTopics = [],
  onGenerateAITopic,

  isPersonal,
  activeTaskId,
  pendingAssignments,
  selectedChallenge,
  completedWarmupToday,
  onStartChallenge,
  onShuffleChallenge,
  onSelectAssignment,
  onClearAssignment,
  onShowChallengeModal,
  streak,

  activeFilter: propActiveFilter,
  setActiveFilter: propSetActiveFilter,
  bellTiming: propBellTiming,
  setBellTiming: propSetBellTiming,
}: RecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // Camera & Countdown states
  const [cameraLoaded, setCameraLoaded] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  
  const [topic, setTopic] = useState("Generating topic...");
  const [bullets, setBullets] = useState<{label: string, text: string}[]>([]);
  const [isLoadingTopic, setIsLoadingTopic] = useState(true);
  const [isAssistEnabled, setIsAssistEnabled] = useState(false);

  // Lifted states fallbacks
  const [localActiveFilter, setLocalActiveFilter] = useState("studio");
  const [localBellTiming, setLocalBellTiming] = useState(75);

  const activeFilter = propActiveFilter !== undefined ? propActiveFilter : localActiveFilter;
  const setActiveFilter = propSetActiveFilter !== undefined ? propSetActiveFilter : (val: string) => {
    setLocalActiveFilter(val);
    localStorage.setItem("speak_mirror_beautify_filter", val);
  };

  const bellTiming = propBellTiming !== undefined ? propBellTiming : localBellTiming;
  const setBellTiming = propSetBellTiming !== undefined ? propSetBellTiming : (val: number) => {
    setLocalBellTiming(val);
    localStorage.setItem("speak_mirror_bell_timing", val.toString());
  };
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
  const concludePromptRef = useRef<HTMLDivElement | null>(null);

  // Telemetry HUD refs
  const eyeContactDotRef = useRef<HTMLDivElement | null>(null);
  const eyeContactTextRef = useRef<HTMLSpanElement | null>(null);
  const expressionTextRef = useRef<HTMLSpanElement | null>(null);
  const wpmTextRef = useRef<HTMLSpanElement | null>(null);
  const metricsContainerRef = useRef<HTMLDivElement | null>(null);
  const coachNudgeRef = useRef<HTMLDivElement | null>(null);
  const coachNudgeTextRef = useRef<HTMLSpanElement | null>(null);

  const animationFrameIdRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isTooShortRef = useRef(false);

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
  const storageCanvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const storageStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const storageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const exportStreamRef = useRef<MediaStream | null>(null);
  
  // Speech recognition refs
  const recognitionRef = useRef<any>(null);
  const wordCountRef = useRef<number>(0);

  const {
    isLoading: isFaceLoading,
    isModelReady: isFaceReady,
    startAnalysis,
    stopAnalysis,
  } = useFaceAnalysis(videoRef, isRecording, (metrics) => {
    // High-frequency telemetry direct DOM updates
    if (eyeContactTextRef.current) {
      eyeContactTextRef.current.textContent = metrics.isBlinking ? 'BLINKING...' : `${metrics.eyeContact}%`;
    }
    if (eyeContactDotRef.current) {
      if (metrics.isBlinking) {
        eyeContactDotRef.current.className = 'w-1.5 h-1.5 bg-brand-gold/30 rounded-full';
      } else if (metrics.gazeWarning) {
        eyeContactDotRef.current.className = 'w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]';
      } else {
        eyeContactDotRef.current.className = 'w-1.5 h-1.5 bg-brand-gold rounded-full shadow-[0_0_8px_rgba(184,150,62,0.8)]';
      }
    }

    if (expressionTextRef.current) {
      expressionTextRef.current.textContent = `${metrics.expression}%`;
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
  const hasAutoStartedRef = useRef(false);

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

        // Draw onto the downscaled storage canvas context synchronized with the animation frame
        if (storageCanvasCtxRef.current) {
          storageCanvasCtxRef.current.drawImage(canvas, 0, 0, 640, 360);
        }
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
    if (autoStart && cameraLoaded && !hasAutoStartedRef.current && !isRecording && !isProcessing) {
      hasAutoStartedRef.current = true;
      startRecording();
    }
  }, [autoStart, cameraLoaded, isRecording, isProcessing]);

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
        if (initialBullets && initialBullets.length > 0) {
          setBullets(initialBullets);
        } else {
          // We still fetch bullets for assist mode
          fetchDynamicTopic(true);
        }
      } else {
        fetchDynamicTopic();
      }
    }
  }, [mode, taskTopic, initialBullets]);

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
      const data = envelope.success && envelope.data ? envelope.data : envelope;
      if (data.topic && data.bullets) {
        const targetTopic = bulletsOnly ? topic : data.topic;
        if (!bulletsOnly) setTopic(data.topic);
        setBullets(data.bullets);
        if (onTopicGenerated) {
          onTopicGenerated(targetTopic, data.bullets);
        }
      } else {
        console.warn("Invalid format from API, using fallback data");
        const fallbackTopic = "What is the most important lesson you've learned?";
        const fallbackBullets = [
          { label: "Who", text: "The main people involved were..." },
          { label: "What", text: "The core idea or challenge was..." },
          { label: "Where", text: "This took place in the context of..." },
          { label: "When", text: "This originally occurred when..." },
          { label: "How", text: "Ultimately, it was approached by..." },
        ];
        const targetTopic = bulletsOnly ? topic : fallbackTopic;
        if (!bulletsOnly) setTopic(fallbackTopic);
        setBullets(fallbackBullets);
        if (onTopicGenerated) {
          onTopicGenerated(targetTopic, fallbackBullets);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch topic, using fallback:", err);
      const fallbackBullets = [
        { label: "Who", text: "The main people involved were..." },
        { label: "What", text: "The core idea or challenge was..." },
        { label: "Where", text: "This took place in the context of..." },
        { label: "When", text: "This originally occurred when..." },
        { label: "How", text: "Ultimately, it was approached by..." },
      ];
      setBullets(fallbackBullets);
      if (onTopicGenerated) {
        onTopicGenerated(topic, fallbackBullets);
      }
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
        liveFillerTextRef.current.textContent = `${fillerCount}${fillerLog.length > 0 ? ` (${fillerLog[fillerLog.length - 1].word})` : ""}`;
      }

      let status: "slow" | "good" | "fast" = "good";
      if (rollingWpm < 110) status = "slow";
      else if (rollingWpm > 150) status = "fast";

      if (liveWpmTextRef.current) {
        liveWpmTextRef.current.textContent = status.toUpperCase();
        if (status === "good") {
          liveWpmTextRef.current.className = "text-brand-gold font-bold";
        } else {
          liveWpmTextRef.current.className = "text-red-500 font-bold";
        }
      }

      if (wpmTextRef.current) {
        wpmTextRef.current.textContent = `${rollingWpm} WPM`;
      }

      if (needleRef.current) {
        const percent = Math.min(Math.max((rollingWpm - 60) / (220 - 60) * 100, 0), 100);
        needleRef.current.style.width = `${percent}%`;
        if (status === "good") {
          needleRef.current.className = "h-full bg-brand-gold rounded-full transition-all duration-300 ease-out";
        } else {
          needleRef.current.className = "h-full bg-red-500 rounded-full transition-all duration-300 ease-out";
        }
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

    let lastError: string | null = null;
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
      lastError = err.error;
      // Filter out benign/normal silence and abort errors to avoid console warning spam
      if (err.error === "no-speech" || err.error === "aborted") {
        return;
      }
      console.warn("Speech recognition error:", err.error, err);
    };

    rec.onend = () => {
      // Restart if still recording AND we didn't encounter a fatal error (like not-allowed or audio-capture)
      const isFatal = lastError && lastError !== "no-speech" && lastError !== "aborted";
      if (!isFatal && mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        try {
          rec.start();
        } catch (e) {}
      }
      lastError = null;
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
    }
  };

  const startRecording = () => {
    setShowCountdown(true);
  };

  const handleCountdownComplete = () => {
    setShowCountdown(false);
    startRecordingActual();
  };

  const startRecordingActual = async () => {
    if (!streamRef.current) return;
    hasTriggeredBellRef.current = false;
    wordCountRef.current = 0;
    isTooShortRef.current = false;

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

      // Use the off-screen storage canvas ref for the storage recorder
      if (!storageCanvasRef.current) {
        throw new Error("Storage canvas not ready");
      }
      const storageCanvas = storageCanvasRef.current;
      const ctx = storageCanvas.getContext("2d");
      storageCanvasCtxRef.current = ctx;

      // Extract low resolution video track at 15fps as requested
      const lowResVideoStream = storageCanvas.captureStream(15);
      const lowResVideoTrack = lowResVideoStream.getVideoTracks()[0];
      const audioTrack = streamRef.current?.getAudioTracks()[0];

      // Combine video track and audio track
      const storageStream = new MediaStream(audioTrack ? [lowResVideoTrack, audioTrack] : [lowResVideoTrack]);
      storageStreamRef.current = storageStream;

      // Storage Recorder (low bitrate: 200 Kbps video, 64 Kbps audio, downscaled 360p stream)
      // Capped under 3 MB for 90s (total ~2.97 MB)
      const mediaRecorder = new MediaRecorder(storageStream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 200000,
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

      // Export Recorder (high quality: 8 Mbps video, 192 Kbps audio, actual camera high-definition quality)
      const exportRecorder = new MediaRecorder(exportStream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 8000000,
        audioBitsPerSecond: 192000
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

      const audioRecorder: MediaRecorder | null = null;
      let storageBlob: Blob | null = null;
      let exportBlob: Blob | null = null;

      const checkComplete = () => {
        if (storageBlob && exportBlob) {
          if (isTooShortRef.current) {
            console.log("[Recorder] Recording discarded because it was too short.");
            clearDB().catch(console.error);
            return;
          }

          const eyeContactAvg = faceAnalysisResultsRef.current?.eyeContactAvg;
          const expressionScoreAvg = faceAnalysisResultsRef.current?.expressionScoreAvg;
          
          console.log(`[Recorder] Recording complete. Storage blob size: ${storageBlob.size}, Export blob size: ${exportBlob.size}`);

          onRecordingComplete(
            storageBlob, 
            storageBlob, // Use low-res storage video for audio transcription fallback
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
          await Promise.all(exportWritePromisesRef.current);
          const dbChunks = await getChunks("exportChunks");
          exportBlob = new Blob(dbChunks, { type: selectedMimeType });
        } catch (err) {
          console.error("Failed to read export chunks from IndexedDB:", err);
          exportBlob = new Blob([], { type: selectedMimeType });
        }
        checkComplete();
      };

      // Collect chunks every 5s (reduces callback frequency overhead by 5x)
      mediaRecorder.start(5000);
      exportRecorder.start(5000);
      
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
        if (metricsContainerRef.current) {
          metricsContainerRef.current.style.display = 'flex';
        }
        if (liveFillerContainerRef.current) {
          liveFillerContainerRef.current.style.display = 'flex';
        }
        if (liveFillerTextRef.current) {
          liveFillerTextRef.current.textContent = "0";
        }
        if (livePacingContainerRef.current) {
          livePacingContainerRef.current.style.display = 'flex';
        }
        if (liveWpmTextRef.current) {
          liveWpmTextRef.current.textContent = "GOOD";
          liveWpmTextRef.current.className = "text-brand-gold font-bold";
        }
        if (wpmTextRef.current) {
          wpmTextRef.current.textContent = "130 WPM";
        }
        if (needleRef.current) {
          needleRef.current.style.width = "43.75%";
          needleRef.current.className = "h-full bg-brand-gold rounded-full transition-all duration-300 ease-out";
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
            liveWpmTextRef.current.textContent = status.toUpperCase();
            if (status === "good") {
              liveWpmTextRef.current.className = "text-brand-gold font-bold";
            } else {
              liveWpmTextRef.current.className = "text-red-500 font-bold";
            }
          }

          if (wpmTextRef.current) {
            wpmTextRef.current.textContent = `${wpm} WPM`;
          }

          if (needleRef.current) {
            const percent = Math.min(Math.max((wpm - 60) / (220 - 60) * 100, 0), 100);
            needleRef.current.style.width = `${percent}%`;
            if (status === "good") {
              needleRef.current.className = "h-full bg-brand-gold rounded-full transition-all duration-300 ease-out";
            } else {
              needleRef.current.className = "h-full bg-red-500 rounded-full transition-all duration-300 ease-out";
            }
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

    const duration = (Date.now() - recordingStartTimeRef.current) / 1000;
    if (wasRecording && duration < 2.0) {
      isTooShortRef.current = true;
      alert("Recording too short. Please speak for at least 2 seconds.");
    }

    if (wasRecording && userId) {
      faceAnalysisResultsRef.current = stopAnalysis();
    }

    // Stop downscaled loop interval and canvas track
    storageCanvasCtxRef.current = null;
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
    if (metricsContainerRef.current) {
      metricsContainerRef.current.style.display = 'none';
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
    <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch justify-center">
      {/* Left Column: The Stage */}
      <Stage
        videoRef={videoRef}
        canvasRef={canvasRef}
        storageCanvasRef={storageCanvasRef}
        timerContainerRef={timerContainerRef}
        timerTextRef={timerTextRef}
        eyeContactDotRef={eyeContactDotRef}
        eyeContactTextRef={eyeContactTextRef}
        expressionTextRef={expressionTextRef}
        wpmTextRef={wpmTextRef}
        metricsContainerRef={metricsContainerRef}
        gazeWarningRef={gazeWarningRef}
        coachNudgeContainerRef={coachNudgeRef}
        coachNudgeTextRef={coachNudgeTextRef}
        concludePromptRef={concludePromptRef}
        fillerContainerRef={liveFillerContainerRef}
        fillerTextRef={liveFillerTextRef}
        pacingContainerRef={livePacingContainerRef}
        pacingFillRef={needleRef}
        pacingTextRef={liveWpmTextRef}
        activeFilter={activeFilter}
        isRecording={isRecording}
        isProcessing={isProcessing}
        cameraLoaded={cameraLoaded}
        setCameraLoaded={setCameraLoaded}
        isAssistEnabled={isAssistEnabled}
        setIsAssistEnabled={setIsAssistEnabled}
        mode={mode}
        readingText={readingText}
        bullets={bullets}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        showCountdown={showCountdown}
        setShowCountdown={setShowCountdown}
        onCountdownComplete={handleCountdownComplete}
        isPersonal={isPersonal}
        streak={streak}
      />

      {/* Right Column: Info Sidebar */}
      <InfoSidebar
        mode={mode}
        topic={topic}
        bullets={bullets}
        wordOfTheDay={wordOfTheDay}
        wordDefinition={wordDefinition}
        tips={tips}
        focusMetric={focusMetric ?? null}
        isRecording={isRecording}
        isLoadingTopic={isLoadingTopic}
        onShuffleTopic={mode === "freeform" && !taskTopic ? () => fetchDynamicTopic(false) : undefined}
        onGenerateAITopic={mode === "freeform" && !taskTopic ? () => fetchDynamicTopic(false) : undefined}
        customSuggestedTopics={customSuggestedTopics}
        onSelectSuggestedTopic={(t) => {
          setTopic(t);
          setBullets([]);
          if (onTopicGenerated) onTopicGenerated(t, []);
        }}
        activeFilter={activeFilter}
        setActiveFilter={(val) => {
          setActiveFilter(val);
          localStorage.setItem("speak_mirror_beautify_filter", val);
        }}
        bellTiming={bellTiming}
        setBellTiming={(val) => {
          setBellTiming(val);
          localStorage.setItem("speak_mirror_bell_timing", val.toString());
        }}
        timeLimit={timeLimit}
        userId={userId}
        isPersonal={isPersonal}
        activeTaskId={activeTaskId}
        pendingAssignments={pendingAssignments}
        selectedChallenge={selectedChallenge}
        completedWarmupToday={completedWarmupToday}
        onStartChallenge={onStartChallenge}
        onShuffleChallenge={onShuffleChallenge}
        onSelectAssignment={onSelectAssignment}
        onClearAssignment={onClearAssignment}
        onShowChallengeModal={onShowChallengeModal}
      />
    </div>
  );
}
