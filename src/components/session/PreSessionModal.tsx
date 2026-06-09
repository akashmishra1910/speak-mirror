"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, Mic, Clock, MessageSquare, Eye, X, ArrowLeft, ArrowRight, 
  Flame, Sparkles, ShieldCheck, UserCheck, Play 
} from "lucide-react";
import { BreathingExercise } from "./BreathingExercise";

interface PreSessionModalProps {
  focusMetric: string | null;
  goal: string | null;
  experienceLevel: string | null;
  practiceDuration: number;
  streak: number;
  taskTopic: string;
  isFirstSession: boolean;
  onStartRecording: () => void;
  onClose: () => void;
}

export function PreSessionModal({
  focusMetric,
  goal,
  experienceLevel,
  practiceDuration,
  streak,
  taskTopic,
  isFirstSession,
  onStartRecording,
  onClose,
}: PreSessionModalProps) {
  const [screen, setScreen] = useState<number>(1);
  const [breathingStep, setBreathingStep] = useState<string>("inhale");

  const [focusTip, setFocusTip] = useState<string>("");
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [assignedDifficulty, setAssignedDifficulty] = useState<string | null>(null);
  const [difficultyExplanation, setDifficultyExplanation] = useState<string | null>(null);
  const [isLoadingWarmup, setIsLoadingWarmup] = useState<boolean>(true);

  // Fetch AI focus tip, dynamic difficulty, and previous performance insights
  useEffect(() => {
    const cacheKey = `warmup-brief-${focusMetric}-${goal}-${experienceLevel}-${streak}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        setFocusTip(data.focusTip);
        setAiInsight(data.aiInsight);
        setAssignedDifficulty(data.assignedDifficulty);
        setDifficultyExplanation(data.explanation);
        setIsLoadingWarmup(false);
        return;
      } catch (e) {
        console.error("Error parsing cached warmup data:", e);
      }
    }

    async function loadWarmupData() {
      try {
        const res = await fetch("/api/session-warmup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            focusMetric,
            goal,
            experienceLevel,
            streak,
            taskTopic
          })
        });
        if (res.ok) {
          const data = await res.json();
          setFocusTip(data.focusTip);
          setAiInsight(data.aiInsight);
          setAssignedDifficulty(data.assignedDifficulty);
          setDifficultyExplanation(data.explanation);
          
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
        }
      } catch (err) {
        console.error("Failed to load warmup details:", err);
      } finally {
        setIsLoadingWarmup(false);
      }
    }

    loadWarmupData();
  }, [focusMetric, goal, experienceLevel, streak, taskTopic]);

  // Screen 1: Focus Reminder - 3 seconds auto-advance
  useEffect(() => {
    if (screen !== 1) return;
    const timer = setTimeout(() => {
      setScreen(2);
    }, 3000);
    return () => clearTimeout(timer);
  }, [screen]);

  // Map focus metrics to icons, names, and tips
  const getMetricDetails = () => {
    const metric = focusMetric?.toLowerCase() || "confidence";
    switch (metric) {
      case "confidence":
        return {
          name: "Confidence",
          icon: <Zap className="w-16 h-16 text-amber-500 fill-amber-500/20" />,
          tip: "Start strong — your first 10 seconds set the tone"
        };
      case "clarity":
        return {
          name: "Clarity",
          icon: <Mic className="w-16 h-16 text-emerald-500" />,
          tip: "Shorter sentences land harder than long ones"
        };
      case "pacing":
        return {
          name: "Pacing",
          icon: <Clock className="w-16 h-16 text-indigo-500" />,
          tip: "Speak slower than feels natural — it sounds better"
        };
      case "fillers":
        return {
          name: "Filler Words",
          icon: <MessageSquare className="w-16 h-16 text-cyan-500" />,
          tip: "Try pausing instead of saying um or uh"
        };
      case "eye_contact":
      case "eye contact":
        return {
          name: "Eye Contact",
          icon: <Eye className="w-16 h-16 text-sky-500" />,
          tip: "Look directly at the camera, not the screen"
        };
      default:
        return {
          name: "Confidence",
          icon: <Zap className="w-16 h-16 text-amber-500 fill-amber-500/20" />,
          tip: "Start strong — your first 10 seconds set the tone"
        };
    }
  };

  const metricDetails = getMetricDetails();

  // Get Goal text formatted
  const getGoalLabel = () => {
    if (!goal) return "Personal Growth";
    return goal.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  // Get Difficulty based on experience level
  const getDifficultyBadge = () => {
    const level = (assignedDifficulty || experienceLevel || "intermediate").toLowerCase();
    switch (level) {
      case "beginner":
      case "easy":
        return <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">Easy</span>;
      case "advanced":
      case "hard":
        return <span className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold">Hard</span>;
      default:
        return <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">Medium</span>;
    }
  };

  // Background overlay dimming level
  const getBgClass = () => {
    if (screen === 2 && breathingStep === "inhale") {
      return "bg-[#020204]/95 backdrop-blur-lg"; // extra dim during inhale
    }
    return "bg-[#050508]/90 backdrop-blur-md"; // normal overlay
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 flex items-center justify-center transition-colors duration-1000 ${getBgClass()}`}
    >
      {/* Top controls: Skip buttons (available on Screen 1 & 2) */}
      {(screen === 1 || screen === 2) && (
        <button
          onClick={() => setScreen(3)}
          className="absolute top-8 right-8 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-all text-xs font-bold cursor-pointer"
        >
          <span>Skip Warm-up</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Main Container */}
      <div className="w-full max-w-lg px-6 flex flex-col items-center justify-center min-h-[50vh]">
        <AnimatePresence mode="wait">
          
          {/* SCREEN 1: FOCUS REMINDER */}
          {screen === 1 && (
            <motion.div
              key="screen-1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => setScreen(2)}
              className="flex flex-col items-center text-center cursor-pointer w-full"
            >
              {isFirstSession ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/25 mb-4 animate-pulse">
                    <Sparkles className="w-10 h-10" />
                  </div>
                  <h2 className="text-3xl font-extrabold text-white">Your first session 🎉</h2>
                  <p className="text-slate-400 text-sm font-light leading-relaxed max-w-sm mt-1">
                    Don't worry about being perfect — just speak naturally.
                  </p>
                  <div className="mt-4 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-zinc-400 uppercase tracking-widest">
                    Stated Goal: {getGoalLabel()}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-5">
                  <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/5 shadow-2xl mb-2">
                    {metricDetails.icon}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 font-mono">
                      Today's focus: {metricDetails.name}
                    </span>
                    <h2 className="text-2xl font-bold text-white">Focus Area</h2>
                    {isLoadingWarmup ? (
                      <div className="flex flex-col gap-2 mt-4 items-center w-full max-w-[280px]">
                        <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
                        <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
                      </div>
                    ) : (
                      <p className="text-slate-300 text-base md:text-lg italic font-light leading-relaxed mt-2 max-w-sm animate-fade-in">
                        "{focusTip || metricDetails.tip}"
                      </p>
                    )}
                  </div>
                </div>
              )}
              <span className="text-[9px] text-zinc-650 uppercase font-mono tracking-widest mt-12 animate-pulse">
                Tap anywhere to advance
              </span>
            </motion.div>
          )}

          {/* SCREEN 2: BREATHING EXERCISE */}
          {screen === 2 && (
            <motion.div
              key="screen-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center"
            >
              <div className="text-center mb-10">
                <h2 className="text-2xl font-bold text-white mb-2">Take a breath before you begin</h2>
                <p className="text-slate-400 text-xs font-light">Relax your shoulders and sync with the circle.</p>
              </div>

              <BreathingExercise
                onStepChange={setBreathingStep}
                onComplete={() => setScreen(3)}
              />
            </motion.div>
          )}

          {/* SCREEN 3: SESSION BRIEF */}
          {screen === 3 && (
            <motion.div
              key="screen-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 bg-white/[0.02] shadow-[0_15px_40px_rgba(0,0,0,0.6)] w-full text-left flex flex-col gap-6"
            >
              {/* Header */}
              <div className="flex flex-col border-b border-white/5 pb-4 gap-1.5">
                <div className="flex items-center justify-between w-full">
                  <h3 className="text-lg font-bold text-white">Session Brief</h3>
                  <div className="flex items-center gap-2">
                    {getDifficultyBadge()}
                    <span className="px-2.5 py-1 rounded bg-white/5 text-zinc-300 border border-white/10 text-xs font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {practiceDuration} min
                    </span>
                  </div>
                </div>
                {difficultyExplanation && (
                  <span className="text-[10px] text-zinc-400 font-light italic mt-0.5">
                    {difficultyExplanation}
                  </span>
                )}
              </div>

              {/* Task/Topic Details */}
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500">// prompt_topic</span>
                <p className="text-slate-200 text-sm font-semibold leading-relaxed">
                  {taskTopic}
                </p>
              </div>

              {/* AI Insight Alert */}
              {aiInsight && (
                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex flex-col gap-1.5 mt-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    AI Coach Insight
                  </div>
                  <p className="text-slate-350 text-[11px] font-light leading-relaxed">
                    {aiInsight}
                  </p>
                </div>
              )}

              {/* First Session Guidance OR Streak */}
              {isFirstSession ? (
                <div className="p-4 rounded-2xl bg-sky-500/5 border border-sky-500/10 flex flex-col gap-2.5 mt-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
                    <ShieldCheck className="w-4 h-4" />
                    Safe Speaking Space
                  </div>
                  <ul className="space-y-1 text-slate-450 text-[11px] font-light leading-relaxed">
                    <li>• Results are 100% private to you.</li>
                    <li>• Your AI coach will generate specific guidance after completion.</li>
                  </ul>
                </div>
              ) : (
                streak > 1 && (
                  <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2.5">
                      <Flame className="w-5 h-5 text-orange-500 fill-orange-500 animate-bounce" />
                      <div>
                        <div className="text-xs font-bold text-orange-400">Streak Active</div>
                        <div className="text-[10px] text-slate-400 font-light mt-0.5">Keep your streak count alive!</div>
                      </div>
                    </div>
                    <span className="text-base font-black text-white">{streak} days</span>
                  </div>
                )
              )}

              {/* CTAs */}
              <div className="flex items-center justify-between mt-4 border-t border-white/5 pt-6 gap-4">
                <button
                  onClick={() => setScreen(2)}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white/60 hover:text-white transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <button
                  onClick={onStartRecording}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-500 hover:to-indigo-600 text-white text-xs font-bold rounded-xl shadow-[0_4px_12px_rgba(99,102,241,0.2)] hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Start Recording
                </button>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}
