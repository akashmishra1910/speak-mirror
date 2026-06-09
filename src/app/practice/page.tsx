"use client";

import { useState } from "react";
import { Recorder } from "@/components/Recorder";
import { AnalysisMetrics } from "@/components/FeedbackDashboard";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useEffect, Suspense, useRef, useCallback } from "react";
import { dailyChallenges, getRandomChallenge, Challenge } from "@/lib/challenges";

// Modular Subcomponents
import { PromptSelector } from "@/components/practice/PromptSelector";
import { AnalysisLoader } from "@/components/practice/AnalysisLoader";
import { AnalysisResults } from "@/components/practice/AnalysisResults";
import { PendingAssignments } from "@/components/practice/PendingAssignments";
import { ChallengeModal } from "@/components/practice/ChallengeModal";
import { ToastNotification, Toast } from "@/components/practice/ToastNotification";

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

  // Export high-quality video blobs
  const [freeformExportBlob, setFreeformExportBlob] = useState<Blob | null>(null);
  const [readingExportBlob, setReadingExportBlob] = useState<Blob | null>(null);

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

  const selectAssignment = (assignment: any) => {
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
    expressionScoreAvg?: number,
    exportVideoBlob?: Blob
  ) => {
    const isReading = activeTaskId && phase === "reading_recording";

    if (isReading) {
      setReadingBlob(videoBlob);
      setReadingAudioBlob(audioBlob);
      setReadingExportBlob(exportVideoBlob || null);
    } else {
      setFreeformBlob(videoBlob);
      setFreeformAudioBlob(audioBlob);
      setFreeformExportBlob(exportVideoBlob || null);
    }

    if (activeTaskId && phase === "freeform_recording") {
      setFreeformEyeContact(eyeContactAvg);
      setFreeformExpression(expressionScoreAvg);
      
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
          exportVideoBlob
        );
        return;
      }
      setPhase("reading_recording");
      return;
    }

    if (activeTaskId && phase === "reading_recording") {
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
        expressionScoreAvg,
        freeformExportBlob || undefined,
        exportVideoBlob
      );
      return;
    }

    if (!activeTaskId) {
      setFreeformEyeContact(eyeContactAvg);
      setFreeformExpression(expressionScoreAvg);
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
        exportVideoBlob
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
    readingExportVideo?: Blob
  ) => {
    setIsProcessing(true);
    setMetricsList([]);

    try {
      const newMetrics: AnalysisMetrics[] = [];
      const newUrls: string[] = [];

      const freeformUrl = URL.createObjectURL(freeformExportVideo || freeformVideo);
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
      // Unwrap response to matches feed format
      const realData1 = analysis1.success && analysis1.data ? analysis1.data : analysis1;
      realData1.title = "Freeform Speech";
      realData1.eyeContact = ffEyeContact;
      realData1.expressionScore = ffExpression;
      newMetrics.push(realData1);

      if (readingAudio && readingVideo && task?.reading_text) {
        const readingUrl = URL.createObjectURL(readingExportVideo || readingVideo);
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
        const realData2 = analysis2.success && analysis2.data ? analysis2.data : analysis2;
        realData2.title = "Reading Aloud";
        realData2.eyeContact = rdEyeContact;
        realData2.expressionScore = rdExpression;
        newMetrics.push(realData2);
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
            annotations: metricsList[0].annotations || null
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
              annotations: metricsList[1].annotations || null
            }).select('id').single();

            if (err2) throw err2;
            if (rec2?.id) {
              fetchCoachComment(rec2.id, 1);
            }
          }
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
    videoUrls.forEach(url => URL.revokeObjectURL(url));
    setPhase("freeform_recording");
    setFreeformExportBlob(null);
    setReadingExportBlob(null);
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
      {/* 1. Prompt Selector & Header Area */}
      <PromptSelector
        activeRoomId={activeRoomId}
        activeTaskId={activeTaskId}
        isPersonal={isPersonal}
        phase={phase}
        streak={streak}
        isLoadingStreak={isLoadingStreak}
        completedWarmupToday={completedWarmupToday}
        notificationPermission={notificationPermission}
        onRequestNotificationPermission={handleRequestNotificationPermission}
        onShowChallengeModal={() => setShowChallengeModal(true)}
        taskTopic={task?.topic_of_the_day}
        activeWorkspaceName={activeWorkspace.name}
      />

      <div className="w-full">
        {/* 2. Analysis Results View */}
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

        {/* 3. Recording Phase View */}
        {phase !== "results" && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left Column: Recording Sandbox */}
            <div className={user && !isPersonal ? "lg:col-span-2 flex flex-col items-center w-full" : "lg:col-span-3 flex flex-col items-center w-full"}>
              
              {/* Loader overlay during Llama 3 analysis */}
              <AnalysisLoader phase={phase} />

              {isLoadingTask ? (
                <div className="flex flex-col items-center justify-center p-24 w-full glass-panel rounded-3xl dark:border-white/5">
                  <Loader2 className="w-8 h-8 animate-spin text-themeText dark:text-white mb-4" />
                  <span className="text-xs font-semibold text-slate-500 dark:text-foreground/50 uppercase tracking-widest">Loading Task Details...</span>
                </div>
              ) : (phase === "freeform_recording" || phase === "reading_recording") && (
                <div className="w-full max-w-md">
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
                </div>
              )}
            </div>

            {/* Right Column: Pending Team Assignments list */}
            <PendingAssignments
              isPersonal={isPersonal}
              activeTaskId={activeTaskId}
              isLoadingAssignments={isLoadingAssignments}
              pendingAssignments={pendingAssignments}
              onClearAssignment={clearAssignment}
              onSelectAssignment={selectAssignment}
            />
          </div>
        )}
      </div>

      {/* 4. Challenge Selector Modal */}
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

      {/* 5. Custom Toast HUD */}
      <ToastNotification toasts={toasts} />
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
