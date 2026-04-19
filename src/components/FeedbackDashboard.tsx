"use client";

import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Activity, Info, Download, Share2, Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";

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

  if (!metrics) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400 bg-green-400/10 border-green-400/20";
    if (score >= 60) return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
    return "text-red-400 bg-red-400/10 border-red-400/20";
  };

  const getIconForType = (type: string) => {
    switch(type) {
      case 'filler': return <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />;
      case 'pace': return <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />;
      case 'confidence': return <Sparkles className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />;
      case 'clarity': return <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />;
      default: return <Activity className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />;
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
      <motion.div variants={itemVariants} className="w-full lg:w-1/3 flex flex-col gap-4">
        {videoUrl ? (
          <div className="glass-panel rounded-[2rem] overflow-hidden aspect-[9/16] max-h-[calc(100vh-120px)] shadow-2xl border border-surface-border relative bg-black">
            <video 
              src={videoUrl} 
              controls 
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
            />
          </div>
        ) : (
          <div className="glass-panel rounded-[2rem] aspect-[9/16] max-h-[60vh] border border-surface-border flex items-center justify-center bg-surface/30">
            <p className="text-foreground/50 text-sm">No video recorded</p>
          </div>
        )}
        
        {/* Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
          {onSave && (
            <button 
              onClick={onSave}
              disabled={isSaving || isSaved || !videoUrl}
              className={`flex items-center justify-center gap-2 px-3 py-3 transition-colors rounded-xl font-medium text-sm md:text-base col-span-2 lg:col-span-1 ${isSaved ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-brand-600 text-white hover:bg-brand-500 disabled:opacity-50'}`}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
              {isSaving ? "Saving..." : isSaved ? "Saved" : "Save"}
            </button>
          )}
          {onRetake && (
            <button 
              onClick={onRetake}
              disabled={isSaving || isSaved}
              className="flex items-center justify-center gap-2 px-3 py-3 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors rounded-xl font-medium text-sm md:text-base col-span-2 lg:col-span-1 disabled:opacity-50"
            >
              Retake
            </button>
          )}
          <button 
            onClick={handleDownload}
            disabled={!videoUrl}
            className="flex items-center justify-center gap-2 px-3 py-3 bg-surface border border-surface-border hover:bg-surface-border transition-colors rounded-xl font-medium disabled:opacity-50 text-sm md:text-base"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button 
            onClick={handleShare}
            className="flex items-center justify-center gap-2 px-3 py-3 bg-surface border border-surface-border text-foreground hover:bg-surface-border transition-colors rounded-xl font-medium text-sm md:text-base"
          >
            <Share2 className="w-4 h-4" />
            {isCopied ? "Copied!" : "Share"}
          </button>
        </div>
      </motion.div>

      {/* Right Column: Metrics */}
      <div className="w-full lg:w-2/3 flex flex-col gap-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div variants={itemVariants} className="glass-panel p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center text-center">
            <span className="text-foreground/60 text-xs md:text-sm font-medium mb-2 uppercase tracking-wider">Confidence</span>
            <div className={`w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center border-4 text-xl md:text-3xl font-bold ${getScoreColor(metrics.confidence)}`}>
              {metrics.confidence}%
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="glass-panel p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center text-center">
            <span className="text-foreground/60 text-xs md:text-sm font-medium mb-2 uppercase tracking-wider">Clarity</span>
            <div className={`w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center border-4 text-xl md:text-3xl font-bold ${getScoreColor(metrics.clarity)}`}>
              {metrics.clarity}%
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="glass-panel p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center text-center">
            <span className="text-foreground/60 text-xs md:text-sm font-medium mb-2 uppercase tracking-wider">Filler Words</span>
            <div className={`w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center border-4 text-xl md:text-3xl font-bold ${metrics.fillerWords > 5 ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" : "text-green-400 bg-green-400/10 border-green-400/20"}`}>
              {metrics.fillerWords}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="glass-panel p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center text-center">
            <span className="text-foreground/60 text-xs md:text-sm font-medium mb-2 uppercase tracking-wider">Pace (WPM)</span>
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center border-4 border-brand-500/30 text-brand-400 bg-brand-500/10 text-xl md:text-3xl font-bold">
              {metrics.wpm}
            </div>
          </motion.div>
        </div>

        <motion.div variants={itemVariants} className="glass-panel p-6 md:p-8 rounded-3xl flex-1">
          <h3 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-500" />
            AI Insights
          </h3>
          <ul className="space-y-4">
            {metrics.suggestions && metrics.suggestions.length > 0 ? (
              metrics.suggestions.map((suggestion, i) => (
                <li key={i} className="flex items-start gap-3 text-foreground/90 text-sm md:text-base leading-relaxed">
                  {getIconForType(suggestion.type)}
                  <span>{suggestion.text}</span>
                </li>
              ))
            ) : (
              // Fallback if AI didn't provide suggestions
              <li className="flex items-start gap-3 text-foreground/80">
                <Info className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
                <span>Keep practicing! Consistent daily recording will drastically improve your communication over time.</span>
              </li>
            )}
          </ul>
        </motion.div>
        
        {metrics.transcript && (
          <motion.div variants={itemVariants} className="glass-panel p-6 md:p-8 rounded-3xl">
            <h3 className="text-lg md:text-xl font-bold mb-4">Transcript</h3>
            <p className="text-foreground/70 leading-relaxed italic border-l-2 border-brand-500/50 pl-4 py-2 text-sm md:text-base">
              "{metrics.transcript}"
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
