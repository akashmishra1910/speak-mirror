"use client";

import { useState } from "react";
import { AnalysisMetrics } from "@/components/FeedbackDashboard";
import { Loader2, Flame, Sparkles, Bell, Shuffle, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useEffect, Suspense, useRef, useCallback } from "react";
import { dailyChallenges, getRandomChallenge, Challenge } from "@/lib/challenges";
import { PracticeTask, PracticeAssignment, FillerLogEntry, PacingLogEntry } from "@/types";
import dynamic from "next/dynamic";

// Modular Subcomponents
import { PromptSelector } from "@/components/practice/PromptSelector";
import { AnalysisResults } from "@/components/practice/AnalysisResults";
import { PendingAssignments } from "@/components/practice/PendingAssignments";
import { ChallengeModal } from "@/components/practice/ChallengeModal";
import { ToastNotification, Toast } from "@/components/practice/ToastNotification";
import { PreSessionModal } from "@/components/session/PreSessionModal";
import { PracticeLayout } from "@/components/practice/PracticeLayout";
import { InfoSidebar } from "@/components/session/InfoSidebar";

const Recorder = dynamic(() => import("@/components/Recorder").then(mod => mod.Recorder), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center p-24 w-full glass-panel rounded-3xl dark:border-white/5">
      <Loader2 className="w-8 h-8 animate-spin text-themeText dark:text-white mb-4" />
      <span className="text-xs font-semibold text-slate-500 dark:text-foreground/50 uppercase tracking-widest">Loading Recorder...</span>
    </div>
  )
});

const AnalysisLoader = dynamic(() => import("@/components/practice/AnalysisLoader").then(mod => mod.AnalysisLoader), {
  ssr: false
});

const defaultSuggestedTopics = [
  "Describe your dream career path",
  "Explain AI to a 10-year-old child",
  "Overcoming a difficult challenge",
  "90-second pitch for a new app idea",
  "The most important lesson learned"
];

