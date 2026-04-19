"use client";

import { useState } from "react";
import { Recorder } from "@/components/Recorder";
import { FeedbackDashboard, AnalysisMetrics } from "@/components/FeedbackDashboard";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { useEffect, Suspense } from "react";

function PracticeContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId");
  const taskId = searchParams.get("taskId");
  const [task, setTask] = useState<any>(null);
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

  useEffect(() => {
    async function fetchTask() {
      if (!taskId) {
        setIsLoadingTask(false);
        return;
      }
      const { data } = await supabase.from("room_tasks").select("*").eq("id", taskId).single();
      if (data) setTask(data);
      setIsLoadingTask(false);
    }
    fetchTask();
  }, [taskId]);

  const handleRecordingComplete = async (mediaBlob: Blob) => {
    if (taskId && phase === "freeform_recording") {
      setFreeformBlob(mediaBlob);
      setPhase("reading_recording");
      return;
    }

    if (taskId && phase === "reading_recording") {
      setReadingBlob(mediaBlob);
      setPhase("analyzing");
      processRecordings(freeformBlob!, mediaBlob);
      return;
    }

    if (!taskId) {
      setFreeformBlob(mediaBlob);
      setPhase("analyzing");
      processRecordings(mediaBlob, null);
    }
  };

  const processRecordings = async (freeform: Blob, reading: Blob | null) => {
    setIsProcessing(true);
    setMetricsList([]);

    try {
      const newMetrics: AnalysisMetrics[] = [];
      const newUrls: string[] = [];

      // Create Local Object URLs for playback (no upload yet)
      const freeformUrl = URL.createObjectURL(freeform);
      newUrls.push(freeformUrl);

      // 1. Process Freeform AI Analysis
      const formData1 = new FormData();
      formData1.append("audio", freeform, "recording.webm");
      const res1 = await fetch("/api/analyze", { method: "POST", body: formData1 });
      const analysis1 = await res1.json();
      if (!res1.ok) throw new Error(analysis1.error || "Failed to analyze freeform speech");
      analysis1.title = "Freeform Speech";
      newMetrics.push(analysis1);

      // 2. Process Reading AI Analysis if it exists
      if (reading && task?.reading_text) {
        const readingUrl = URL.createObjectURL(reading);
        newUrls.push(readingUrl);

        const formData2 = new FormData();
        formData2.append("audio", reading, "recording.webm");
        formData2.append("expectedText", task.reading_text);
        const res2 = await fetch("/api/analyze", { method: "POST", body: formData2 });
        const analysis2 = await res2.json();
        if (!res2.ok) throw new Error(analysis2.error || "Failed to analyze reading speech");
        analysis2.title = "Reading Aloud";
        newMetrics.push(analysis2);
      }

      setMetricsList(newMetrics);
      setVideoUrls(newUrls);
      setPhase("results");
      setIsSaved(false);
    } catch (err) {
      console.error("Error processing:", err);
      alert("An error occurred during analysis. Check console.");
    } finally {
      setIsProcessing(false);
    }
  };

  const saveToProgress = async () => {
    if (isSaved || !user || !freeformBlob) return;
    setIsSaving(true);
    
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        // Upload Freeform
        const freeformFileName = `video_${Date.now()}_freeform.webm`;
        const { data: upload1 } = await supabase.storage.from('videos').upload(freeformFileName, freeformBlob, { contentType: 'video/webm' });
        const url1 = upload1 ? freeformFileName : null;
        
        if (url1 && metricsList[0]) {
          await supabase.from('recordings').insert({
            user_id: user.id, room_id: roomId || null, task_id: taskId || null,
            video_url: url1, confidence: metricsList[0].confidence, clarity: metricsList[0].clarity,
            topic: task?.topic_of_the_day || "Free Practice",
            recording_type: 'freeform'
          });
        }

        // Upload Reading
        if (readingBlob && metricsList[1]) {
          const readingFileName = `video_${Date.now()}_reading.webm`;
          const { data: upload2 } = await supabase.storage.from('videos').upload(readingFileName, readingBlob, { contentType: 'video/webm' });
          const url2 = upload2 ? readingFileName : null;
          
          if (url2) {
            await supabase.from('recordings').insert({
              user_id: user.id, room_id: roomId || null, task_id: taskId || null,
              video_url: url2, confidence: metricsList[1].confidence, clarity: metricsList[1].clarity,
              topic: `Reading: ${task?.topic_of_the_day}`,
              recording_type: 'reading'
            });
          }
        }
        
        setIsSaved(true);
      }
    } catch (error) {
      console.error("Error saving recording:", error);
      alert("There was an error saving your progress. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetake = () => {
    // Revoke object URLs to prevent memory leaks
    videoUrls.forEach(url => URL.revokeObjectURL(url));
    
    setPhase("freeform_recording");
    setFreeformBlob(null);
    setReadingBlob(null);
    setMetricsList([]);
    setVideoUrls([]);
    setIsSaved(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center relative">
      {roomId && (
        <Link href={`/rooms/${roomId}`} className="absolute top-12 left-4 sm:left-8 flex items-center gap-2 text-sm font-medium text-foreground/60 hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Room
        </Link>
      )}
      
      <AnimatePresence mode="wait">
        {!isProcessing && phase !== "results" && phase !== "analyzing" && (
          <motion.div
            key="header"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="text-center mb-12 overflow-hidden"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface text-brand-400 text-sm font-medium border border-surface-border mb-4">
              <Sparkles className="w-4 h-4" />
              {roomId ? "Team Practice" : "Daily Practice"}
            </span>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {phase === "freeform_recording" ? "Part 1: Speak Freely" : "Part 2: Read Aloud"}
            </h1>
            <p className="text-foreground/70 max-w-xl mx-auto">
              {phase === "freeform_recording" 
                ? "Speak naturally about the topic for 90 seconds. We'll analyze your pacing, clarity, and filler words."
                : "Now, read the provided text using the teleprompter. We'll specifically analyze your pronunciation and articulation."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full flex flex-col items-center">
        {isLoadingTask ? (
          <div className="flex flex-col items-center justify-center p-24">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-4" />
            <span className="text-sm font-medium text-foreground/70 uppercase tracking-widest">Loading Task...</span>
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
              mode={phase === "reading_recording" ? "reading" : "freeform"}
            />
          </motion.div>
        ) : phase === "analyzing" ? (
          <div className="flex flex-col items-center justify-center p-24">
            <Loader2 className="w-12 h-12 animate-spin text-brand-500 mb-6" />
            <span className="text-lg font-bold text-foreground">Analyzing your speeches...</span>
            <span className="text-sm text-foreground/50 mt-2">This usually takes about 10 seconds.</span>
          </div>
        ) : (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            {metricsList.map((m, idx) => (
              <div key={idx} className="mb-12 border-b border-surface-border pb-8 last:border-0">
                <h3 className="text-2xl font-bold mb-6 text-brand-400">{m.title}</h3>
                <FeedbackDashboard 
                  metrics={m} 
                  videoUrl={videoUrls[idx]} 
                  onSave={saveToProgress}
                  isSaving={isSaving}
                  isSaved={isSaved}
                  onRetake={handleRetake}
                />
              </div>
            ))}
            
            <div className="mt-8 text-center flex flex-col items-center gap-4">
              {isSaved ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 text-green-400 font-medium">
                  <Sparkles className="w-4 h-4" />
                  Progress Saved
                </div>
              ) : null}
              
              <Link 
                href={roomId ? `/rooms/${roomId}` : "/profile"}
                className="px-8 py-3 rounded-xl bg-surface border border-surface-border hover:bg-surface-border transition-colors font-semibold"
              >
                {roomId ? "Return to Room" : "View Profile"}
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-24">Loading practice environment...</div>}>
      <PracticeContent />
    </Suspense>
  );
}
