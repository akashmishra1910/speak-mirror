"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown, Trophy } from "lucide-react";

interface MetricScoreProps {
  label: string;
  value: number;
  suffix?: string;
  diagnostic: string;
  deltaLast?: number;
  deltaBest?: number;
  reverse?: boolean; // If true, lower values are better (like filler words)
  progressBarColor: string;
  progressPercent: number;
  floatSpeed: "float-slow" | "float-medium" | "float-fast";
}

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const end = Math.round(value);
    if (isNaN(end) || end <= 0) {
      setCount(0);
      return;
    }
    
    const timer = setInterval(() => {
      start += Math.ceil(end / 30);
      if (start >= end) {
        start = end;
        clearInterval(timer);
      }
      setCount(start);
    }, 20);
    
    return () => clearInterval(timer);
  }, [value]);

  return <>{count}{suffix}</>;
}

export function MetricScore({
  label,
  value,
  suffix = "",
  diagnostic,
  deltaLast = 0,
  deltaBest = 0,
  reverse = false,
  progressBarColor,
  progressPercent,
  floatSpeed
}: MetricScoreProps) {
  
  // An improvement occurred if (value increased and not reverse) OR (value decreased and reverse)
  const isImprovement = reverse ? deltaLast < 0 : deltaLast > 0;
  const showDelta = deltaLast !== 0;
  const formattedDelta = deltaLast > 0 ? `+${deltaLast}` : `${deltaLast}`;
  
  // Personal best is true if deltaBest is >= 0 (or <= 0 for reverse)
  const isPersonalBest = reverse ? deltaBest <= 0 : deltaBest >= 0;

  return (
    <motion.div
      className={`glass-panel p-5 rounded-2xl flex flex-col items-start text-left ${floatSpeed} interactive-card relative overflow-hidden font-mono border-slate-200/50 bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-zinc-800/80 dark:bg-[#09090d]/60 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]`}
    >
      {/* Label & Personal Best Trophy */}
      <div className="flex w-full items-center justify-between">
        <span className="text-slate-500 dark:text-zinc-500 text-[9px] font-bold uppercase tracking-widest">
          {label}
        </span>
        {isPersonalBest && value > 0 && (
          <div className="group relative flex items-center justify-center">
            <Trophy className="h-4 w-4 text-amber-500 hover:scale-110 transition-transform" />
            <span className="absolute bottom-full mb-1 w-24 bg-zinc-950 border border-white/10 text-white text-[9px] p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center font-sans z-20">
              Personal Best! 🏆
            </span>
          </div>
        )}
      </div>

      {/* Main Score Value & Comparison Arrow */}
      <div className="flex items-baseline gap-2 mt-1 w-full justify-between">
        <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-blue-600 dark:bg-none dark:text-white">
          <AnimatedCounter value={value} suffix={suffix} />
        </div>
        
        {/* Trend Indicator Arrow */}
        {showDelta && (
          <div className="group relative flex items-center">
            {isImprovement ? (
              <ArrowUp className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
            ) : (
              <ArrowDown className="h-4 w-4 text-rose-500 dark:text-rose-400" />
            )}
            {/* Tooltip on hover */}
            <span className="absolute bottom-full mb-1 right-0 w-28 bg-zinc-950 border border-white/10 text-white text-[9px] p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center font-sans z-20">
              {formattedDelta} vs last session
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 dark:bg-zinc-900 h-1.5 rounded-full mt-4 overflow-hidden border border-slate-300/30 dark:border-zinc-800">
        <motion.div 
          className={`h-full rounded-full ${progressBarColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>

      {/* Diagnostic Footer */}
      <span className="text-[8px] text-slate-500 dark:text-zinc-500 mt-2 font-bold uppercase">
        DIAGNOSTIC: {diagnostic}
      </span>
    </motion.div>
  );
}
