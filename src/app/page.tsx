"use client";

import Link from "next/link";
import { Mic, BarChart, Zap, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-zinc-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="float-slow"
        >
          <div className="flex justify-center mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/45 text-slate-700 text-sm font-medium border border-slate-200/50 shadow-sm dark:bg-surface dark:text-zinc-300 dark:border-surface-border dark:shadow-[0_0_15px_0_rgba(255,255,255,0.02)]">
              <Zap className="w-4 h-4 text-[#5B7C99] dark:text-zinc-400 animate-pulse" />
              AI-Powered Communication Coaching
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight text-slate-800 dark:text-white">
            See how you <span className="text-gradient">sound</span> to others.
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-600 dark:text-zinc-400 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
            Record yourself for 90 seconds and instantly get actionable feedback on your confidence, clarity, and filler words.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/practice" className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white rounded-2xl shadow-[0_4px_20px_rgba(2,132,199,0.3)] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 dark:bg-none dark:shadow-none transition-all hover:-translate-y-1">
              <Mic className="w-5 h-5" />
              Start Practicing
            </Link>
            <Link href="#features" className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-slate-700 bg-white/40 rounded-2xl hover:bg-white/60 transition-all border border-slate-200/40 hover:-translate-y-1 backdrop-blur-md dark:text-white dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10">
              Learn More
              <ChevronRight className="w-5 h-5 text-slate-400 dark:text-white/50" />
            </Link>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="glass-panel p-8 rounded-3xl text-left transition-colors float-slow interactive-card">
            <div className="w-12 h-12 bg-white/40 border border-slate-200/40 dark:bg-white/5 dark:border-white/10 rounded-2xl flex items-center justify-center mb-6 shadow-sm dark:shadow-[0_0_15px_rgba(255,255,255,0.02)]">
              <Mic className="w-6 h-6 text-[#5B7C99] dark:text-zinc-300" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-800 dark:text-white">90-Second Practice</h3>
            <p className="text-slate-600 dark:text-zinc-400 leading-relaxed text-sm">Daily micro-practices build confidence faster than weekly sessions. Just hit record.</p>
          </div>
          
          <div className="glass-panel p-8 rounded-3xl text-left transition-colors float-medium interactive-card">
            <div className="w-12 h-12 bg-white/40 border border-slate-200/40 dark:bg-white/5 dark:border-white/10 rounded-2xl flex items-center justify-center mb-6 shadow-sm dark:shadow-[0_0_15px_rgba(255,255,255,0.02)]">
              <BarChart className="w-6 h-6 text-[#5B7C99] dark:text-zinc-300" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-800 dark:text-white">Instant Analysis</h3>
            <p className="text-slate-600 dark:text-zinc-400 leading-relaxed text-sm">Our AI models detect filler words, pacing, and energy levels to give you a true picture.</p>
          </div>
          
          <div className="glass-panel p-8 rounded-3xl text-left transition-colors float-fast interactive-card">
            <div className="w-12 h-12 bg-white/40 border border-slate-200/40 dark:bg-white/5 dark:border-white/10 rounded-2xl flex items-center justify-center mb-6 shadow-sm dark:shadow-[0_0_15px_rgba(255,255,255,0.02)]">
              <Zap className="w-6 h-6 text-[#5B7C99] dark:text-zinc-300" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-800 dark:text-white">Track Progress</h3>
            <p className="text-slate-600 dark:text-zinc-400 leading-relaxed text-sm">Watch your communication skills improve over time with visual dashboards and streaks.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

