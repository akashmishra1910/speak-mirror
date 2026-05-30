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
            <div className="glass-panel rounded-[2rem] overflow-hidden aspect-[9/16] max-h-[calc(100vh-120px)] shadow-2xl border border-white/5 relative bg-black group">
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
            <div className="glass-panel px-4 py-3 rounded-2xl border border-white/5 bg-white/[0.01] flex items-center justify-between text-left animate-fade-in">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Beautify Filter:</span>
              <select
                value={activeFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setActiveFilter(val);
                  localStorage.setItem("speak_mirror_beautify_filter", val);
                }}
                className="p-1.5 px-2.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
          <div className="glass-panel rounded-[2rem] aspect-[9/16] max-h-[60vh] border border-white/5 flex items-center justify-center bg-white/[0.01]">
            <p className="text-foreground/40 text-sm">No video recorded</p>
          </div>
        )}
        
        {/* Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
          {onSave && (
            <button 
              onClick={onSave}
              disabled={isSaving || isSaved || !videoUrl}
              className={`flex items-center justify-center gap-2 px-3 py-3 transition-all rounded-xl font-semibold text-sm md:text-base col-span-2 lg:col-span-1 ${isSaved ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white text-zinc-950 hover:bg-zinc-200 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.08)] disabled:opacity-50'}`}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
              {isSaving ? "Saving..." : isSaved ? "Saved" : "Save"}
            </button>
          )}
          {onRetake && (
            <button 
              onClick={onRetake}
              disabled={isSaving || isSaved}
              className="flex items-center justify-center gap-2 px-3 py-3 bg-red-950/20 text-red-400 border border-red-500/10 hover:bg-red-500/20 hover:border-red-500/25 transition-all rounded-xl font-medium text-sm md:text-base col-span-2 lg:col-span-1 disabled:opacity-50"
            >
              Retake
            </button>
          )}
          <button 
            onClick={handleDownload}
            disabled={!videoUrl}
            className="flex items-center justify-center gap-2 px-3 py-3 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all rounded-xl font-medium text-white disabled:opacity-50 text-sm md:text-base"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button 
            onClick={handleShare}
            className="flex items-center justify-center gap-2 px-3 py-3 bg-white/5 border border-white/5 text-white hover:bg-white/10 hover:border-white/10 transition-all rounded-xl font-medium text-sm md:text-base"
          >
            <Share2 className="w-4 h-4" />
            {isCopied ? "Copied!" : "Share"}
          </button>
        </div>
      </motion.div>

      {/* Right Column: Metrics */}
      <div className="w-full lg:w-2/3 flex flex-col gap-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div variants={itemVariants} className="glass-panel p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center text-center float-slow interactive-card">
            <span className="text-foreground/40 text-xs md:text-sm font-medium mb-2 uppercase tracking-wider">Confidence</span>
            <div className={`w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center border-4 text-xl md:text-3xl font-bold ${getScoreColor(metrics.confidence)}`}>
              {metrics.confidence}%
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="glass-panel p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center text-center float-medium interactive-card">
            <span className="text-foreground/40 text-xs md:text-sm font-medium mb-2 uppercase tracking-wider">Clarity</span>
            <div className={`w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center border-4 text-xl md:text-3xl font-bold ${getScoreColor(metrics.clarity)}`}>
              {metrics.clarity}%
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="glass-panel p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center text-center float-fast interactive-card">
            <span className="text-foreground/40 text-xs md:text-sm font-medium mb-2 uppercase tracking-wider">Filler Words</span>
            <div className={`w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center border-4 text-xl md:text-3xl font-bold ${metrics.fillerWords > 5 ? "text-amber-400 bg-amber-500/5 border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.05)]" : "text-emerald-400 bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]"}`}>
              {metrics.fillerWords}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="glass-panel p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center text-center float-slow interactive-card">
            <span className="text-foreground/40 text-xs md:text-sm font-medium mb-2 uppercase tracking-wider">Pace (WPM)</span>
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center border-4 border-white/10 text-zinc-300 bg-white/5 text-xl md:text-3xl font-bold shadow-[0_0_20px_rgba(255,255,255,0.02)]">
              {metrics.wpm}
            </div>
          </motion.div>
        </div>

        <motion.div variants={itemVariants} className="glass-panel p-6 md:p-8 rounded-3xl flex-1 float-slow interactive-card">
          <h3 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <Activity className="w-5 h-5 text-zinc-400" />
            AI Insights
          </h3>
          <ul className="space-y-4">
            {metrics.suggestions && metrics.suggestions.length > 0 ? (
              metrics.suggestions.map((suggestion, i) => (
                <li key={i} className="flex items-start gap-3 text-foreground/80 text-sm md:text-base leading-relaxed font-light">
                  {getIconForType(suggestion.type)}
                  <span>{suggestion.text}</span>
                </li>
              ))
            ) : (
              // Fallback if AI didn't provide suggestions
              <li className="flex items-start gap-3 text-foreground/60">
                <Info className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                <span className="font-light">Keep practicing! Consistent daily recording will drastically improve your communication over time.</span>
              </li>
            )}
          </ul>
        </motion.div>
        
        {metrics.transcript && (
          <motion.div variants={itemVariants} className="glass-panel p-6 md:p-8 rounded-3xl float-medium interactive-card">
            <h3 className="text-lg md:text-xl font-bold mb-4 text-white">Transcript</h3>
            <p className="text-foreground/60 leading-relaxed italic border-l border-white/20 pl-4 py-2 text-sm md:text-base bg-white/[0.01] rounded-r-xl">
              "{metrics.transcript}"
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
