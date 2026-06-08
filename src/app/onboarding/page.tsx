"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, MessageSquare, Presentation, TrendingUp, Award } from "lucide-react";

type GoalType = "Interview prep" | "Public speaking" | "Team presentations" | "Personal growth";
type ExperienceLevelType = "Beginner" | "Intermediate" | "Advanced";

export default function OnboardingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState<GoalType | "">("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevelType | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default display name from user metadata when user loads
  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setDisplayName(user.user_metadata.full_name);
    }
  }, [user]);

  // Redirect if not logged in and done loading
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth");
    }
  }, [user, isLoading, router]);

  const handleNext = () => {
    if (step === 1 && !displayName.trim()) {
      setError("Please enter your display name.");
      return;
    }
    if (step === 2 && !primaryGoal) {
      setError("Please select a primary goal.");
      return;
    }
    setError(null);
    setStep(step + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep(step - 1);
  };

  const handleComplete = async () => {
    if (!experienceLevel) {
      setError("Please select an experience level.");
      return;
    }
    if (!user) return;

    setSubmitting(true);
    setError(null);

    try {
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          display_name: displayName,
          primary_goal: primaryGoal,
          experience_level: experienceLevel,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        });

      if (upsertError) throw upsertError;

      // Update auth user metadata full_name if changed
      if (displayName !== user.user_metadata?.full_name) {
        await supabase.auth.updateUser({
          data: { full_name: displayName }
        });
      }

      router.push("/");
    } catch (err: any) {
      setError(err.message || "An error occurred while saving your onboarding details.");
      setSubmitting(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#050508]">
        <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
      </div>
    );
  }

  const progressPercentage = (step / 3) * 100;

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] rounded-full bg-sky-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[40vw] h-[40vw] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      {/* Progress Bar Container */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex justify-between items-center text-xs text-zinc-400 mb-2.5 font-mono">
          <span>STEP {step} OF 3</span>
          <span>{Math.round(progressPercentage)}% COMPLETED</span>
        </div>
        <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-white/5">
          <motion.div
            className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Main card */}
      <div className="w-full max-w-lg glass-panel p-8 md:p-10 rounded-[2.5rem] border border-white/5 bg-zinc-950/40 backdrop-blur-xl relative shadow-2xl">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm mb-6 text-center">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-6"
            >
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold mb-2 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Welcome to Speak Mirror!</h2>
                <p className="text-zinc-400 text-sm font-light">Let's verify your display name so we know how to address you.</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium ml-1 text-zinc-300">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-white/5 border border-white/5 focus:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:bg-white/10 transition-all text-white placeholder-zinc-500 font-light text-base"
                  autoFocus
                />
              </div>

              <button
                onClick={handleNext}
                className="w-full bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-500 hover:to-indigo-600 text-white font-semibold py-4 rounded-2xl mt-4 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-lg shadow-sky-500/10"
              >
                Next Step
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-6"
            >
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold mb-2 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">What brings you here?</h2>
                <p className="text-zinc-400 text-sm font-light">Select the primary goal you would like to focus on.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {[
                  { id: "Interview prep", icon: Sparkles, title: "Interview Prep", desc: "Polish pacing & reduce speech fillers for interviews" },
                  { id: "Public speaking", icon: MessageSquare, title: "Public Speaking", desc: "Build projection & audience engagement skills" },
                  { id: "Team presentations", icon: Presentation, title: "Presentations", desc: "Speak clearly & present professionally in teams" },
                  { id: "Personal growth", icon: TrendingUp, title: "Personal Growth", desc: "Reduce speaking anxiety & build daily confidence" }
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = primaryGoal === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setPrimaryGoal(item.id as GoalType);
                        setError(null);
                      }}
                      className={`flex flex-col text-left p-5 rounded-2xl border transition-all cursor-pointer select-none ${isSelected ? 'border-sky-400 bg-sky-500/10 shadow-[0_0_15px_rgba(56,189,248,0.15)]' : 'border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10'}`}
                    >
                      <Icon className={`w-6 h-6 mb-3 ${isSelected ? 'text-sky-400' : 'text-zinc-400'}`} />
                      <span className="font-bold text-sm block mb-1 text-white">{item.title}</span>
                      <span className="text-xs text-zinc-405 leading-relaxed font-light">{item.desc}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleBack}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold py-4 rounded-2xl transition-all cursor-pointer text-center"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-500 hover:to-indigo-600 text-white font-semibold py-4 rounded-2xl transition-all cursor-pointer text-center"
                >
                  Next Step
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-6"
            >
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold mb-2 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Rate your speaking level</h2>
                <p className="text-zinc-400 text-sm font-light">Help us calibrate the speech pacing guidelines for you.</p>
              </div>

              <div className="flex flex-col gap-3">
                {[
                  { id: "Beginner", title: "Beginner Speaker", desc: "Want to focus on building core speaking confidence and clarity." },
                  { id: "Intermediate", title: "Comfortable Speaker", desc: "Looking to polish delivery rhythms and reduce filler words." },
                  { id: "Advanced", title: "Professional Speaker", desc: "Aiming to master pause dynamics, executive style, and projection." }
                ].map((item) => {
                  const isSelected = experienceLevel === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setExperienceLevel(item.id as ExperienceLevelType);
                        setError(null);
                      }}
                      className={`flex items-start text-left p-5 rounded-2xl border transition-all cursor-pointer select-none gap-4 ${isSelected ? 'border-sky-400 bg-sky-500/10 shadow-[0_0_15px_rgba(56,189,248,0.15)]' : 'border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10'}`}
                    >
                      <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${isSelected ? 'bg-sky-400/20 text-sky-400' : 'bg-white/5 text-zinc-400'}`}>
                        <Award className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <span className="font-bold text-sm block mb-1 text-white">{item.title}</span>
                        <span className="text-xs text-zinc-400 leading-normal font-light">{item.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleBack}
                  disabled={submitting}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold py-4 rounded-2xl transition-all cursor-pointer text-center disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={submitting || !experienceLevel}
                  className="flex-1 bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-500 hover:to-indigo-600 text-white font-semibold py-4 rounded-2xl transition-all cursor-pointer text-center disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Onboarding"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
