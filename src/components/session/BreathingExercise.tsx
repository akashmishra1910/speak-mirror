"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface BreathingExerciseProps {
  onStepChange: (step: "inhale" | "hold" | "exhale" | "complete") => void;
  onComplete: () => void;
}

export function BreathingExercise({ onStepChange, onComplete }: BreathingExerciseProps) {
  const [step, setStep] = useState<"inhale" | "hold" | "exhale" | "complete">("inhale");

  useEffect(() => {
    onStepChange("inhale");

    // Timeline of the breathing cycle
    const holdTimer = setTimeout(() => {
      setStep("hold");
      onStepChange("hold");
    }, 4000); // 4 seconds in

    const exhaleTimer = setTimeout(() => {
      setStep("exhale");
      onStepChange("exhale");
    }, 6000); // 4s + 2s hold = 6s

    const completeTimer = setTimeout(() => {
      setStep("complete");
      onStepChange("complete");
    }, 10000); // 6s + 4s out = 10s

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exhaleTimer);
      clearTimeout(completeTimer);
    };
  }, [onStepChange]);

  const getLabelText = () => {
    switch (step) {
      case "inhale":
        return "Breathe in";
      case "hold":
        return "Hold";
      case "exhale":
        return "Breathe out";
      case "complete":
        return "Ready";
      default:
        return "";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-12 select-none">
      {/* Visual Breathing Circle */}
      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* Soft glowing outer indicator ring */}
        <motion.div
          animate={{
            scale: step === "inhale" || step === "hold" ? 1.9 : 1.0,
            opacity: step === "hold" ? 0.8 : 0.4,
          }}
          transition={{
            duration: step === "hold" ? 2 : 4,
            ease: "easeInOut",
          }}
          className="absolute w-24 h-24 rounded-full bg-indigo-500/10 border-2 border-indigo-500/30 blur-sm"
        />

        {/* Core animating breathing circle */}
        <motion.div
          animate={{
            scale: step === "inhale" || step === "hold" ? 2.0 : 1.0,
          }}
          transition={{
            duration: step === "hold" ? 2 : 4,
            ease: "easeInOut",
          }}
          className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center shadow-[0_0_35px_rgba(99,102,241,0.2)] dark:shadow-[0_0_50px_rgba(99,102,241,0.35)] relative z-10"
        >
          {/* Internal core pulsing light */}
          <motion.div
            animate={{
              opacity: step === "hold" ? [0.4, 0.9, 0.4] : 0.6,
            }}
            transition={{
              repeat: step === "hold" ? Infinity : 0,
              duration: 2,
            }}
            className="w-16 h-16 rounded-full bg-white/20"
          />
        </motion.div>
      </div>

      {/* Label Text with opacity animations */}
      <div className="h-10 text-center flex items-center justify-center">
        <AnimatePresenceModeSafe label={getLabelText()} step={step} />
      </div>

      {/* Finish CTA button */}
      <div className="h-12 flex items-center justify-center mt-2">
        {step === "complete" && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onComplete}
            className="px-8 py-3 bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-500 hover:to-indigo-600 text-white font-bold rounded-2xl shadow-[0_4px_15px_rgba(99,102,241,0.25)] hover:-translate-y-0.5 transition-all text-sm cursor-pointer"
          >
            I'm ready
          </motion.button>
        )}
      </div>
    </div>
  );
}

// Internal helper for clean opacity switches
function AnimatePresenceModeSafe({ label, step }: { label: string; step: string }) {
  return (
    <motion.span
      key={step}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.4 }}
      className="text-2xl font-semibold tracking-wide text-slate-800 dark:text-zinc-100 font-sans uppercase"
    >
      {label}
    </motion.span>
  );
}
