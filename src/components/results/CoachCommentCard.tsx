"use client";

import { motion } from "framer-motion";
import { Mic, Sparkles } from "lucide-react";

interface CoachCommentCardProps {
  comment: string | null;
  isLoading: boolean;
  focusMetric: string | null;
}

export function CoachCommentCard({ comment, isLoading, focusMetric }: CoachCommentCardProps) {
  if (!isLoading && !comment) return null;

  // Map focus metrics to theme accent border colors
  const getBorderColorClass = () => {
    switch (focusMetric) {
      case "confidence":
        return "border-l-cyan-500 dark:border-l-cyan-400";
      case "clarity":
        return "border-l-emerald-500 dark:border-l-emerald-400";
      case "pacing":
        return "border-l-indigo-500 dark:border-l-indigo-400";
      case "fillers":
        return "border-l-amber-500 dark:border-l-amber-400";
      case "eye_contact":
        return "border-l-sky-500 dark:border-l-sky-400";
      default:
        return "border-l-indigo-500 dark:border-l-indigo-400";
    }
  };

  const getTextColorClass = () => {
    switch (focusMetric) {
      case "confidence":
        return "text-cyan-600 dark:text-cyan-400";
      case "clarity":
        return "text-emerald-600 dark:text-emerald-400";
      case "pacing":
        return "text-indigo-600 dark:text-indigo-400";
      case "fillers":
        return "text-amber-600 dark:text-amber-400";
      case "eye_contact":
        return "text-sky-600 dark:text-sky-400";
      default:
        return "text-indigo-600 dark:text-indigo-400";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full p-5 rounded-2xl border border-l-4 border-slate-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:border-zinc-800/80 dark:bg-[#09090d]/60 dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] ${getBorderColorClass()}`}
    >
      <div className="flex gap-4 items-start text-left">
        {/* Left Icon Panel */}
        <div className={`p-2.5 rounded-xl shrink-0 ${
          focusMetric === "confidence" ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" :
          focusMetric === "clarity" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
          focusMetric === "pacing" ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" :
          focusMetric === "fillers" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
          "bg-sky-500/10 text-sky-600 dark:text-sky-400"
        }`}>
          <Mic className="w-4 h-4" />
        </div>

        {/* Card Content */}
        <div className="flex-1 flex flex-col gap-1.5 font-sans">
          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] font-extrabold uppercase tracking-widest font-mono ${getTextColorClass()}`}>
              // AI Coach Feedback
            </span>
            <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
          </div>

          {isLoading ? (
            /* Pulsing 3-dot Loading animation */
            <div className="flex items-center gap-1 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-500 animate-bounce delay-100" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-500 animate-bounce delay-200" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-500 animate-bounce delay-300" />
            </div>
          ) : (
            <p className="text-slate-800 dark:text-zinc-150 text-sm italic font-medium leading-relaxed">
              "{comment}"
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
