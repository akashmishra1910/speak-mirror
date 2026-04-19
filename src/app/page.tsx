"use client";

import Link from "next/link";
import { Mic, BarChart, Zap, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-center mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface text-brand-400 text-sm font-medium border border-surface-border">
              <Zap className="w-4 h-4" />
              AI-Powered Communication Coaching
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
            See how you <span className="text-gradient">sound</span> to others.
          </h1>
          
          <p className="text-xl md:text-2xl text-foreground/70 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
            Record yourself for 90 seconds and instantly get actionable feedback on your confidence, clarity, and filler words.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/practice" className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-brand-600 rounded-2xl hover:bg-brand-500 transition-all shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.7)] hover:-translate-y-1">
              <Mic className="w-5 h-5" />
              Start Practicing
            </Link>
            <Link href="#features" className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-foreground bg-surface rounded-2xl hover:bg-surface-border transition-all border border-surface-border hover:-translate-y-1">
              Learn More
              <ChevronRight className="w-5 h-5 text-foreground/50" />
            </Link>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="glass-panel p-8 rounded-3xl text-left hover:bg-surface/80 transition-colors">
            <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6">
              <Mic className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">90-Second Practice</h3>
            <p className="text-foreground/70 leading-relaxed">Daily micro-practices build confidence faster than weekly sessions. Just hit record.</p>
          </div>
          
          <div className="glass-panel p-8 rounded-3xl text-left hover:bg-surface/80 transition-colors">
            <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6">
              <BarChart className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Instant Analysis</h3>
            <p className="text-foreground/70 leading-relaxed">Our AI models detect filler words, pacing, and energy levels to give you a true picture.</p>
          </div>
          
          <div className="glass-panel p-8 rounded-3xl text-left hover:bg-surface/80 transition-colors">
            <div className="w-12 h-12 bg-brand-500/20 rounded-2xl flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-brand-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Track Progress</h3>
            <p className="text-foreground/70 leading-relaxed">Watch your communication skills improve over time with visual dashboards and streaks.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
