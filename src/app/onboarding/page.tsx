"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Target, 
  Mic, 
  Users, 
  Sprout, 
  TrendingUp, 
  Trophy, 
  Sparkles, 
  Volume2, 
  Timer, 
  Ban, 
  Eye, 
  Clock, 
  Loader2, 
  ChevronRight, 
  ChevronLeft 
} from "lucide-react";

interface OnboardingData {
  goal: "interview_prep" | "public_speaking" | "team_presentations" | "personal_growth" | null;
  experience_level: "beginner" | "intermediate" | "advanced" | null;
  focus_metric: "confidence" | "clarity" | "pacing" | "fillers" | "eye_contact" | null;
  practice_duration: 1 | 3 | 5 | null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingData>({
    goal: null,
    experience_level: null,
    focus_metric: null,
    practice_duration: null,
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Redirect if user is not authenticated or already onboarded
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500 dark:text-cyan-400" />
          <p className="text-sm text-slate-500 dark:text-zinc-400">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const handleSelect = <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!formData.goal || !formData.experience_level || !formData.focus_metric || !formData.practice_duration) {
      setErrorMsg("Please complete all onboarding selections.");
      return;
    }
    
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          goal: formData.goal,
          experience_level: formData.experience_level,
          focus_metric: formData.focus_metric,
          practice_duration: formData.practice_duration,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      router.push("/");
      router.refresh();
    } catch (err: any) {
      console.error("Failed to save onboarding data:", err);
      setErrorMsg(err.message || "Failed to save profile preferences. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const isNextDisabled = () => {
    if (step === 1) return !formData.goal;
    if (step === 2) return !formData.experience_level;
    if (step === 3) return !formData.focus_metric;
    if (step === 4) return !formData.practice_duration;
    return true;
  };

  // Steps Slide Animation Configuration
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0
    })
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-[#050508] px-4 py-10 text-slate-800 dark:text-zinc-100 selection:bg-cyan-500/30 transition-colors duration-300">
      
      {/* Container Box */}
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-6 shadow-xl dark:shadow-2xl backdrop-blur-xl md:p-8">
        
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            <span>Profile Onboarding</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-bold">Step {step} of 4</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 dark:bg-zinc-800">
            <motion.div 
              className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400 dark:from-cyan-500 dark:to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.3)] dark:shadow-[0_0_8px_rgba(34,211,238,0.4)]"
              initial={{ width: "25%" }}
              animate={{ width: `${step * 25}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/5 dark:bg-red-950/20 p-3 text-sm text-red-600 dark:text-red-400">
            {errorMsg}
          </div>
        )}

        {/* Dynamic Step Content */}
        <div className="relative min-h-[300px] overflow-hidden py-2">
          <AnimatePresence mode="wait" custom={step}>
            <motion.div
              key={step}
              custom={step}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="w-full"
            >
              
              {/* STEP 1: GOALS */}
              {step === 1 && (
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
                    What brings you to SpeakMirror?
                  </h1>
                  <p className="mt-1.5 text-sm text-slate-500 dark:text-zinc-400">
                    We will personalize your speaking prompts and coach feedback around this goal.
                  </p>
                  
                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      { id: "interview_prep", label: "Interview Prep", icon: Target, desc: "Prepare for job interviews" },
                      { id: "public_speaking", label: "Public Speaking", icon: Mic, desc: "Deliver speeches with power" },
                      { id: "team_presentations", label: "Team Presentations", icon: Users, desc: "Succeed at meetings & reviews" },
                      { id: "personal_growth", label: "Personal Growth", icon: Sprout, desc: "Improve daily communication" }
                    ].map(item => {
                      const Icon = item.icon;
                      const isSelected = formData.goal === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect("goal", item.id as any)}
                          className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all duration-200 hover:border-slate-350 hover:bg-slate-50/50 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/30 cursor-pointer ${
                            isSelected 
                              ? "border-cyan-500 bg-cyan-500/5 dark:bg-cyan-950/10 shadow-[0_0_15px_rgba(6,182,212,0.06)] dark:shadow-[0_0_15px_rgba(6,182,212,0.1)] ring-1 ring-cyan-500" 
                              : "border-slate-200 bg-slate-50/20 dark:border-zinc-800 dark:bg-zinc-900/30"
                          }`}
                        >
                          <div className={`rounded-lg p-2 ${isSelected ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" : "bg-slate-200 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <span className="mt-3 font-semibold text-slate-900 dark:text-zinc-100">{item.label}</span>
                          <span className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{item.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 2: EXPERIENCE */}
              {step === 2 && (
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
                    How would you rate your speaking confidence?
                  </h1>
                  <p className="mt-1.5 text-sm text-slate-500 dark:text-zinc-400">
                    Choose a speaking level that reflects your current comfort.
                  </p>
                  
                  <div className="mt-6 flex flex-col gap-3">
                    {[
                      { id: "beginner", label: "Beginner", icon: Sprout, desc: "I get nervous speaking in front of others." },
                      { id: "intermediate", label: "Intermediate", icon: TrendingUp, desc: "I can hold my own in meetings but want more impact." },
                      { id: "advanced", label: "Advanced", icon: Trophy, desc: "I want to fine-tune my pacing, emotional delivery, & filler words." }
                    ].map(item => {
                      const Icon = item.icon;
                      const isSelected = formData.experience_level === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect("experience_level", item.id as any)}
                          className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200 hover:border-slate-350 hover:bg-slate-50/50 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/30 cursor-pointer ${
                            isSelected 
                              ? "border-cyan-500 bg-cyan-500/5 dark:bg-cyan-950/10 shadow-[0_0_15px_rgba(6,182,212,0.06)] dark:shadow-[0_0_15px_rgba(6,182,212,0.1)] ring-1 ring-cyan-500" 
                              : "border-slate-200 bg-slate-50/20 dark:border-zinc-800 dark:bg-zinc-900/30"
                          }`}
                        >
                          <div className={`rounded-lg p-2 ${isSelected ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" : "bg-slate-200 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-zinc-100">{item.label}</span>
                            <span className="block mt-0.5 text-xs text-slate-500 dark:text-zinc-400">{item.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 3: FOCUS METRIC */}
              {step === 3 && (
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
                    What do you most want to improve?
                  </h1>
                  <p className="mt-1.5 text-sm text-slate-500 dark:text-zinc-400">
                    We will prioritize tracking and highlighting this metric during analysis.
                  </p>
                  
                  <div className="mt-6 flex flex-col gap-2.5">
                    {[
                      { id: "confidence", label: "Confidence", icon: Sparkles, desc: "Develop a strong posture and assertive presentation style" },
                      { id: "clarity", label: "Clarity", icon: Volume2, desc: "Speak clearly and articulate words distinctly" },
                      { id: "pacing", label: "Pacing", icon: Timer, desc: "Maintain a steady speaking rhythm (words per minute)" },
                      { id: "fillers", label: "Filler Words", icon: Ban, desc: "Eliminate repetitive 'um', 'ah', and 'like' filler phrases" },
                      { id: "eye_contact", label: "Eye Contact", icon: Eye, desc: "Maintain connection with the camera and mirror audience" }
                    ].map(item => {
                      const Icon = item.icon;
                      const isSelected = formData.focus_metric === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect("focus_metric", item.id as any)}
                          className={`flex items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition-all duration-200 hover:border-slate-350 hover:bg-slate-50/50 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/30 cursor-pointer ${
                            isSelected 
                              ? "border-cyan-500 bg-cyan-500/5 dark:bg-cyan-950/10 shadow-[0_0_15px_rgba(6,182,212,0.06)] dark:shadow-[0_0_15px_rgba(6,182,212,0.1)] ring-1 ring-cyan-500" 
                              : "border-slate-200 bg-slate-50/20 dark:border-zinc-800 dark:bg-zinc-900/30"
                          }`}
                        >
                          <div className={`rounded-lg p-2 ${isSelected ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" : "bg-slate-200 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-zinc-100">{item.label}</span>
                            <span className="block mt-0.5 text-xs text-slate-500 dark:text-zinc-400">{item.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 4: PRACTICE DURATION */}
              {step === 4 && (
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
                    How long can you practice each day?
                  </h1>
                  <p className="mt-1.5 text-sm text-slate-500 dark:text-zinc-400">
                    Setting a daily goal keeps you focused and builds streak consistency.
                  </p>
                  
                  <div className="mt-8 flex flex-col gap-4">
                    {[
                      { id: 1, label: "1 min", sub: "Quick burst", desc: "Great for building a daily habit without friction" },
                      { id: 3, label: "3 min", sub: "Standard", desc: "The recommended daily amount for continuous speaking improvement" },
                      { id: 5, label: "5 min", sub: "Deep practice", desc: "Intense, philosophical prompt structures and detailed analytics" }
                    ].map(item => {
                      const isSelected = formData.practice_duration === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect("practice_duration", item.id as any)}
                          className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all duration-200 hover:border-slate-350 hover:bg-slate-50/50 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/30 cursor-pointer ${
                            isSelected 
                              ? "border-cyan-500 bg-cyan-500/5 dark:bg-cyan-950/10 shadow-[0_0_15px_rgba(6,182,212,0.06)] dark:shadow-[0_0_15px_rgba(6,182,212,0.1)] ring-1 ring-cyan-500" 
                              : "border-slate-200 bg-slate-50/20 dark:border-zinc-800 dark:bg-zinc-900/30"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Clock className={`h-5 w-5 ${isSelected ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400 dark:text-zinc-500"}`} />
                            <div>
                              <span className="font-semibold text-slate-900 dark:text-zinc-100">{item.label}</span>
                              <span className="ml-2 rounded bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-750">
                                {item.sub}
                              </span>
                              <span className="block mt-1 text-xs text-slate-500 dark:text-zinc-400">{item.desc}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Wizard Navigation Footer */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-200 dark:border-zinc-850 pt-6">
          <button
            onClick={handleBack}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer ${
              step === 1 ? "invisible" : ""
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          
          {step < 4 ? (
            <button
              onClick={handleNext}
              disabled={isNextDisabled()}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-500 text-zinc-950 px-5 py-2 text-sm font-semibold shadow-[0_4px_12px_rgba(6,182,212,0.15)] dark:shadow-[0_4px_12px_rgba(6,182,212,0.2)] transition-all hover:bg-cyan-400 disabled:opacity-50 disabled:hover:bg-cyan-500 disabled:shadow-none cursor-pointer"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isNextDisabled() || isSaving}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-400 dark:from-cyan-500 dark:to-cyan-400 text-zinc-950 px-6 py-2 text-sm font-semibold shadow-[0_4px_12px_rgba(6,182,212,0.2)] dark:shadow-[0_4px_12px_rgba(6,182,212,0.3)] transition-all hover:from-cyan-550 hover:to-cyan-350 disabled:opacity-50 disabled:hover:from-cyan-600 disabled:hover:to-cyan-400 disabled:shadow-none cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Let's Go!"
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
