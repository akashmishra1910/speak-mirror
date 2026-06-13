"use client";

import { Target } from "lucide-react";
import { motion } from "framer-motion";

interface FocusPillProps {
  focusMetric: string | null;
  floating?: boolean;
}

export function FocusPill({ focusMetric, floating = false }: FocusPillProps) {
  if (!focusMetric) return null;

  // Format label name
  const formattedLabel = focusMetric
    .replace("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const baseStyles = "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-[10px] font-semibold uppercase tracking-wider select-none";
  
  if (floating) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${baseStyles} absolute top-16 left-4 z-20 shadow-md backdrop-blur-md`}
      >
        <Target className="w-3.5 h-3.5 stroke-[1.5]" />
        <span>Focus: {formattedLabel}</span>
      </motion.div>
    );
  }

  return (
    <div className={`${baseStyles} w-fit mt-2`}>
      <Target className="w-3.5 h-3.5 stroke-[1.5]" />
      <span>Focus: {formattedLabel}</span>
    </div>
  );
}
