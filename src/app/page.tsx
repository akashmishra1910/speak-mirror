"use client";

import Link from "next/link";
import { 
  Mic, BarChart, Zap, ChevronRight, Loader2, MessageSquare, Sparkles, 
  ArrowRight, Flame, TrendingUp, TrendingDown, Target, Eye, Clock, Activity
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { useState, useEffect } from "react";
import { HomeFeedData } from "@/lib/homefeed";

// Custom inline SVG Sparkline Component
function Sparkline({ points, isTrendingUp }: { points: number[]; isTrendingUp: boolean }) {
  if (points.length < 2) return null;
  const width = 100;
  const height = 30;
  
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  
  const mappedPoints = points.map((p, idx) => {
    const x = (idx / (points.length - 1)) * width;
    const y = height - ((p - min) / range) * (height - 6) - 3;
    return `${x},${y}`;
  });
  
  const pathData = `M ${mappedPoints.join(" L ")}`;
  const strokeColor = isTrendingUp ? "#10B981" : "#EF4444"; // Green vs Red

  return (
    <svg className="w-20 h-7" viewBox={`0 0 ${width} ${height}`}>
      <path
        d={pathData}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Home() {
  const { user, isLoading } = useAuth();
  const [feedData, setFeedData] = useState<HomeFeedData | null>(null);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [filterMetric, setFilterMetric] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsFeedLoading(false);
      return;
    }
    
    async function loadFeed() {
      setIsFeedLoading(true);
      try {
        const res = await fetch("/api/home-feed");
        if (res.ok) {
          const data = await res.json();
          setFeedData(data);
        }
      } catch (err) {
        console.error("Failed to load home feed:", err);
      } finally {
        setIsFeedLoading(false);
      }
    }
    
    loadFeed();
  }, [user]);

  if (isLoading || (user && isFeedLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="w-10 h-10 animate-spin text-themeText dark:text-white" />
      </div>
    );
  }

  // Helper to get metric icon
  const getMetricIcon = (metric: string) => {
    switch (metric.toLowerCase()) {
      case "confidence":
        return <Zap className="w-4 h-4 text-amber-500" />;
      case "clarity":
        return <Mic className="w-4 h-4 text-emerald-500" />;
      case "pacing":
      case "pacing (wpm)":
        return <Clock className="w-4 h-4 text-indigo-500" />;
      case "fillers":
      case "filler words":
        return <MessageSquare className="w-4 h-4 text-cyan-500" />;
      case "eye_contact":
      case "eye contact":
        return <Eye className="w-4 h-4 text-sky-500" />;
      default:
        return <Activity className="w-4 h-4 text-slate-500" />;
    }
  };

  const getMetricColor = (metric: string) => {
    switch (metric.toLowerCase()) {
      case "confidence":
        return "border-l-amber-500";
      case "clarity":
        return "border-l-emerald-500";
      case "pacing":
        return "border-l-indigo-500";
      case "fillers":
        return "border-l-cyan-500";
      case "eye_contact":
        return "border-l-sky-500";
      default:
        return "border-l-slate-400";
    }
  };

  if (user && feedData) {
    const { greeting, spotlight, dailyPrompt, progressSnapshot, recentSessions, totalSessions, goal, practiceDuration } = feedData;

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10 font-sans">
        
        {/* Personalized Greeting (Fix 1) */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-left mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-850 dark:text-white tracking-tight flex items-center gap-2">
              {greeting.greetingText}, <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-indigo-600 dark:from-sky-400 dark:to-indigo-400">{greeting.firstName}</span>!
            </h1>
            <p className="text-slate-550 dark:text-zinc-400 mt-1.5 font-medium text-sm md:text-base flex items-center gap-1.5">
              {greeting.currentStreak > 0 && <Flame className="w-4.5 h-4.5 text-orange-500 fill-orange-500 animate-pulse" />}
              {greeting.subtitleText}
            </p>
          </div>
          
          <Link
            href="/practice"
            className="group inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white font-bold rounded-xl shadow-[0_4px_12px_rgba(14,165,233,0.15)] hover:-translate-y-0.5 transition-all text-xs cursor-pointer shrink-0"
          >
            <Mic className="w-4 h-4 fill-current" />
            Quick Practice
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>

        {totalSessions === 0 ? (
          /* Empty State (Fix 6) */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-8 md:p-12 rounded-3xl text-center max-w-2xl mx-auto border-slate-200/50 bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-zinc-800/80 dark:bg-[#09090d]/60 dark:shadow-[0_10px_30px_rgba(0,0,0,0.4)] flex flex-col items-center gap-6"
          >
            <div className="p-4 rounded-2xl bg-sky-500/10 text-sky-500 animate-bounce">
              <Mic className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-850 dark:text-white">Your first session awaits</h2>
              <p className="text-slate-600 dark:text-zinc-400 text-sm font-light mt-2 max-w-md mx-auto leading-relaxed">
                Ready to level up your speaking skills? Practice speaking for just {practiceDuration} minutes tailored to your goal of <span className="font-semibold text-sky-500">{goal.replace("_", " ")}</span>.
              </p>
            </div>
            <Link
              href="/practice"
              className="px-8 py-3.5 bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-500 hover:to-indigo-600 text-white text-sm font-bold rounded-2xl shadow-[0_4px_15px_rgba(14,165,233,0.2)] hover:-translate-y-0.5 transition-all"
            >
              Start Practicing ({practiceDuration} mins)
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-10">
            
            {/* Spotlight & Daily Prompt Row (Fix 2 & Fix 3) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Spotlight Card */}
              {spotlight && (
                <motion.div
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 }}
                  className={`glass-panel p-6 rounded-2xl text-left border border-slate-200 bg-white dark:border-zinc-800/80 dark:bg-[#09090d]/60 shadow-sm flex flex-col justify-between border-l-4 ${getMetricColor(spotlight.metric)} min-h-[220px]`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5" />
                        Focus Area of the Week
                      </span>
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-zinc-800 dark:text-zinc-400 px-2 py-0.5 rounded-md">
                        Avg: {spotlight.averageScore}%
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-850 dark:text-white">{spotlight.displayName}</h3>
                    <p className="text-slate-650 dark:text-zinc-400 text-xs md:text-sm font-light mt-2 leading-relaxed italic">
                      "{spotlight.tip}"
                    </p>
                  </div>
                  <Link
                    href={`/practice?focus=${spotlight.metric}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-sky-500 hover:underline mt-6 cursor-pointer"
                  >
                    Practice this now <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </motion.div>
              )}

              {/* Recommended Daily Task Card */}
              <motion.div
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-panel p-6 rounded-2xl text-left border border-slate-200 bg-white dark:border-zinc-800/80 dark:bg-[#09090d]/60 shadow-sm flex flex-col justify-between min-h-[220px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 font-mono flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      Recommended for you today
                    </span>
                    <span className="text-[9px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Daily AI
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-850 dark:text-white leading-tight">Daily Coach Prompt</h3>
                  <p className="text-slate-650 dark:text-zinc-400 text-xs md:text-sm font-medium mt-3 leading-relaxed border-l-2 border-indigo-500/35 pl-3">
                    {dailyPrompt}
                  </p>
                </div>
                <Link
                  href={`/practice?prompt=${encodeURIComponent(dailyPrompt)}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-500 hover:underline mt-6 cursor-pointer"
                >
                  Start this practice <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            </div>

            {/* Progress Snapshot (Fix 4) */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-4"
            >
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider font-mono">
                [ Progress Telemetry Snapshot ]
              </h3>
              
              {!progressSnapshot || progressSnapshot.length === 0 ? (
                /* Fewer than 3 sessions placeholder */
                <div className="glass-panel p-8 rounded-2xl border border-slate-200 bg-white dark:border-zinc-800/80 dark:bg-[#09090d]/40 relative overflow-hidden text-center">
                  <div className="absolute inset-0 bg-white/30 dark:bg-[#050508]/30 backdrop-blur-[1px] pointer-events-none" />
                  <p className="text-slate-500 dark:text-zinc-500 text-sm font-medium relative z-10">
                    Keep practicing to see telemetry trend sparklines (minimum 3 sessions required).
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  {progressSnapshot.map(m => {
                    const isActive = filterMetric === m.displayName;
                    return (
                      <button
                        key={m.metric}
                        onClick={() => setFilterMetric(isActive ? null : m.displayName)}
                        className={`p-4 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:-translate-y-0.5 cursor-pointer relative overflow-hidden ${
                          isActive 
                            ? "bg-sky-500/10 border-sky-400 dark:bg-sky-500/5 dark:border-sky-500/40" 
                            : "bg-white border-slate-200 hover:bg-slate-50 dark:bg-[#09090d]/60 dark:border-zinc-800/80 dark:hover:bg-[#121217]/50"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider truncate">
                            {m.displayName}
                          </span>
                          {getMetricIcon(m.metric)}
                        </div>
                        
                        <div className="flex items-baseline justify-between mt-1 w-full gap-2">
                          <span className="text-2xl font-black text-slate-850 dark:text-white">
                            {m.averageScore}
                            <span className="text-xs text-slate-500 font-normal">
                              {m.metric === "fillers" ? "" : m.metric === "pacing" ? "" : "%"}
                            </span>
                          </span>
                          
                          <div className="flex flex-col items-end">
                            <Sparkline points={m.trend} isTrendingUp={m.isTrendingUp} />
                            <span className={`text-[8px] font-bold uppercase mt-1 flex items-center gap-0.5 ${
                              m.isTrendingUp ? "text-emerald-500" : "text-rose-500"
                            }`}>
                              {m.isTrendingUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                              {m.isTrendingUp ? "UP" : "DOWN"}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Recent Sessions Timeline (Fix 5) */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4 text-left"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider font-mono">
                  {filterMetric ? `[ Recent Sessions // Filtered: ${filterMetric} ]` : "[ Recent Sessions Timeline ]"}
                </h3>
                {filterMetric && (
                  <button 
                    onClick={() => setFilterMetric(null)}
                    className="text-[10px] text-sky-500 font-bold hover:underline cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {recentSessions.map(session => (
                  <Link
                    key={session.id}
                    href={`/profile`} // routes to profile showing dashboard details
                    className="glass-panel p-4 rounded-2xl border border-slate-200 bg-white/70 hover:bg-slate-50/50 dark:border-zinc-800/80 dark:bg-[#09090d]/60 dark:hover:bg-[#121217]/50 shadow-sm transition-all hover:scale-[1.005] flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Left details */}
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-650 dark:text-zinc-350">
                        <BarChart className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-550 dark:text-zinc-400">
                          {session.date}
                        </div>
                        <div className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5 mt-0.5">
                          Overall Score: <span className="text-sky-500">{session.overallScore}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle details: Top and Worst metrics */}
                    <div className="flex flex-wrap items-center gap-3 md:gap-6">
                      <div className="text-xs">
                        <span className="text-slate-400 dark:text-zinc-550 block font-mono text-[9px] uppercase tracking-wider">// top_index</span>
                        <span className="font-semibold text-emerald-500 flex items-center gap-1.5 mt-0.5">
                          {getMetricIcon(session.topMetric)} {session.topMetric}
                        </span>
                      </div>
                      <div className="text-xs">
                        <span className="text-slate-400 dark:text-zinc-550 block font-mono text-[9px] uppercase tracking-wider">// weak_index</span>
                        <span className="font-semibold text-rose-500 flex items-center gap-1.5 mt-0.5">
                          {getMetricIcon(session.worstMetric)} {session.worstMetric}
                        </span>
                      </div>
                    </div>

                    {/* Right details: duration & Arrow */}
                    <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-slate-200/50 dark:border-zinc-800/60 pt-3 md:pt-0">
                      <div className="text-right text-xs text-slate-450 dark:text-zinc-500 font-mono">
                        <span className="block text-[8px] tracking-widest uppercase mb-0.5">duration</span>
                        <span className="font-bold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {session.duration}s
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 dark:text-zinc-600 hidden md:block" />
                    </div>
                  </Link>
                ))}
              </div>

              <div className="text-center pt-2">
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-1 text-xs font-bold text-sky-500 hover:underline cursor-pointer"
                >
                  View all sessions <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>

          </div>
        )}

      </div>
    );
  }

  // Public Landing Page view for guest users
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
