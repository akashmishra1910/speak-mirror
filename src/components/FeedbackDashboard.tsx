"use client";

import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Activity, Info, Download, Share2, Sparkles, Loader2, Play, Pause } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { BEAUTIFY_FILTERS } from "@/lib/filters";

export interface AnalysisMetrics {
  confidence: number;
  clarity: number;
  energy: number;
  fillerWords: number;
  wpm: number;
  transcript: string;
  suggestions?: { type: string; text: string }[];
  title?: string;
  eyeContact?: number;
  expressionScore?: number;
}

interface DashboardProps {
  metrics: AnalysisMetrics | null;
  videoUrl?: string | null;
  onSave?: () => void;
  isSaving?: boolean;
  isSaved?: boolean;
  onRetake?: () => void;
}

export function FeedbackDashboard({ metrics, videoUrl, onSave, isSaving, isSaved, onRetake }: DashboardProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeFilter, setActiveFilter] = useState("studio");

  useEffect(() => {
    const saved = localStorage.getItem("speak_mirror_beautify_filter");
    if (saved) {
      setActiveFilter(saved);
    }
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (!metrics) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]";
    if (score >= 60) return "text-amber-400 bg-amber-500/5 border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.05)]";
    return "text-rose-400 bg-rose-500/5 border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.05)]";
  };

  const getIconForType = (type: string) => {
    switch(type) {
      case 'filler': return <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />;
      case 'pace': return <Info className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />;
      case 'confidence': return <Sparkles className="w-5 h-5 text-white shrink-0 mt-0.5 animate-pulse" />;
      case 'clarity': return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />;
      case 'expression': return <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />;
      case 'gaze': return <Activity className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />;
      default: return <Activity className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const handleDownload = () => {
    if (videoUrl) {
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `speakmirror-practice-${new Date().toISOString().split('T')[0]}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleShare = async () => {
    if (navigator.share && videoUrl) {
      try {
        await navigator.share({
          title: 'My SpeakMirror Practice',
          text: `I just scored ${metrics.confidence}% confidence on SpeakMirror!`,
          url: window.location.origin,
        });
      } catch (err) {
        console.error("Share failed", err);
      }
    } else {
      navigator.clipboard.writeText("https://speakmirror.app/invite");
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 md:gap-8"
    >
      {/* Left Column: Video Playback */}
      <motion.div variants={itemVariants} className="w-full lg:w-1/3 flex flex-col gap-4 float-slow interactive-card">
        {videoUrl ? (
          <>
            <div className="glass-panel rounded-3xl overflow-hidden aspect-[9/16] max-h-[calc(100vh-120px)] shadow-2xl border border-zinc-800/80 relative bg-black group">
              <video 
                ref={videoRef}
                src={videoUrl} 
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                style={{ 
                  transform: 'scaleX(-1)',
                  filter: BEAUTIFY_FILTERS[activeFilter] || BEAUTIFY_FILTERS.none
                }}
                onEnded={() => setIsPlaying(false)}
                onClick={togglePlay}
              />
              {/* Custom Play/Pause Overlay */}
              <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100 bg-black/20'}`}>
                <button 
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className="w-16 h-16 md:w-20 md:h-20 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md rounded-full flex items-center justify-center pointer-events-auto transition-all text-white shadow-xl"
                >
                  {isPlaying ? <Pause className="w-8 h-8 md:w-10 md:h-10 fill-current" /> : <Play className="w-8 h-8 md:w-10 md:h-10 fill-current ml-2" />}
                </button>
              </div>
            </div>
            {/* Filter Selector in Feedback Dashboard */}
            <div className="glass-panel px-4 py-3 rounded-2xl border border-zinc-800/80 bg-[#09090d]/60 flex items-center justify-between text-left font-mono">
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">// active_filter</span>
              <select
                value={activeFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setActiveFilter(val);
                  localStorage.setItem("speak_mirror_beautify_filter", val);
                }}
                className="p-1.5 px-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="none" className="bg-[#09090d]">Original</option>
                <option value="studio" className="bg-[#09090d]">Studio Glow ✨</option>
                <option value="warm" className="bg-[#09090d]">Warm Golden ☀️</option>
                <option value="cool" className="bg-[#09090d]">Nordic Cool ❄️</option>
                <option value="smooth" className="bg-[#09090d]">Soft Focus 🌸</option>
              </select>
            </div>
          </>
        ) : (
          <div className="glass-panel rounded-3xl aspect-[9/16] max-h-[60vh] border border-zinc-800/80 flex items-center justify-center bg-white/[0.01]">
            <p className="text-foreground/40 text-sm font-mono">[ NO_VIDEO_RECORDED ]</p>
          </div>
        )}
        
        {/* Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2 font-mono">
          {onSave && (
            <button 
              onClick={onSave}
              disabled={isSaving || isSaved || !videoUrl}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 transition-all rounded-xl font-bold text-xs col-span-2 lg:col-span-1 border ${
                isSaved 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
                  : 'bg-white text-zinc-950 hover:bg-zinc-200 border-white/10 disabled:opacity-50'
              }`}
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isSaved ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Activity className="w-3.5 h-3.5" />
              )}
              {isSaving ? "SAVING..." : isSaved ? "SAVED" : "SAVE_RECORD"}
            </button>
          )}
          {onRetake && (
            <button 
              onClick={onRetake}
              disabled={isSaving || isSaved}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-rose-500/5 text-rose-400 border border-rose-500/10 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all rounded-xl font-bold text-xs col-span-2 lg:col-span-1 disabled:opacity-50"
            >
              RETAKE_TEST
            </button>
          )}
          <button 
            onClick={handleDownload}
            disabled={!videoUrl}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#09090d] border border-zinc-800 hover:bg-zinc-900 transition-all rounded-xl font-bold text-white disabled:opacity-50 text-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            EXPORT_MP4
          </button>
          <button 
            onClick={handleShare}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#09090d] border border-zinc-800 hover:bg-zinc-900 transition-all rounded-xl font-bold text-white text-xs cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            {isCopied ? "COPIED" : "SHARE_INDEX"}
          </button>
        </div>
      </motion.div>

      {/* Right Column: Metrics */}
      <div className="w-full lg:w-2/3 flex flex-col gap-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Confidence */}
          <motion.div variants={itemVariants} className="glass-panel p-5 rounded-2xl flex flex-col items-start text-left float-slow interactive-card relative overflow-hidden font-mono border-zinc-800/80 bg-[#09090d]/60 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
            <span className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest mb-1">// index_confidence</span>
            <div className="text-2xl font-black text-white mt-1">{metrics.confidence}%</div>
            <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-4 overflow-hidden border border-zinc-800">
              <div className={`h-full rounded-full ${metrics.confidence >= 80 ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : metrics.confidence >= 60 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${metrics.confidence}%` }} />
            </div>
            <span className="text-[8px] text-zinc-500 mt-2 font-bold">
              DIAGNOSTIC: {metrics.confidence >= 80 ? 'SECURE' : metrics.confidence >= 60 ? 'STABLE' : 'LOW_INDEX'}
            </span>
          </motion.div>

          {/* Clarity */}
          <motion.div variants={itemVariants} className="glass-panel p-5 rounded-2xl flex flex-col items-start text-left float-medium interactive-card relative overflow-hidden font-mono border-zinc-800/80 bg-[#09090d]/60 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
            <span className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest mb-1">// index_clarity</span>
            <div className="text-2xl font-black text-white mt-1">{metrics.clarity}%</div>
            <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-4 overflow-hidden border border-zinc-800">
              <div className={`h-full rounded-full ${metrics.clarity >= 80 ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : metrics.clarity >= 60 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${metrics.clarity}%` }} />
            </div>
            <span className="text-[8px] text-zinc-500 mt-2 font-bold">
              EVALUATION: {metrics.clarity >= 80 ? 'OPTIMAL' : metrics.clarity >= 60 ? 'STABLE' : 'DEVIATED'}
            </span>
          </motion.div>

          {/* Filler Words */}
          <motion.div variants={itemVariants} className="glass-panel p-5 rounded-2xl flex flex-col items-start text-left float-fast interactive-card relative overflow-hidden font-mono border-zinc-800/80 bg-[#09090d]/60 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
            <span className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest mb-1">// counter_fillers</span>
            <div className="text-2xl font-black text-white mt-1">{metrics.fillerWords}</div>
            <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-4 overflow-hidden border border-zinc-800">
              <div className={`h-full rounded-full ${metrics.fillerWords <= 2 ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : metrics.fillerWords <= 5 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${Math.max(0, 100 - (metrics.fillerWords * 10))}%` }} />
            </div>
            <span className="text-[8px] text-zinc-500 mt-2 font-bold">
              DIAGNOSTIC: {metrics.fillerWords <= 2 ? 'CLEAN' : metrics.fillerWords <= 5 ? 'MODERATE' : 'HIGH_FREQUENCY'}
            </span>
          </motion.div>

          {/* Pace */}
          <motion.div variants={itemVariants} className="glass-panel p-5 rounded-2xl flex flex-col items-start text-left float-slow interactive-card relative overflow-hidden font-mono border-zinc-800/80 bg-[#09090d]/60 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
            <span className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest mb-1">// rate_wpm</span>
            <div className="text-2xl font-black text-white mt-1">{metrics.wpm} <span className="text-[10px] text-zinc-500">WPM</span></div>
            <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-4 overflow-hidden border border-zinc-800">
              <div className="h-full rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${Math.min(100, (metrics.wpm / 200) * 100)}%` }} />
            </div>
            <span className="text-[8px] text-zinc-500 mt-2 font-bold">
              DIAGNOSTIC: {metrics.wpm >= 110 && metrics.wpm <= 170 ? 'BALANCED' : metrics.wpm > 170 ? 'COMPRESSED' : 'LACONIC'}
            </span>
          </motion.div>

          {/* Eye Contact (Conditional) */}
          {metrics.eyeContact !== undefined && metrics.eyeContact !== null && (
            <motion.div variants={itemVariants} className="glass-panel p-5 rounded-2xl flex flex-col items-start text-left float-slow interactive-card relative overflow-hidden font-mono border-zinc-800/80 bg-[#09090d]/60 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <span className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest mb-1">// index_gaze</span>
              <div className="text-2xl font-black text-white mt-1">{metrics.eyeContact}%</div>
              <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-4 overflow-hidden border border-zinc-800">
                <div className={`h-full rounded-full ${metrics.eyeContact >= 80 ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : metrics.eyeContact >= 60 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${metrics.eyeContact}%` }} />
              </div>
              <span className="text-[8px] text-zinc-500 mt-2 font-bold">
                DIAGNOSTIC: {metrics.eyeContact >= 80 ? 'OPTIMAL' : metrics.eyeContact >= 60 ? 'DEVIATING' : 'LOW_CONTACT'}
              </span>
            </motion.div>
          )}

          {/* Expression / Engagement (Conditional) */}
          {metrics.expressionScore !== undefined && metrics.expressionScore !== null && (
            <motion.div variants={itemVariants} className="glass-panel p-5 rounded-2xl flex flex-col items-start text-left float-medium interactive-card relative overflow-hidden font-mono border-zinc-800/80 bg-[#09090d]/60 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <span className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest mb-1">// index_expression</span>
              <div className="text-2xl font-black text-white mt-1">{metrics.expressionScore}%</div>
              <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-4 overflow-hidden border border-zinc-800">
                <div className={`h-full rounded-full ${metrics.expressionScore >= 75 ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : metrics.expressionScore >= 40 ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-amber-400'}`} style={{ width: `${metrics.expressionScore}%` }} />
              </div>
              <span className="text-[8px] text-zinc-500 mt-2 font-bold">
                DIAGNOSTIC: {metrics.expressionScore >= 75 ? 'EXPRESSIVE' : metrics.expressionScore >= 40 ? 'BALANCED' : 'NEUTRAL'}
              </span>
            </motion.div>
          )}
        </div>

        {/* AI Insights Panel */}
        <motion.div variants={itemVariants} className="glass-panel p-6 md:p-8 rounded-3xl flex-1 float-slow interactive-card border-zinc-800/80 bg-[#09090d]/60 font-mono shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
          <h3 className="text-sm font-bold mb-5 flex items-center gap-2 text-white uppercase tracking-wider">
            <Activity className="w-4 h-4 text-indigo-400" />
            [ DIAGNOSTIC_ANALYSIS ]
          </h3>
          <ul className="space-y-4">
            {metrics.suggestions && metrics.suggestions.length > 0 ? (
              metrics.suggestions.map((suggestion, i) => (
                <li key={i} className="flex items-start gap-3.5 text-zinc-300 text-xs md:text-sm leading-relaxed font-light">
                  <span className="mt-0.5 shrink-0 select-none font-bold text-indigo-500">{`0${i+1} //`}</span>
                  <span>{suggestion.text}</span>
                </li>
              ))
            ) : (
              <li className="flex items-start gap-3.5 text-zinc-500 text-xs md:text-sm leading-relaxed">
                <span className="mt-0.5 shrink-0 select-none font-bold text-indigo-500">-- //</span>
                <span>Consistent daily practice is required to gather trend data. Continue recording to unlock advanced coaching telemetry.</span>
              </li>
            )}
          </ul>
        </motion.div>
        
        {/* Transcript Section */}
        {metrics.transcript && (
          <motion.div variants={itemVariants} className="glass-panel p-6 md:p-8 rounded-3xl float-medium interactive-card border-zinc-800/80 bg-[#09090d]/60 font-mono shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
            <h3 className="text-sm font-bold mb-4 text-white uppercase tracking-wider flex items-center justify-between">
              <span>[ TRANSCRIPT_DUMP ]</span>
              <span className="text-[9px] text-zinc-600 font-normal">CHAR_COUNT: {metrics.transcript.length}</span>
            </h3>
            <div className="relative bg-[#050508] border border-zinc-900 rounded-2xl p-4 md:p-5 overflow-hidden">
              <div className="absolute left-4 top-4 md:top-5 text-[10px] text-zinc-700 select-none flex flex-col gap-1 text-right font-semibold">
                <span>01</span>
                {metrics.transcript.length > 80 && <span>02</span>}
                {metrics.transcript.length > 160 && <span>03</span>}
              </div>
              <p className="text-zinc-300 leading-relaxed font-light text-xs md:text-sm pl-8">
                {metrics.transcript}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
