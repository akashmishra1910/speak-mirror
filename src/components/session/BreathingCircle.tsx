"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface BreathingCircleProps {
  onStepChange?: (step: "inhale" | "hold" | "exhale" | "complete") => void;
  onComplete: () => void;
}

export function BreathingCircle({ onStepChange, onComplete }: BreathingCircleProps) {
  const [step, setStep] = useState<"inhale" | "hold" | "exhale" | "complete">("inhale");

  useEffect(() => {
    if (onStepChange) onStepChange("inhale");

    // Timeline of the breathing cycle
    const holdTimer = setTimeout(() => {
      setStep("hold");
      if (onStepChange) onStepChange("hold");
    }, 4000); // 4 seconds in (breathe in)

    const exhaleTimer = setTimeout(() => {
      setStep("exhale");
      if (onStepChange) onStepChange("exhale");
    }, 6000); // 4s in + 2s hold = 6s

    const completeTimer = setTimeout(() => {
      setStep("complete");
      if (onStepChange) onStepChange("complete");
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
        {/* Gold tint outer animating boundary */}
        <motion.div
          animate={{
            scale: step === "inhale" || step === "hold" ? 2.0 : 1.0,
          }}
          transition={{
            duration: step === "hold" ? 2 : 4,
            ease: "easeInOut",
          }}
          className="w-20 h-20 rounded-full border-2 border-brand-gold/40 bg-brand-gold/8 flex items-center justify-center relative z-10 shadow-[0_0_30px_rgba(184,150,62,0.15)]"
        >
          {/* Inner core pulsing light */}
          <motion.div
            animate={{
              opacity: step === "hold" ? [0.4, 0.9, 0.4] : 0.6,
            }}
            transition={{
              repeat: step === "hold" ? Infinity : 0,
              duration: 2,
            }}
            className="w-16 h-16 rounded-full bg-brand-gold/10"
          />
        </motion.div>
      </div>

      {/* Label Text in gold */}
      <div className="h-10 text-center flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.span
            key={step}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.4 }}
            className="text-xl font-medium tracking-wide text-brand-gold font-sans uppercase"
          >
            {getLabelText()}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Finish CTA button styled in brand navy & gold */}
      <div className="h-12 flex items-center justify-center mt-2">
        {step === "complete" && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onComplete}
            className="px-8 py-3 bg-brand-navy hover:bg-brand-navy/90 border border-brand-gold text-brand-gold font-bold rounded-xl shadow-[0_4px_15px_rgba(26,39,68,0.2)] hover:-translate-y-0.5 transition-all text-sm cursor-pointer uppercase tracking-wider"
          >
            I'm ready
          </motion.button>
        )}
      </div>
    </div>
  );
}
