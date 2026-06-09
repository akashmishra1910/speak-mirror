"use client";

import { Zap, Mic, Clock, MessageSquare, Eye } from "lucide-react";
import { motion } from "framer-motion";

interface FocusPillProps {
  focusMetric: string | null;
}

export function FocusPill({ focusMetric }: FocusPillProps) {
  if (!focusMetric) return null;

  const metric = focusMetric.toLowerCase();

  const getMetricStyle = () => {
    switch (metric) {
      case "confidence":
        return {
          label: "Confidence",
          icon: <Zap className="w-3 h-3 text-amber-500 fill-amber-500/20" />,
          colorClass: "bg-amber-500/10 border-amber-500/20 text-amber-500 dark:text-amber-400"
        };
      case "clarity":
        return {
          label: "Clarity",
          icon: <Mic className="w-3 h-3 text-emerald-500" />,
          colorClass: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400"
        };
      case "pacing":
        return {
          label: "Pacing",
          icon: <Clock className="w-3 h-3 text-indigo-500" />,
          colorClass: "bg-indigo-500/10 border-indigo-500/20 text-indigo-500 dark:text-indigo-400"
        };
      case "fillers":
        return {
          label: "Filler Words",
          icon: <MessageSquare className="w-3 h-3 text-cyan-500" />,
          colorClass: "bg-cyan-500/10 border-cyan-500/20 text-cyan-500 dark:text-cyan-400"
        };
      case "eye_contact":
      case "eye contact":
        return {
          label: "Eye Contact",
          icon: <Eye className="w-3 h-3 text-sky-500" />,
          colorClass: "bg-sky-500/10 border-sky-500/20 text-sky-500 dark:text-sky-400"
        };
      default:
        return {
          label: "Confidence",
          icon: <Zap className="w-3 h-3 text-amber-500 fill-amber-500/20" />,
          colorClass: "bg-amber-500/10 border-amber-500/20 text-amber-500 dark:text-amber-400"
        };
    }
  };

  const style = getMetricStyle();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`absolute top-16 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider shadow-sm backdrop-blur-md ${style.colorClass}`}
    >
      {style.icon}
      <span>Focus: {style.label}</span>
    </motion.div>
  );
}