function PracticeContent() {
  const { user, isLoading, activeWorkspace } = useAuth();
  const isPersonal = activeWorkspace?.id === "personal";
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = searchParams.get("roomId");
  const taskId = searchParams.get("taskId");
  const customPrompt = searchParams.get("prompt");

  // Authentication Guard redirect (Issue 3)
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/auth");
    }
  }, [user, isLoading, router]);

  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [task, setTask] = useState<PracticeTask | null>(null);
  const [isLoadingTask, setIsLoadingTask] = useState(true);
  
  type TaskPhase = "freeform_recording" | "reading_recording" | "analyzing" | "results";
  const [phase, setPhase] = useState<TaskPhase>("freeform_recording");
  
  const [freeformBlob, setFreeformBlob] = useState<Blob | null>(null);
  const [readingBlob, setReadingBlob] = useState<Blob | null>(null);
  
  const [metricsList, setMetricsList] = useState<AnalysisMetrics[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Beautify filter and Alert bell timings lifted state
  const [activeFilter, setActiveFilter] = useState("studio");
  const [bellTiming, setBellTiming] = useState(75);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedFilter = localStorage.getItem("speak_mirror_beautify_filter");
      if (savedFilter) setActiveFilter(savedFilter);
      const savedBell = localStorage.getItem("speak_mirror_bell_timing");
      if (savedBell) setBellTiming(Number(savedBell));
    }
  }, []);

  // Daily Streak State
  const [streak, setStreak] = useState<number>(0);
  const [isLoadingStreak, setIsLoadingStreak] = useState(false);
  const [completedWarmupToday, setCompletedWarmupToday] = useState(false);

  // Team Assignments State
  const [pendingAssignments, setPendingAssignments] = useState<PracticeAssignment[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);

  // Synchronized Media State Refs to resolve stale closure issues (Issue 2)
  const freeformBlobRef = useRef<Blob | null>(null);
  const freeformAudioBlobRef = useRef<Blob | null>(null);
  const freeformExportBlobRef = useRef<Blob | null>(null);
  const freeformEyeContactRef = useRef<number | undefined>(undefined);
  const freeformExpressionRef = useRef<number | undefined>(undefined);
  const freeformFillerLogRef = useRef<FillerLogEntry[]>([]);
  const freeformAvgWpmRef = useRef<number>(130);
  const freeformPacingLogRef = useRef<PacingLogEntry[]>([]);

  // Daily Challenge State
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  
  // Notification Permission State
  const [notificationPermission, setNotificationPermission] = useState<string>("default");

  // Toast HUD State
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info', duration = 4000) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
    return id;
  }, []);



  // Caching topic & bullets for Free Practice retakes
  const [freeformTopic, setFreeformTopic] = useState<string | null>(null);
  const [freeformBullets, setFreeformBullets] = useState<{ label: string; text: string }[]>([]);

  // Pre-session Warm-up states
  const [showWarmup, setShowWarmup] = useState<boolean>(true);
  const [profileGoal, setProfileGoal] = useState<string | null>(null);
  const [profileExperience, setProfileExperience] = useState<string | null>(null);
  const [profileFocusMetric, setProfileFocusMetric] = useState<string | null>(null);
  const [profileDuration, setProfileDuration] = useState<number>(3);
  const [isFirstSession, setIsFirstSession] = useState<boolean>(false);
  const [hasWarmedUp, setHasWarmedUp] = useState<boolean>(false);

  // Suggested topic states for visual configuration panel
  const [isLoadingTopic, setIsLoadingTopic] = useState(false);
  const [customSuggestedTopics, setCustomSuggestedTopics] = useState<string[]>(defaultSuggestedTopics);

  const handleGenerateAITopic = async () => {
    setIsLoadingTopic(true);
    try {
      const levelQuery = profileExperience ? `&level=${encodeURIComponent(profileExperience)}` : "";
      const endpoint = user?.id ? `/api/generate-topic?userId=${user.id}${levelQuery}` : `/api/generate-topic?${levelQuery.substring(1)}`;
      const res = await fetch(endpoint);
      const envelope = await res.json();
      const data = envelope.success && envelope.data ? envelope.data : envelope;
      if (data.topic) {
        setFreeformTopic(data.topic);
        setFreeformBullets(data.bullets || []);
        showToast("New AI topic generated!", "success");
        setCustomSuggestedTopics(prev => {
          const filtered = prev.filter(t => t !== data.topic);
          return [data.topic, ...filtered].slice(0, 5);
        });
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to generate AI topic.", "error");
    } finally {
      setIsLoadingTopic(false);
    }
  };

  // Fetch user profile settings and check if this is their first session
  useEffect(() => {
    async function fetchUserProfile() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("show_warmup, goal, experience_level, focus_metric, practice_duration")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setShowWarmup(data.show_warmup !== false);
          setProfileGoal(data.goal || null);
          setProfileExperience(data.experience_level || null);
          setProfileFocusMetric(data.focus_metric || null);
          setProfileDuration(Number(data.practice_duration) || 3);
        }

        // Check if user has any completed recordings to determine isFirstSession
        const { data: recData, error: recError } = await supabase
          .from("recordings")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (!recError) {
          setIsFirstSession(!recData || recData.length === 0);
        }
      } catch (err) {
        console.error("Failed to load user profile for warmup:", err);
      }
    }

    fetchUserProfile();
  }, [user]);

  // Reset warmup state and freeform topic caches when selected task changes
  useEffect(() => {
    setHasWarmedUp(false);
    setFreeformTopic(null);
    setFreeformBullets([]);
  }, [activeTaskId]);

  // Initialize Daily Challenge & Notification Permission on Mount
  useEffect(() => {
    const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % dailyChallenges.length;
    setSelectedChallenge(dailyChallenges[dayIndex]);

    if (typeof window !== "undefined") {
      if (!("Notification" in window)) {
        setNotificationPermission("unsupported");
      } else {
        setNotificationPermission(Notification.permission);
      }
    }
  }, []);

  const isFirstWorkspaceChange = useRef(true);

  // Clear query parameters and selected task states when user switches workspaces manually
  useEffect(() => {
    if (isFirstWorkspaceChange.current) {
      isFirstWorkspaceChange.current = false;
      return;
    }
    
    setActiveRoomId(null);
    setActiveTaskId(null);
    setTask(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("roomId");
    url.searchParams.delete("taskId");
    router.replace(url.pathname);
  }, [activeWorkspace.id, router]);

  // Sync Search Params to Local State initially
  useEffect(() => {
    setActiveRoomId(roomId);
    setActiveTaskId(taskId);
  }, [roomId, taskId]);

  // Fetch Task Details based on Active Task ID or Custom Prompt
  useEffect(() => {
    if (customPrompt) {
      setTask({
        id: "custom-prompt",
        topic_of_the_day: customPrompt,
        reading_text: null,
        isChallenge: false,
        isCustom: true
      });
      setIsLoadingTask(false);
      return;
    }

    async function fetchTask() {
      if (!activeTaskId) {
        setTask(null);
        setIsLoadingTask(false);
        return;
      }
      setIsLoadingTask(true);
      try {
        if (activeTaskId.startsWith("challenge-")) {
          const challengeId = activeTaskId.replace("challenge-", "");
          const found = dailyChallenges.find(c => c.id === challengeId);
          if (found) {
            setTask({
              id: activeTaskId,
              topic_of_the_day: found.prompt,
              word_of_the_day: found.word_of_the_day,
              definition: found.definition,
              reading_text: null,
              isChallenge: true,
              timeLimit: found.suggestedDuration,
              tips: found.tips
            });
          }
        } else {
          const { data } = await supabase.from("room_tasks").select("*").eq("id", activeTaskId).single();
          if (data) setTask(data);
        }
      } catch (err) {
        console.error("Error fetching task:", err);
      } finally {
        setIsLoadingTask(false);
      }
    }
    fetchTask();
  }, [activeTaskId, customPrompt]);

  // Fetch Personal Daily Streak
  const fetchPersonalStreak = useCallback(async () => {
    if (!user || activeWorkspace.id !== "personal") return;
    setIsLoadingStreak(true);
    try {
      const { data, error } = await supabase
        .from("recordings")
        .select("created_at, recording_type")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) {
        const dates = data.map(r => {
          const d = new Date(r.created_at);
          return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        });
        const uniqueTimestamps = Array.from(new Set(dates)).sort((a, b) => b - a);
        
        const todayStr = new Date().toDateString();
        const hasCompletedWarmupToday = data.some(r => 
          r.recording_type === 'warmup' && new Date(r.created_at).toDateString() === todayStr
        );
        setCompletedWarmupToday(hasCompletedWarmupToday);

        if (uniqueTimestamps.length === 0) {
          setStreak(0);
          return;
        }
        
        const today = new Date();
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const yesterdayMidnight = todayMidnight - 86400000;
        
        const mostRecent = uniqueTimestamps[0];
        
        if (mostRecent !== todayMidnight && mostRecent !== yesterdayMidnight) {
          setStreak(0);
          return;
        }
        
        let currentStreak = 1;
        for (let i = 0; i < uniqueTimestamps.length - 1; i++) {
          const diff = uniqueTimestamps[i] - uniqueTimestamps[i + 1];
          if (diff === 86400000) {
            currentStreak++;
          } else if (diff > 86400000) {
            break;
          }
        }
        setStreak(currentStreak);
      }
    } catch (err: any) {
      console.error("Error fetching streak:", err);
      showToast("Could not load your practice streak progress.", "error");
    } finally {
      setIsLoadingStreak(false);
    }
  }, [user, activeWorkspace.id, showToast]);

  useEffect(() => {
    fetchPersonalStreak();
  }, [fetchPersonalStreak]);

  // Fetch Team Pending Assignments
  const fetchTeamAssignments = useCallback(async (active = true) => {
    if (!user || activeWorkspace.id === "personal") {
      if (active) setPendingAssignments([]);
      return;
    }
    
    if (active) setIsLoadingAssignments(true);
    try {
      const { data: rooms, error: roomsError } = await supabase
        .from("rooms")
        .select("id, name")
        .eq("organization_id", activeWorkspace.id);
        
      if (roomsError || !rooms || rooms.length === 0) {
        if (active) {
          setPendingAssignments([]);
          setIsLoadingAssignments(false);
        }
        return;
      }
      
      const roomIds = rooms.map(r => r.id);
      
      const { data: tasks, error: tasksError } = await supabase
        .from("room_tasks")
        .select("*")
        .in("room_id", roomIds)
        .order("created_at", { ascending: false });
        
      if (tasksError || !tasks) {
        if (active) {
          setPendingAssignments([]);
          setIsLoadingAssignments(false);
        }
        return;
      }
      
      const { data: userRecordings } = await supabase
        .from("recordings")
        .select("task_id")
        .eq("user_id", user.id)
        .not("task_id", "is", null);
        
      const completedTaskIds = new Set(userRecordings?.map(r => r.task_id) || []);
      
      const pending = tasks
        .filter(t => !completedTaskIds.has(t.id))
        .map(t => {
          const room = rooms.find(r => r.id === t.room_id);
          const createdDate = new Date(t.created_at || Date.now());
          const deadlineDate = new Date(createdDate.getTime() + 24 * 60 * 60 * 1000);
          
          const diffMs = deadlineDate.getTime() - Date.now();
          let deadlineText = "Overdue";
          let isUrgent = false;
          if (diffMs > 0) {
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            if (diffHours === 0) {
              const diffMins = Math.floor(diffMs / (1000 * 60));
              deadlineText = `Due in ${diffMins}m`;
              isUrgent = true;
            } else if (diffHours < 6) {
              deadlineText = `Due in ${diffHours}h`;
              isUrgent = true;
            } else {
              deadlineText = `Due in ${diffHours}h`;
            }
          }
          
          return {
            ...t,
            roomName: room?.name || "Team Room",
            deadlineText,
            isUrgent,
            deadlineDate
          };
        });
        
      if (active) setPendingAssignments(pending);
    } catch (err) {
      console.error("Error fetching team assignments:", err);
    } finally {
      if (active) setIsLoadingAssignments(false);
    }
  }, [user, activeWorkspace.id]);

  useEffect(() => {
    let active = true;
    fetchTeamAssignments(active);
    return () => {
      active = false;
    };
  }, [fetchTeamAssignments]);

  // Cleanup object URLs to prevent memory leaks (Issue 6)
  useEffect(() => {
    const urlsToCleanup = [...videoUrls];
    return () => {
      urlsToCleanup.forEach(url => {
        if (url.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(url);
          } catch (e) {}
        }
      });
    };
  }, [videoUrls]);

  const selectAssignment = (assignment: PracticeAssignment) => {
    setActiveTaskId(assignment.id);
    setActiveRoomId(assignment.room_id);
    setPhase("freeform_recording");
    setFreeformBlob(null);
    setReadingBlob(null);
    setMetricsList([]);
    setVideoUrls([]);
    setIsSaved(false);
    
    const url = new URL(window.location.href);
    url.searchParams.set("roomId", assignment.room_id);
    url.searchParams.set("taskId", assignment.id);
    router.replace(`${url.pathname}${url.search}`);
  };

  const clearAssignment = () => {
    setActiveTaskId(null);
    setActiveRoomId(null);
    setTask(null);
    setPhase("freeform_recording");
    setFreeformBlob(null);
    setReadingBlob(null);
    setMetricsList([]);
    setVideoUrls([]);
    setIsSaved(false);
    
    const url = new URL(window.location.href);
    url.searchParams.delete("roomId");
    url.searchParams.delete("taskId");
    router.replace(`${url.pathname}${url.search}`);
  };

  const handleShuffleChallenge = () => {
    const next = getRandomChallenge(selectedChallenge?.id);
    setSelectedChallenge(next);
  };

  const startChallenge = () => {
    if (!selectedChallenge) return;
    setActiveTaskId(`challenge-${selectedChallenge.id}`);
    setActiveRoomId(null);
    setPhase("freeform_recording");
    setFreeformBlob(null);
    setReadingBlob(null);
    setMetricsList([]);
    setVideoUrls([]);
    setIsSaved(false);
    setShowChallengeModal(false);
  };

  const handleRequestNotificationPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        new Notification("SpeakMirror Streak Reminders Active! 🔔", {
          body: "We'll nudge you in the evening if you haven't completed your daily warm-up.",
          icon: "/icons/icon-192x192.png"
        });
        localStorage.setItem("speak_mirror_push_reminders", "true");
      }
    } catch (err) {
      console.error("Error requesting notification permission:", err);
    }
  };

  const handleRecordingComplete = async (
    videoBlob: Blob,
    audioBlob: Blob, 
    eyeContactAvg?: number, 
    expressionScoreAvg?: number,
    exportVideoBlob?: Blob,
    fillerLog?: FillerLogEntry[],
    avgWpm?: number,
    pacingLog?: PacingLogEntry[]
  ) => {
    const isReading = activeTaskId && phase === "reading_recording";

    if (isReading) {
      setReadingBlob(videoBlob);
    } else {
      setFreeformBlob(videoBlob);
      freeformBlobRef.current = videoBlob;
      freeformAudioBlobRef.current = audioBlob;
      freeformExportBlobRef.current = exportVideoBlob || null;
      freeformFillerLogRef.current = fillerLog || [];
      freeformAvgWpmRef.current = avgWpm || 130;
      freeformPacingLogRef.current = pacingLog || [];
    }

    if (activeTaskId && phase === "freeform_recording") {
      freeformEyeContactRef.current = eyeContactAvg;
      freeformExpressionRef.current = expressionScoreAvg;
      
      if (task?.isChallenge) {
        setPhase("analyzing");
        processRecordings(
          videoBlob, 
          audioBlob, 
          null, 
          null, 
          eyeContactAvg, 
          expressionScoreAvg,
          undefined,
          undefined,
          exportVideoBlob,
          undefined,
          fillerLog,
          avgWpm,
          pacingLog
        );
        return;
      }
      setPhase("reading_recording");
      return;
    }

    if (activeTaskId && phase === "reading_recording") {
      setPhase("analyzing");
      processRecordings(
        freeformBlobRef.current!, 
        freeformAudioBlobRef.current!, 
        videoBlob, 
        audioBlob, 
        freeformEyeContactRef.current, 
        freeformExpressionRef.current, 
        eyeContactAvg, 
        expressionScoreAvg,
        freeformExportBlobRef.current || undefined,
        exportVideoBlob,
        freeformFillerLogRef.current,
        freeformAvgWpmRef.current,
        freeformPacingLogRef.current,
        fillerLog,
        avgWpm,
        pacingLog
      );
      return;
    }

    if (!activeTaskId) {
      freeformEyeContactRef.current = eyeContactAvg;
      freeformExpressionRef.current = expressionScoreAvg;
      setPhase("analyzing");
      processRecordings(
        videoBlob, 
        audioBlob, 
        null, 
        null, 
        eyeContactAvg, 
        expressionScoreAvg,
        undefined,
        undefined,
        exportVideoBlob,
        undefined,
        fillerLog,
        avgWpm,
        pacingLog
      );
    }
  };

  const processRecordings = async (
    freeformVideo: Blob,
    freeformAudio: Blob,
    readingVideo: Blob | null,
    readingAudio: Blob | null,
    ffEyeContact?: number,
    ffExpression?: number,
    rdEyeContact?: number,
    rdExpression?: number,
    freeformExportVideo?: Blob,
    readingExportVideo?: Blob,
    ffFillerLog?: FillerLogEntry[],
    ffAvgWpm?: number,
    ffPacingLog?: PacingLogEntry[],
    rdFillerLog?: FillerLogEntry[],
    rdAvgWpm?: number,
    rdPacingLog?: PacingLogEntry[]
  ) => {
    setIsProcessing(true);
    setMetricsList([]);

    try {
      const newMetrics: AnalysisMetrics[] = [];
      const newUrls: string[] = [];

      const freeformUrl = URL.createObjectURL(freeformExportVideo || freeformVideo);
      newUrls.push(freeformUrl);

      const freeformExt = freeformAudio?.type?.includes("mp4") ? "mp4" : "webm";
      const formData1 = new FormData();
      formData1.append("audio", freeformAudio, `recording.${freeformExt}`);
      if (ffEyeContact !== undefined) formData1.append("eyeContact", ffEyeContact.toString());
      if (ffExpression !== undefined) formData1.append("expression", ffExpression.toString());

      const res1 = await fetch("/api/analyze", { method: "POST", body: formData1 });
      
      let analysis1;
      const resText1 = await res1.text();
      try {
        analysis1 = JSON.parse(resText1);
      } catch (jsonErr) {
        throw new Error(res1.status === 413 
          ? "Recording is too large for the Vercel Serverless Function limit. Please try speaking a bit closer to the time limit or shorten your speech."
          : `Server error (${res1.status}): ${resText1.substring(0, 150)}`
        );
      }

      if (!res1.ok) throw new Error(analysis1.error || "Failed to analyze freeform speech");
      // Unwrap response to matches feed format
      const realData1 = analysis1.success && analysis1.data ? analysis1.data : analysis1;
      realData1.title = "Freeform Speech";
      realData1.eyeContact = ffEyeContact;
      realData1.expressionScore = ffExpression;
      realData1.fillerLog = ffFillerLog;
      realData1.avgWpm = ffAvgWpm;
      realData1.pacingLog = ffPacingLog;
      newMetrics.push(realData1);

      if (readingAudio && readingVideo && task?.reading_text) {
        const readingUrl = URL.createObjectURL(readingExportVideo || readingVideo);
        newUrls.push(readingUrl);

        const readingExt = readingAudio?.type?.includes("mp4") ? "mp4" : "webm";
        const formData2 = new FormData();
        formData2.append("audio", readingAudio, `recording.${readingExt}`);
        formData2.append("expectedText", task.reading_text);
        if (rdEyeContact !== undefined) formData2.append("eyeContact", rdEyeContact.toString());
        if (rdExpression !== undefined) formData2.append("expression", rdExpression.toString());

        const res2 = await fetch("/api/analyze", { method: "POST", body: formData2 });
        
        let analysis2;
        const resText2 = await res2.text();
        try {
          analysis2 = JSON.parse(resText2);
        } catch (jsonErr) {
          throw new Error(res2.status === 413 
            ? "Reading recording is too large for the Vercel Serverless Function limit."
            : `Server error (${res2.status}): ${resText2.substring(0, 150)}`
          );
        }

        if (!res2.ok) throw new Error(analysis2.error || "Failed to analyze reading speech");
        const realData2 = analysis2.success && analysis2.data ? analysis2.data : analysis2;
        realData2.title = "Reading Aloud";
        realData2.eyeContact = rdEyeContact;
        realData2.expressionScore = rdExpression;
        realData2.fillerLog = rdFillerLog;
        realData2.avgWpm = rdAvgWpm;
        realData2.pacingLog = rdPacingLog;
        newMetrics.push(realData2);
      }

      setMetricsList(newMetrics);
      setVideoUrls(newUrls);
      setPhase("results");
      setIsSaved(false);
    } catch (err: any) {
      console.error("Error processing:", err);
      showToast(`An error occurred during analysis: ${err.message || err}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const saveToProgress = async () => {
    if (isSaving || isSaved || !user || !freeformBlob) return;
    setIsSaving(true);

    const fetchCoachComment = async (recordingId: string, index: number) => {
      setMetricsList(prev => {
        const next = [...prev];
        if (next[index]) {
          next[index] = {
            ...next[index],
            isCommentLoading: true
          };
        }
        return next;
      });

      try {
        const res = await fetch("/api/coach-comment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            recordingId,
            confidence: metricsList[index].confidence,
            clarity: metricsList[index].clarity,
            pacing: metricsList[index].wpm,
            fillers: metricsList[index].fillerWords,
            eyeContact: metricsList[index].eyeContact
          })
        });

        if (!res.ok) throw new Error("Failed to generate comment");
        const data = await res.json();

        setMetricsList(prev => {
          const next = [...prev];
          if (next[index]) {
            next[index] = {
              ...next[index],
              coachComment: data.ai_coach_comment,
              coach_comment: data.ai_coach_comment,
              improvement_vs_last: data.improvement_vs_last,
              improvement_vs_best: data.improvement_vs_best,
              focusMetric: data.focus_metric,
              isCommentLoading: false
            };
          }
          return next;
        });
      } catch (err) {
        console.error("Error fetching AI coach comment:", err);
        setMetricsList(prev => {
          const next = [...prev];
          if (next[index]) {
            next[index] = {
              ...next[index],
              isCommentLoading: false
            };
          }
          return next;
        });
      }
    };
    
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        let currentOrgId = activeWorkspace.id;
        if (currentOrgId === "personal") {
          const { data: personalOrg } = await supabase
            .from("organizations")
            .select("id")
            .eq("created_by", user.id)
            .eq("is_personal", true)
            .limit(1)
            .maybeSingle();
          if (personalOrg) {
            currentOrgId = personalOrg.id;
          } else {
            throw new Error("Could not locate your personal space in the database.");
          }
        }

        const sessionId = crypto.randomUUID();
        showToast("Saving to your history...", "info");

        // Upload Freeform
        const freeformExt = freeformBlob.type.includes("mp4") ? "mp4" : "webm";
        const freeformFileName = `sessions/${user.id}/${sessionId}/recording.${freeformExt}`;
        const { data: upload1 } = await supabase.storage.from('videos').upload(freeformFileName, freeformBlob, { 
          contentType: freeformBlob.type,
          metadata: { original_bitrate: '2.5Mbps', stored_bitrate: '400kbps' }
        });
        const url1 = upload1 ? freeformFileName : null;
        
        if (url1 && metricsList[0]) {
          const { data: rec1, error: err1 } = await supabase.from('recordings').insert({
            user_id: user.id,
            room_id: activeRoomId || null,
            task_id: activeTaskId && !task?.isChallenge ? activeTaskId : null,
            video_url: url1,
            confidence: metricsList[0].confidence,
            clarity: metricsList[0].clarity,
            wpm: metricsList[0].wpm,
            filler_words: metricsList[0].fillerWords,
            transcript: metricsList[0].transcript,
            topic: task?.topic_of_the_day || "Free Practice",
            recording_type: task?.isChallenge ? 'warmup' : 'freeform',
            organization_id: currentOrgId,
            eye_contact: metricsList[0].eyeContact !== undefined ? metricsList[0].eyeContact : null,
            expression_score: metricsList[0].expressionScore !== undefined ? metricsList[0].expressionScore : null,
            coach_comment: metricsList[0].coachComment || null,
            annotations: metricsList[0].annotations || null,
            filler_log: metricsList[0].fillerLog || [],
            avg_wpm: metricsList[0].avgWpm || 130,
            pacing_log: metricsList[0].pacingLog || []
          }).select('id').single();

          if (err1) throw err1;
          if (rec1?.id) {
            fetchCoachComment(rec1.id, 0);
          }
        }

        // Upload Reading
        if (readingBlob && metricsList[1]) {
          const readingExt = readingBlob.type.includes("mp4") ? "mp4" : "webm";
          const readingFileName = `sessions/${user.id}/${sessionId}/recording_reading.${readingExt}`;
          const { data: upload2 } = await supabase.storage.from('videos').upload(readingFileName, readingBlob, { 
            contentType: readingBlob.type,
            metadata: { original_bitrate: '2.5Mbps', stored_bitrate: '400kbps' }
          });
          const url2 = upload2 ? readingFileName : null;
          
          if (url2) {
            const { data: rec2, error: err2 } = await supabase.from('recordings').insert({
              user_id: user.id,
              room_id: activeRoomId || null,
              task_id: activeTaskId || null,
              video_url: url2,
              confidence: metricsList[1].confidence,
              clarity: metricsList[1].clarity,
              wpm: metricsList[1].wpm,
              filler_words: metricsList[1].fillerWords,
              transcript: metricsList[1].transcript,
              topic: `Reading: ${task?.topic_of_the_day}`,
              recording_type: 'reading',
              organization_id: currentOrgId,
              eye_contact: metricsList[1].eyeContact !== undefined ? metricsList[1].eyeContact : null,
              expression_score: metricsList[1].expressionScore !== undefined ? metricsList[1].expressionScore : null,
              coach_comment: metricsList[1].coachComment || null,
              annotations: metricsList[1].annotations || null,
              filler_log: metricsList[1].fillerLog || [],
              avg_wpm: metricsList[1].avgWpm || 130,
              pacing_log: metricsList[1].pacingLog || []
            }).select('id').single();

            if (err2) throw err2;
            if (rec2?.id) {
              fetchCoachComment(rec2.id, 1);
            }
          }
        }
        
        // Update User Streak
        try {
          const now = new Date();
          const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; // Local YYYY-MM-DD
          
          const { data: currentStreakInfo } = await supabase
            .from("streaks")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (!currentStreakInfo) {
            await supabase.from("streaks").insert({
              user_id: user.id,
              current_streak: 1,
              longest_streak: 1,
              last_active_date: todayDateStr,
              freeze_available: true
            });
          } else {
            const lastActiveDate = currentStreakInfo.last_active_date;
            let nextStreak = currentStreakInfo.current_streak;

            if (lastActiveDate) {
              const lastActive = new Date(lastActiveDate);
              const today = new Date(todayDateStr);
              const diffTime = Math.abs(today.getTime() - lastActive.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              if (diffDays === 1) {
                nextStreak += 1;
              } else if (diffDays > 1) {
                nextStreak = 1;
              }
            } else {
              nextStreak = 1;
            }

            const nextLongestStreak = Math.max(nextStreak, currentStreakInfo.longest_streak);

            await supabase
              .from("streaks")
              .update({
                current_streak: nextStreak,
                longest_streak: nextLongestStreak,
                last_active_date: todayDateStr
              })
              .eq("user_id", user.id);
          }
        } catch (streakErr) {
          console.error("Failed to update streak:", streakErr);
        }
        
        setIsSaved(true);
        showToast("Progress saved successfully!", "success");
        await fetchTeamAssignments();
        if (isPersonal) {
          await fetchPersonalStreak();
        }
      }
    } catch (error: any) {
      console.error("Error saving recording:", error);
      showToast(error.message || "There was an error saving your progress.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetake = () => {
    setPhase("freeform_recording");
    setFreeformBlob(null);
    setReadingBlob(null);
    setFreeformTopic(null);
    setFreeformBullets([]);
    setMetricsList([]);
    setVideoUrls([]);
    setIsSaved(false);

    // Reset Refs (Issue 2)
    freeformBlobRef.current = null;
    freeformAudioBlobRef.current = null;
    freeformExportBlobRef.current = null;
    freeformEyeContactRef.current = undefined;
    freeformExpressionRef.current = undefined;
    freeformFillerLogRef.current = [];
    freeformAvgWpmRef.current = 130;
    freeformPacingLogRef.current = [];
  };

  return (
    <PracticeLayout
      streak={streak}
      isLoadingStreak={isLoadingStreak}
      phase={phase}
      mode={phase === "reading_recording" ? "reading" : (task?.isChallenge ? "warmup" : "freeform")}
      isPersonal={isPersonal}
    >
      {phase !== "results" ? (
        showWarmup && !hasWarmedUp && phase === "freeform_recording" ? (
          <div className="flex-1 w-full flex items-center justify-center">
            <PreSessionModal
              focusMetric={profileFocusMetric}
              goal={profileGoal}
              experienceLevel={profileExperience}
              practiceDuration={profileDuration}
              streak={streak}
              taskTopic={task?.topic_of_the_day || freeformTopic || "Free Practice"}
              isFirstSession={isFirstSession}
              onStartRecording={() => setHasWarmedUp(true)}
              onClose={() => setHasWarmedUp(true)}
            />
          </div>
        ) : (
          <Recorder 
            onRecordingComplete={handleRecordingComplete} 
            isProcessing={isProcessing} 
            readingText={phase === "reading_recording" ? task?.reading_text : undefined}
            taskTopic={task?.topic_of_the_day || freeformTopic}
            initialBullets={freeformBullets}
            onTopicGenerated={(topic, bullets) => {
              setFreeformTopic(topic);
              setFreeformBullets(bullets);
            }}
            userId={user?.id}
            userLevel={profileExperience}
            mode={phase === "reading_recording" ? "reading" : (task?.isChallenge ? "warmup" : "freeform")}
            timeLimit={task?.timeLimit || 90}
            wordOfTheDay={task?.word_of_the_day}
            wordDefinition={task?.definition}
            tips={task?.tips}
            autoStart={showWarmup}
            focusMetric={profileFocusMetric}

            // Configuration state bindings
            customSuggestedTopics={customSuggestedTopics}
            onGenerateAITopic={handleGenerateAITopic}
            isPersonal={isPersonal}
            activeTaskId={activeTaskId}
            pendingAssignments={pendingAssignments}
            selectedChallenge={selectedChallenge}
            completedWarmupToday={completedWarmupToday}
            onStartChallenge={startChallenge}
            onShuffleChallenge={handleShuffleChallenge}
            onSelectAssignment={selectAssignment}
            onClearAssignment={clearAssignment}
            onShowChallengeModal={() => setShowChallengeModal(true)}

            // Lifted settings states
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            bellTiming={bellTiming}
            setBellTiming={setBellTiming}
            streak={streak}
          />
        )
      ) : (
        /* Two columns manually layout in results phase */
        <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch justify-center relative z-10">
          {/* Left Column: Completion Card (brand-consistent) */}
          <div className="flex-1 h-[450px] bg-brand-stage rounded-3xl border border-brand-gold/12 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden select-none">
            {/* Completion content */}
            <div className="w-full max-w-sm flex flex-col items-center justify-center gap-4 animate-in fade-in duration-500 z-20">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 shadow-md">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Session Completed!</h3>
              <p className="text-xs text-zinc-400 font-light leading-relaxed max-w-sm">
                Your speech has been analyzed successfully. Scroll down to view your diagnostic metrics, transcript analysis, and custom cert card.
              </p>
              <button
                onClick={handleRetake}
                className="px-6 py-2.5 bg-gradient-to-r from-brand-gold to-brand-gold/80 hover:from-brand-gold/90 hover:to-brand-gold text-brand-navy rounded-xl text-xs font-bold transition-all shadow-[0_4px_15px_rgba(184,150,62,0.2)] cursor-pointer"
              >
                Start New Session
              </button>
            </div>
            {/* Subtle Overlay Gradient for Readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/80 z-10 pointer-events-none rounded-3xl" />
          </div>

          {/* Right Column: InfoSidebar in read-only / results mode */}
          <InfoSidebar
            mode={task?.reading_text ? "reading" : (task?.isChallenge ? "warmup" : "freeform")}
            topic={task?.topic_of_the_day || freeformTopic || "Free Practice"}
            bullets={freeformBullets}
            wordOfTheDay={task?.word_of_the_day}
            wordDefinition={task?.definition}
            tips={task?.tips}
            focusMetric={profileFocusMetric}
            isRecording={false}
            isLoadingTopic={false}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            bellTiming={bellTiming}
            setBellTiming={setBellTiming}
            timeLimit={task?.timeLimit || 90}
            userId={user?.id}
            isPersonal={isPersonal}
            activeTaskId={activeTaskId}
            pendingAssignments={pendingAssignments}
            selectedChallenge={selectedChallenge}
            completedWarmupToday={completedWarmupToday}
            onStartChallenge={startChallenge}
            onShuffleChallenge={handleShuffleChallenge}
            onSelectAssignment={selectAssignment}
            onClearAssignment={clearAssignment}
            onShowChallengeModal={() => setShowChallengeModal(true)}
          />
        </div>
      )}

      {/* Slide-up AnalysisResults dashboard under the grid */}
      {phase === "results" && (
        <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-500 mt-6 relative z-20">
          <AnalysisResults
            phase={phase}
            metricsList={metricsList}
            videoUrls={videoUrls}
            onSave={saveToProgress}
            isSaving={isSaving}
            isSaved={isSaved}
            onRetake={handleRetake}
            activeRoomId={activeRoomId}
            user={user}
          />
        </div>
      )}

      {/* Challenge Selector Modal */}
      <ChallengeModal
        showChallengeModal={showChallengeModal}
        onClose={() => setShowChallengeModal(false)}
        completedWarmupToday={completedWarmupToday}
        activeTaskId={activeTaskId}
        selectedChallenge={selectedChallenge}
        onClearAssignment={clearAssignment}
        onShuffleChallenge={handleShuffleChallenge}
        onStartChallenge={startChallenge}
      />

      {/* Custom Toast HUD */}
      <ToastNotification toasts={toasts} />
    </PracticeLayout>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-24 text-zinc-400 font-light">Loading practice environment...</div>}>
      <PracticeContent />
    </Suspense>
  );
}
