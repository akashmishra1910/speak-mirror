"use client";

import React from "react";
import { Mic, Flame } from "lucide-react";

interface PracticeLayoutProps {
  children: React.ReactNode;
  streak: number;
  isLoadingStreak: boolean;
  phase: "freeform_recording" | "reading_recording" | "analyzing" | "results";
  mode: "freeform" | "reading" | "warmup";
  isPersonal: boolean;
}

export function PracticeLayout({
  children,
  streak,
  isLoadingStreak,
  phase,
  mode,
  isPersonal,
}: PracticeLayoutProps) {
  // Determine phase badge text
  let phaseText = "Freeform";
  if (mode === "warmup") phaseText = "Warm-up";
  else if (mode === "reading") phaseText = "Reading";

  if (phase === "analyzing") phaseText = "Analyzing";
  else if (phase === "results") phaseText = "Results";

  // Determine active states for the two progress bars
  const bar1Active = phase === "freeform_recording" || phase === "reading_recording" || phase === "analyzing" || phase === "results";
  const bar2Active = phase === "reading_recording" || phase === "analyzing" || phase === "results";

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col w-full bg-brand-cream dark:bg-[#050508] transition-colors duration-300 relative overflow-hidden">
      {/* Background ambient blobs for Ombre Sky Blue and Beige glassmorphism */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[15%] left-[-10%] w-[400px] h-[400px] rounded-full bg-sky-200/20 dark:bg-sky-900/10 blur-[90px] animate-blob" />
        <div className="absolute bottom-[10%] right-[-5%] w-[450px] h-[450px] rounded-full bg-amber-100/35 dark:bg-amber-950/10 blur-[100px] animate-blob animation-delay-4000" />
      </div>

      {/* Sticky Topbar (52px height) */}
      <header className="sticky top-16 z-40 h-[52px] w-full bg-white/70 dark:bg-[#0d1117]/75 backdrop-blur-md border-b border-[#e8e2d8]/50 dark:border-brand-gold/12 transition-colors duration-300">
        <div className="max-w-7xl mx-auto w-full h-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left Side: Mic Icon + Title + Phase Badge */}
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded-md border border-brand-navy/10 dark:border-white/10 text-brand-navy dark:text-white">
              <Mic className="w-4 h-4 stroke-[1.5]" />
            </div>
            <span className="text-sm font-medium tracking-tight text-brand-navy dark:text-[#f1f0ee] hidden sm:inline">
              Practice session
            </span>
            <span className="text-sm font-medium tracking-tight text-brand-navy dark:text-[#f1f0ee] sm:hidden">
              Practice
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-gold/10 text-brand-gold border border-brand-gold/25 uppercase tracking-wider">
              {phaseText}
            </span>
          </div>

          {/* Right Side: Streak + Phase Progress */}
          <div className="flex items-center gap-4">
            {isPersonal && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-gold/5 border border-brand-gold/15 text-brand-navy dark:text-[#f1f0ee]">
                <Flame className="w-3.5 h-3.5 text-brand-gold fill-brand-gold" />
                <span className="text-xs font-semibold font-mono">
                  {isLoadingStreak ? "..." : streak}
                </span>
              </div>
            )}

            {/* Phase progress bars (two bars) */}
            <div className="flex items-center gap-1.5">
              <div
                className={`h-1.5 w-[14px] sm:w-8 rounded-full transition-all duration-300 ${
                  bar1Active
                    ? "bg-brand-gold shadow-[0_0_8px_rgba(184,150,62,0.4)]"
                    : "bg-[#e8e2d8] dark:bg-white/10"
                }`}
                title="Step 1: Freeform Speech"
              />
              <div
                className={`h-1.5 w-[14px] sm:w-8 rounded-full transition-all duration-300 ${
                  bar2Active
                    ? "bg-brand-gold shadow-[0_0_8px_rgba(184,150,62,0.4)]"
                    : "bg-[#e8e2d8] dark:bg-white/10"
                }`}
                title="Step 2: Reading Aloud"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Body Layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 flex flex-col relative z-10">
        {children}
      </main>
    </div>
  );
}
