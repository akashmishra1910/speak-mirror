"use client";

import { useState } from "react";
import { Recorder } from "@/components/Recorder";
import { FeedbackDashboard, AnalysisMetrics } from "@/components/FeedbackDashboard";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowLeft, Loader2, Flame, Clock, AlertCircle, BookOpen, ChevronRight, Calendar, Bell, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { useEffect, Suspense, useRef, useCallback } from "react";
import { dailyChallenges, getRandomChallenge, Challenge } from "@/lib/challenges";
import { FluencyCard } from "@/components/FluencyCard";

function PracticeContent() {
  const { user, activeWorkspace } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = searchParams.get("roomId");
  const taskId = searchParams.get("taskId");

  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [task, setTask] = useState<any>(null);
  const [isLoadingTask, setIsLoadingTask] = useState(true);
  
  type TaskPhase = "freeform_recording" | "reading_recording" | "analyzing" | "results";
  const [phase, setPhase] = useState<TaskPhase>("freeform_recording");
  
  const [freeformBlob, setFreeformBlob] = useState<Blob | null>(null);
  const [readingBlob, setReadingBlob] = useState<Blob | null>(null);
  const [freeformAudioBlob, setFreeformAudioBlob] = useState<Blob | null>(null);
  const [readingAudioBlob, setReadingAudioBlob] = useState<Blob | null>(null);
  
  const [metricsList, setMetricsList] = useState<AnalysisMetrics[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);

  // Face Analysis Metrics States
  const [freeformEyeContact, setFreeformEyeContact] = useState<number | undefined>(undefined);
  const [freeformExpression, setFreeformExpression] = useState<number | undefined>(undefined);
  const [readingEyeContact, setReadingEyeContact] = useState<number | undefined>(undefined);
  const [readingExpression, setReadingExpression] = useState<number | undefined>(undefined);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Daily Streak State
  const [streak, setStreak] = useState<number>(0);
  const [isLoadingStreak, setIsLoadingStreak] = useState(false);
  const [completedWarmupToday, setCompletedWarmupToday] = useState(false);

  // Team Assignments State
  const [pendingAssignments, setPendingAssignments] = useState<any[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);

  // Daily Challenge State
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  
  // Notification Permission State
  const [notificationPermission, setNotificationPermission] = useState<string>("default");

  // Initialize Daily Challenge & Notification Permission on Mount
  useEffect(() => {
    // Select deterministic challenge based on current date
    const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % dailyChallenges.length;
    setSelectedChallenge(dailyChallenges[dayIndex]);

    // Check Notification Permission
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
  }, [activeWorkspace.id]);

  // Sync Search Params to Local State initially
  useEffect(() => {
    setActiveRoomId(roomId);
    setActiveTaskId(taskId);
  }, [roomId, taskId]);

  // Fetch Task Details based on Active Task ID
  useEffect(() => {
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
          const { dailyChallenges } = await import("@/lib/challenges");
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
  }, [activeTaskId]);

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
        
        // Also check if completed warmup today
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
    } catch (err) {
      console.error("Error fetching streak:", err);
    } finally {
      setIsLoadingStreak(false);
    }
  }, [user, activeWorkspace.id]);

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
      // 1. Fetch rooms under current team workspace
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
      
      // 2. Fetch tasks under those rooms
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
      
      // 3. Filter out completed tasks
      const { data: userRecordings, error: recError } = await supabase
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
          const deadlineDate = new Date(createdDate.getTime() + 24 * 60 * 60 * 1000); // 24h deadline
          
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

  const selectAssignment = (assignment: any) => {
    setActiveTaskId(assignment.id);
    setActiveRoomId(assignment.room_id);
    setPhase("freeform_recording");
    setFreeformBlob(null);
    setReadingBlob(null);
    setMetricsList([]);
    setVideoUrls([]);
    setIsSaved(false);
    
    // Update URL query parameters without reloading
    const url = new URL(window.location.href);
    url.searchParams.set("roomId", assignment.room_id);
    url.searchParams.set("taskId", assignment.id);
    window.history.replaceState({}, "", url.pathname + url.search);
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
    window.history.replaceState({}, "", url.pathname + url.search);
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
    expressionScoreAvg?: number
  ) => {
    if (activeTaskId && phase === "freeform_recording") {
      setFreeformEyeContact(eyeContactAvg);
      setFreeformExpression(expressionScoreAvg);
      
      if (task?.isChallenge) {
        setFreeformBlob(videoBlob);
        setFreeformAudioBlob(audioBlob);
        setPhase("analyzing");
        processRecordings(videoBlob, audioBlob, null, null, eyeContactAvg, expressionScoreAvg);
        return;
      }
      setFreeformBlob(videoBlob);
      setFreeformAudioBlob(audioBlob);
      setPhase("reading_recording");
      return;
    }

    if (activeTaskId && phase === "reading_recording") {
      setReadingBlob(videoBlob);
      setReadingAudioBlob(audioBlob);
      setReadingEyeContact(eyeContactAvg);
      setReadingExpression(expressionScoreAvg);
      setPhase("analyzing");
      processRecordings(
        freeformBlob!, 
        freeformAudioBlob!, 
        videoBlob, 
        audioBlob, 
        freeformEyeContact, 
        freeformExpression, 
        eyeContactAvg, 
        expressionScoreAvg
      );
      return;
    }

    if (!activeTaskId) {
      setFreeformBlob(videoBlob);
      setFreeformAudioBlob(audioBlob);
      setFreeformEyeContact(eyeContactAvg);
      setFreeformExpression(expressionScoreAvg);
      setPhase("analyzing");
      processRecordings(videoBlob, audioBlob, null, null, eyeContactAvg, expressionScoreAvg);
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
    rdExpression?: number
  ) => {
    setIsProcessing(true);
    setMetricsList([]);

    try {
      const newMetrics: AnalysisMetrics[] = [];
      const newUrls: string[] = [];

      // Use the video Blob for preview playback in FeedbackDashboard
      const freeformUrl = URL.createObjectURL(freeformVideo);
      newUrls.push(freeformUrl);

      const formData1 = new FormData();
      formData1.append("audio", freeformAudio, "recording.webm");
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
      analysis1.title = "Freeform Speech";
      analysis1.eyeContact = ffEyeContact;
      analysis1.expressionScore = ffExpression;
      newMetrics.push(analysis1);

      if (readingAudio && readingVideo && task?.reading_text) {
        const readingUrl = URL.createObjectURL(readingVideo);
        newUrls.push(readingUrl);

        const formData2 = new FormData();
        formData2.append("audio", readingAudio, "recording.webm");
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
        analysis2.title = "Reading Aloud";
        analysis2.eyeContact = rdEyeContact;
        analysis2.expressionScore = rdExpression;
        newMetrics.push(analysis2);
      }

      setMetricsList(newMetrics);
      setVideoUrls(newUrls);
      setPhase("results");
      setIsSaved(false);
    } catch (err: any) {
      console.error("Error processing:", err);
      alert(`An error occurred during analysis: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveToProgress = async () => {
    if (isSaved || !user || !freeformBlob) return;
    setIsSaving(true);
    
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        // Resolve target organization_id for strict RLS constraint
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

        // Upload Freeform
        const freeformFileName = `video_${Date.now()}_freeform.webm`;
        const { data: upload1 } = await supabase.storage.from('videos').upload(freeformFileName, freeformBlob, { contentType: 'video/webm' });
        const url1 = upload1 ? freeformFileName : null;
        
        if (url1 && metricsList[0]) {
          await supabase.from('recordings').insert({
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
            expression_score: metricsList[0].expressionScore !== undefined ? metricsList[0].expressionScore : null
          });
        }

        // Upload Reading
        if (readingBlob && metricsList[1]) {
          const readingFileName = `video_${Date.now()}_reading.webm`;
          const { data: upload2 } = await supabase.storage.from('videos').upload(readingFileName, readingBlob, { contentType: 'video/webm' });
          const url2 = upload2 ? readingFileName : null;
          
          if (url2) {
            await supabase.from('recordings').insert({
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
              expression_score: metricsList[1].expressionScore !== undefined ? metricsList[1].expressionScore : null
            });
          }
        }
        
        setIsSaved(true);
        // Refresh assignments list so completed one gets removed
        await fetchTeamAssignments();
        if (isPersonal) {
          await fetchPersonalStreak();
        }
      }
    } catch (error) {
      console.error("Error saving recording:", error);
      alert("There was an error saving your progress. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetake = () => {
    videoUrls.forEach(url => URL.revokeObjectURL(url));
    setPhase("freeform_recording");
    setFreeformBlob(null);
    setReadingBlob(null);
    setFreeformAudioBlob(null);
    setReadingAudioBlob(null);
    setFreeformEyeContact(undefined);
    setFreeformExpression(undefined);
    setReadingEyeContact(undefined);
    setReadingExpression(undefined);
    setMetricsList([]);
    setVideoUrls([]);
    setIsSaved(false);
  };

  const isPersonal = activeWorkspace.id === "personal";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center relative">
      {activeRoomId && (
        <Link 
          href={`/rooms/${activeRoomId}`} 
          className="absolute top-12 left-4 sm:left-8 flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white transition-all z-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Room
        </Link>
      )}

      {/* Top Left Controls Row */}
      {user && isPersonal && (phase === "freeform_recording" || phase === "reading_recording") && (
        <div className="w-full flex justify-start items-center gap-2.5 mb-6 flex-wrap z-20">
          {/* Streak Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-extrabold text-xs shadow-[0_0_15px_rgba(249,115,22,0.05)]">
            <Flame className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
            <span>{isLoadingStreak ? "..." : `${streak} ${streak === 1 ? 'day' : 'days'}`}</span>
          </div>

          {/* Daily Challenge Pill Button */}
          <button
            onClick={() => setShowChallengeModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-xs font-semibold text-white transition-all shadow-[0_0_10px_rgba(255,255,255,0.02)]"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
            <span>Daily Challenge</span>
            {completedWarmupToday ? (
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Done
              </span>
            ) : activeTaskId?.startsWith("challenge-") ? (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            ) : null}
          </button>

          {/* PWA Reminders Pill Button */}
          {notificationPermission !== "unsupported" && (
            <button
              onClick={notificationPermission !== "granted" ? handleRequestNotificationPermission : undefined}
              disabled={notificationPermission === "granted" || notificationPermission === "denied"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-xs font-semibold shadow-[0_0_10px_rgba(0,0,0,0.1)] ${
                notificationPermission === "granted"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : notificationPermission === "denied"
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-400 opacity-60 cursor-not-allowed"
                    : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20"
              }`}
            >
              <Bell className={`w-3.5 h-3.5 ${notificationPermission === "granted" ? "fill-emerald-400/20" : ""}`} />
              <span>
                {notificationPermission === "granted"
                  ? "Reminders Active"
                  : notificationPermission === "denied"
                    ? "Reminders Blocked"
                    : "Enable Reminders"}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Dynamic Header */}
      <AnimatePresence mode="wait">
        {!isProcessing && phase !== "results" && phase !== "analyzing" && (
          <motion.div
            key="header"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="text-center mb-12 overflow-hidden float-slow w-full"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 text-zinc-300 text-xs md:text-sm font-medium border border-white/5 mb-4 shadow-[0_0_15px_rgba(255,255,255,0.02)]">
              <Sparkles className="w-4 h-4 text-zinc-400 animate-pulse" />
              {isPersonal ? "Daily Practice Arena" : `Team practice: ${activeWorkspace.name}`}
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold mb-4 text-white tracking-tight">
              {activeTaskId 
                ? (phase === "freeform_recording" ? "Part 1: Speak Freely" : "Part 2: Read Aloud")
                : "Free Speech Sandbox"
              }
            </h1>
            <p className="text-foreground/60 max-w-xl mx-auto font-light leading-relaxed text-sm md:text-base">
              {activeTaskId 
                ? (phase === "freeform_recording" 
                    ? "Speak naturally about the assignment topic for 90 seconds. We will analyze your pacing, clarity, and metrics."
                    : "Now, read the provided text using the teleprompter. We will analyze your pronunciation and articulation.")
                : "Record speech on any topic you like. You'll receive full instant diagnostics, transcripts, and AI suggestions."
              }
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full">
        {/* If viewing results, show full width dashboard for optimal readability */}
        {phase === "results" ? (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            {metricsList.map((m, idx) => (
              <div key={idx} className="mb-12 border-b border-white/5 pb-8 last:border-0">
                <h3 className="text-2xl font-bold mb-6 text-zinc-300">{m.title}</h3>
                <FeedbackDashboard 
                  metrics={m} 
                  videoUrl={videoUrls[idx]} 
                  onSave={saveToProgress}
                  isSaving={isSaving}
                  isSaved={isSaved}
                  onRetake={handleRetake}
                />
                <FluencyCard 
                  metrics={{
                    confidence: m.confidence,
                    clarity: m.clarity,
                    wpm: m.wpm,
                    fillerWords: m.fillerWords
                  }}
                  userName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || "A Speaker"}
                />
              </div>
            ))}
            
            <div className="mt-8 text-center flex flex-col items-center gap-4">
              {isSaved ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  Progress Saved
                </div>
              ) : null}
              
              <Link 
                href={activeRoomId ? `/rooms/${activeRoomId}` : "/profile"}
                className="px-8 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all font-semibold shadow-[0_0_15px_rgba(255,255,255,0.02)]"
              >
                {activeRoomId ? "Return to Room" : "View Profile"}
              </Link>
            </div>
          </motion.div>
        ) : (        /* Main Layout Split Logic */
          <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left side/Centered Recorder Column */}
            <div className={user && !isPersonal ? "lg:col-span-2 flex flex-col items-center w-full" : "lg:col-span-3 flex flex-col items-center w-full"}>
              {isLoadingTask ? (
                <div className="flex flex-col items-center justify-center p-24 w-full glass-panel rounded-3xl border border-white/5">
                  <Loader2 className="w-8 h-8 animate-spin text-white mb-4" />
                  <span className="text-xs font-semibold text-foreground/50 uppercase tracking-widest">Loading Task Details...</span>
                </div>
              ) : phase === "freeform_recording" || phase === "reading_recording" ? (
                <motion.div 
                  key="recorder"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-md"
                >
                  <Recorder 
                    onRecordingComplete={handleRecordingComplete} 
                    isProcessing={isProcessing} 
                    readingText={phase === "reading_recording" ? task?.reading_text : undefined}
                    taskTopic={task?.topic_of_the_day}
                    userId={user?.id}
                    userLevel={user?.user_metadata?.difficulty_level}
                    mode={phase === "reading_recording" ? "reading" : (task?.isChallenge ? "warmup" : "freeform")}
                    timeLimit={task?.timeLimit || 90}
                    wordOfTheDay={task?.word_of_the_day}
                    wordDefinition={task?.definition}
                    tips={task?.tips}
                  />
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center p-24 w-full glass-panel rounded-3xl border border-white/5">
                  <Loader2 className="w-12 h-12 animate-spin text-white mb-6" />
                  <span className="text-lg font-bold text-white">Analyzing your speeches...</span>
                  <span className="text-sm text-foreground/40 mt-2 font-light">This usually takes about 10 seconds.</span>
                </div>
              )}
            </div>

            {/* Right side Column (Team Assignments only) */}
            {user && !isPersonal && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-1 glass-panel p-6 rounded-3xl border border-white/10 bg-[#09090d]/90 backdrop-blur-3xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] w-full"
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    Pending Assignments
                  </h3>
                  {pendingAssignments.length > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {pendingAssignments.length} Left
                    </span>
                  )}
                </div>

                {isLoadingAssignments ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mb-2" />
                    <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Fetching assignments...</span>
                  </div>
                ) : pendingAssignments.length === 0 ? (
                  <div className="text-center py-10 px-4 border border-dashed border-white/5 rounded-2xl">
                    <Sparkles className="w-8 h-8 text-zinc-600 mx-auto mb-3 animate-pulse" />
                    <h4 className="text-xs font-bold text-white mb-1">All Caught Up!</h4>
                    <p className="text-[10px] text-zinc-500 font-light leading-relaxed">
                      No pending mentor assignments in this team. You can continue practicing in sandbox mode.
                    </p>
                    {activeTaskId && (
                      <button
                        onClick={clearAssignment}
                        className="mt-4 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-[10px] text-white font-medium transition-all"
                      >
                        Enter Sandbox Mode
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Sandbox practice toggle */}
                    {activeTaskId && (
                      <button
                        onClick={clearAssignment}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-semibold text-zinc-400 hover:text-white bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all text-left cursor-pointer"
                      >
                        <span>Switch to Sandbox Mode</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Pending Assignments List */}
                    <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                      {pendingAssignments.map((assignment) => {
                        const isActive = activeTaskId === assignment.id;
                        return (
                          <div
                            key={assignment.id}
                            onClick={() => selectAssignment(assignment)}
                            className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                              isActive
                                ? "bg-indigo-500/5 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.08)]"
                                : "bg-white/[0.01] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-400/5 px-2 py-0.5 rounded-md border border-indigo-400/10">
                                {assignment.roomName}
                              </span>
                              <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider ${
                                assignment.isUrgent ? "text-rose-400 animate-pulse" : "text-zinc-500"
                              }`}>
                                <Clock className="w-3 h-3" />
                                {assignment.deadlineText}
                              </span>
                            </div>
                            <h4 className={`text-xs font-bold leading-snug mb-1 truncate ${isActive ? "text-white" : "text-zinc-300"}`}>
                              {assignment.topic_of_the_day}
                            </h4>
                            {assignment.word_of_the_day && (
                              <p className="text-[10px] text-zinc-500 font-light truncate">
                                Word of the day: <strong className="text-zinc-400">{assignment.word_of_the_day}</strong>
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Daily Challenge Modal */}
      <AnimatePresence>
        {showChallengeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChallengeModal(false)}
              className="fixed inset-0 bg-[#09090d]/80 backdrop-blur-sm"
            />
            
            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md glass-panel p-6 rounded-3xl border border-white/10 bg-[#09090d]/95 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-left overflow-hidden z-55"
            >
              {/* Top Close Button */}
              <button
                onClick={() => setShowChallengeModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-zinc-400 hover:text-white transition-all z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-2 mb-5">
                <Sparkles className="w-5 h-5 text-orange-400 animate-pulse" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
                  Daily Warm-up Challenge
                </h3>
              </div>

              {completedWarmupToday ? (
                <div className="space-y-4">
                  <div className="p-6 text-center border border-emerald-500/20 bg-emerald-500/5 rounded-2xl">
                    <Sparkles className="w-10 h-10 text-emerald-400 mx-auto mb-3 animate-bounce" />
                    <h4 className="text-base font-extrabold text-white mb-1.5">Streak Safe! 🔥</h4>
                    <p className="text-xs text-zinc-400 font-light leading-relaxed">
                      You've completed today's warm-up challenge. Keep up the consistency to improve your speaking fluency!
                    </p>
                  </div>
                  <button
                    onClick={() => setShowChallengeModal(false)}
                    className="w-full py-3 rounded-xl bg-white text-zinc-950 font-bold text-xs transition-all hover:bg-zinc-200"
                  >
                    Awesome, thanks!
                  </button>
                </div>
              ) : activeTaskId?.startsWith("challenge-") ? (
                <div className="space-y-4">
                  <div className="p-4 border border-indigo-500/20 bg-indigo-500/5 rounded-2xl">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-400/5 px-2 py-0.5 rounded-md border border-indigo-400/10 uppercase">
                        Active Challenge
                      </span>
                    </div>
                    <h4 className="text-sm font-bold leading-snug text-white mb-2">
                      {selectedChallenge?.prompt}
                    </h4>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[11px] mb-4 text-left leading-relaxed">
                      <span className="font-bold text-indigo-400">Word of the Day:</span>{" "}
                      <strong className="text-white">{selectedChallenge?.word_of_the_day}</strong>
                      <p className="text-zinc-400 font-light mt-0.5 text-[10px]">
                        {selectedChallenge?.definition}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          clearAssignment();
                          setShowChallengeModal(false);
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 transition-all"
                      >
                        Exit Challenge
                      </button>
                      <button
                        onClick={() => setShowChallengeModal(false)}
                        className="flex-1 py-2.5 rounded-xl bg-white text-zinc-950 font-bold text-xs transition-all hover:bg-zinc-200"
                      >
                        Close View
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex justify-between items-start gap-2 mb-2.5">
                      <span className="text-[10px] font-semibold text-zinc-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/10 uppercase">
                        Today's Prompt
                      </span>
                      <span className="text-[10px] font-bold text-zinc-500">
                        {selectedChallenge?.suggestedDuration}s limit
                      </span>
                    </div>
                    <h4 className="text-sm font-extrabold text-white leading-relaxed mb-3">
                      {selectedChallenge?.prompt}
                    </h4>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[11px] mb-4 text-left leading-relaxed">
                      <span className="font-bold text-indigo-400">Word of the Day:</span>{" "}
                      <strong className="text-white">{selectedChallenge?.word_of_the_day}</strong>
                      <p className="text-zinc-400 font-light mt-0.5 text-[10px]">
                        {selectedChallenge?.definition}
                      </p>
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={handleShuffleChallenge}
                        className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-semibold text-xs text-white flex items-center justify-center gap-1.5"
                      >
                        Shuffle
                      </button>
                      <button
                        onClick={startChallenge}
                        className="flex-1 py-2.5 rounded-xl bg-white text-zinc-950 font-bold text-xs transition-all hover:bg-zinc-200 flex items-center justify-center gap-1"
                      >
                        Start Warm-up
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-dashed border-white/5 text-center">
                    <Sparkles className="w-5 h-5 text-zinc-500 mx-auto mb-2 animate-pulse" />
                    <h5 className="text-[11px] font-bold text-white mb-1">Consistency pays off!</h5>
                    <p className="text-[10px] text-zinc-500 font-light leading-relaxed">
                      Explaining a random topic for 30s daily is a proven way to eliminate pacing issues and filter out filler words.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-24 text-zinc-400 font-light">Loading practice environment...</div>}>
      <PracticeContent />
    </Suspense>
  );
}
