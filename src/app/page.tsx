"use client";

import Link from "next/link";
import { Mic, BarChart, Zap, ChevronRight, Loader2, Users, Layers, Share2, MessageSquare, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";

export default function Home() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="w-10 h-10 animate-spin text-themeText dark:text-white" />
      </div>
    );
  }

  if (user) {
    const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Speaker";
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center md:text-left mb-12 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 text-sky-650 dark:bg-white/5 dark:text-zinc-350 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-sky-650 dark:text-sky-400 animate-pulse" />
                Workspace Dashboard
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-themeText dark:text-white leading-tight">
              Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-indigo-600 dark:from-sky-400 dark:to-indigo-400">{userName}</span>!
            </h1>
            <p className="text-slate-600 dark:text-zinc-400 mt-2 font-light text-sm md:text-base max-w-xl leading-relaxed">
              Ready to refine your communication skills today? Explore the platform features below to practice, review, and collaborate.
            </p>
          </div>
          
          <Link
            href="/practice"
            className="group inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white font-bold rounded-2xl shadow-[0_4px_15px_rgba(14,165,233,0.2)] hover:shadow-[0_4px_20px_rgba(14,165,233,0.3)] hover:-translate-y-0.5 transition-all shrink-0 cursor-pointer text-sm"
          >
            <Mic className="w-4 h-4 fill-current" />
            Start Practice Session
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>

        {/* Feature Cards Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {/* Practice Sandbox */}
          <div className="glass-panel p-6 rounded-3xl text-left transition-all float-slow interactive-card flex flex-col justify-between h-[280px]">
            <div>
              <div className="w-12 h-12 bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:bg-white/5 dark:border-white/10 dark:text-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-themeText dark:text-white">Practice Sandbox</h3>
              <p className="text-slate-600 dark:text-zinc-400 font-light text-xs md:text-sm leading-relaxed">
                Practice public speaking or scripts with dynamic visual filters and live camera feedback. Generate spontaneous prompts suited for your difficulty.
              </p>
            </div>
            <Link 
              href="/practice" 
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 mt-4"
            >
              Go to Sandbox <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Team Practice Rooms */}
          <div className="glass-panel p-6 rounded-3xl text-left transition-all float-medium interactive-card flex flex-col justify-between h-[280px]">
            <div>
              <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:bg-white/5 dark:border-white/10 dark:text-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-themeText dark:text-white">Team Practice Rooms</h3>
              <p className="text-slate-600 dark:text-zinc-400 font-light text-xs md:text-sm leading-relaxed">
                Initialize or join workspace team rooms. Access shared practice logs, assign daily idiom/vocabulary tasks, and view recordings side-by-side with teammates.
              </p>
            </div>
            <Link 
              href="/rooms" 
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 mt-4"
            >
              Enter Rooms <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Performance Dashboard */}
          <div className="glass-panel p-6 rounded-3xl text-left transition-all float-fast interactive-card flex flex-col justify-between h-[280px]">
            <div>
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:bg-white/5 dark:border-white/10 dark:text-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <BarChart className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-themeText dark:text-white">Performance Analytics</h3>
              <p className="text-slate-600 dark:text-zinc-400 font-light text-xs md:text-sm leading-relaxed">
                Review historical recordings, evaluate average confidence, analyze clarity scores, and track pacing (words per minute) with interactive feedback diagrams.
              </p>
            </div>
            <Link 
              href="/profile" 
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 mt-4"
            >
              View Analytics <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Context Switcher */}
          <div className="glass-panel p-6 rounded-3xl text-left transition-all float-slow interactive-card flex flex-col justify-between h-[280px]">
            <div>
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:bg-white/5 dark:border-white/10 dark:text-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-themeText dark:text-white">Context Switcher</h3>
              <p className="text-slate-600 dark:text-zinc-400 font-light text-xs md:text-sm leading-relaxed">
                Easily transition between different workspace scopes (Personal vs. Custom organizations) using the organization dropdown selector in the navigation bar.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-500 mt-4">
              Select via Navbar Dropdown
            </span>
          </div>

          {/* Shareable Fluency Cards */}
          <div className="glass-panel p-6 rounded-3xl text-left transition-all float-medium interactive-card flex flex-col justify-between h-[280px]">
            <div>
              <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:bg-white/5 dark:border-white/10 dark:text-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <Share2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-themeText dark:text-white">Milestone Fluency Cards</h3>
              <p className="text-slate-600 dark:text-zinc-400 font-light text-xs md:text-sm leading-relaxed">
                Generate high-scoring fluency card graphics directly on a canvas. Download card images or copy shareable quotes to present progress with external groups.
              </p>
            </div>
            <Link 
              href="/profile" 
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 mt-4"
            >
              Generate Share Cards <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Support Ticket System */}
          <div className="glass-panel p-6 rounded-3xl text-left transition-all float-fast interactive-card flex flex-col justify-between h-[280px]">
            <div>
              <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:bg-white/5 dark:border-white/10 dark:text-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-themeText dark:text-white">Developer Helpdesk</h3>
              <p className="text-slate-600 dark:text-zinc-400 font-light text-xs md:text-sm leading-relaxed">
                Got feedback, bug reports, or feature ideas? Click on the floating bottom-right chat widget to submit support tickets directly to developers.
              </p>
            </div>
            <Link 
              href="/contact" 
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 mt-4"
            >
              Contact Developer <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

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
            <Link href="/auth" className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-slate-700 bg-white/40 rounded-2xl hover:bg-white/60 transition-all border border-slate-200/40 hover:-translate-y-1 backdrop-blur-md dark:text-white dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10">
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

