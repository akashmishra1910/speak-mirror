"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface CountdownOverlayProps {
  onComplete: () => void;
}

export function CountdownOverlay({ onComplete }: CountdownOverlayProps) {
  const [count, setCount] = useState<number>(3);

  useEffect(() => {
    if (count === 0) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setCount(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, onComplete]);

  return (
    <div className="absolute inset-0 z-50 bg-white/30 dark:bg-black/50 backdrop-blur-xl flex flex-col items-center justify-center select-none pointer-events-none transition-colors duration-500">
      <div className="relative w-56 h-56 flex items-center justify-center">
        {/* Animated Circular Progress Ring */}
        <svg className="absolute w-full h-full -rotate-90 scale-95" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="44"
            className="stroke-slate-900/10 dark:stroke-white/10"
            strokeWidth="3.5"
            fill="none"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="44"
            className="stroke-sky-500 dark:stroke-indigo-500"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
            initial={{ strokeDasharray: "277 277", strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: [0, 277] }}
            transition={{ duration: 1, ease: "linear" }}
            key={count} // Resets SVG circle dash offset on every count tick
          />
        </svg>

        {/* Pulsing Outer Aura Halo */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.5, 0.25] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-44 h-44 rounded-full border border-sky-400/20 dark:border-indigo-400/20 shadow-[0_0_40px_rgba(14,165,233,0.05)] dark:shadow-[0_0_50px_rgba(99,102,241,0.05)]"
        />

        {/* butter-smooth countdown number */}
        <AnimatePresence mode="popLayout">
          {count > 0 && (
            <motion.span
              key={count}
              initial={{ opacity: 0, scale: 0.45, y: 15 }}
              animate={{ 
                opacity: 1, 
                scale: 1.05, 
                y: 0,
                filter: "blur(0px)" 
              }}
              exit={{ 
                opacity: 0, 
                scale: 1.6, 
                y: -15,
                filter: "blur(4px)"
              }}
              transition={{ 
                duration: 0.5, 
                ease: [0.34, 1.56, 0.64, 1] // premium custom cubic-bezier
              }}
              style={{ willChange: "transform, opacity, filter" }}
              className="absolute text-8xl font-black text-slate-800 dark:text-white font-sans tracking-tight drop-shadow-[0_0_15px_rgba(14,165,233,0.25)] dark:drop-shadow-[0_0_20px_rgba(99,102,241,0.4)]"
            >
              {count}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Prepare indicator label */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 0.8, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 text-[10px] uppercase font-mono tracking-[0.25em] text-slate-650 dark:text-zinc-400 font-extrabold flex items-center gap-1.5"
      >
        <Sparkles className="w-3.5 h-3.5 text-sky-500 dark:text-indigo-400 animate-spin-slow" />
        Prepare to speak
      </motion.p>
    </div>
  );
}
