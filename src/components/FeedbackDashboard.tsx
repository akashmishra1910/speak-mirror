"use client";

import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Activity, Info, Download, Share2, Sparkles, Loader2, Play, Pause, FileText } from "lucide-react";
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
  coachComment?: string | null;
  annotations?: { text: string; type: "filler" | "pace"; comment: string }[] | null;
}

function AnimatedCounter({ value, duration = 1, suffix = "" }: { value: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = Math.round(value);
    if (isNaN(end) || end <= 0) {
      setCount(0);
      return;
    }
    
    const totalMiliseconds = duration * 1000;
    const stepTime = Math.max(16, Math.floor(totalMiliseconds / end)); // max 60fps
    const increment = Math.ceil(end / (totalMiliseconds / stepTime));
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        start = end;
        clearInterval(timer);
      }
      setCount(start);
    }, stepTime);
    
    return () => clearInterval(timer);
  }, [value, duration]);
  return <>{count}{suffix}</>;
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
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleExportPDF = async () => {
    if (!metrics) return;
    
    setIsExportingPDF(true);
    try {
      // 1. Dynamic load of jsPDF from CDN
      let jsPDFClass = (window as any).jspdf?.jsPDF;
      if (!jsPDFClass) {
        const scriptId = "jspdf-cdn-script";
        let script = document.getElementById(scriptId) as HTMLScriptElement;
        if (!script) {
          script = document.createElement("script");
          script.id = scriptId;
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
          script.async = true;
          document.body.appendChild(script);
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
          });
        } else {
          await new Promise((resolve) => {
            const check = setInterval(() => {
              if ((window as any).jspdf?.jsPDF) {
                clearInterval(check);
                resolve(true);
              }
            }, 100);
          });
        }
        jsPDFClass = (window as any).jspdf.jsPDF;
      }

      if (!jsPDFClass) {
        alert("Failed to load PDF export library. Please check your network connection.");
        return;
      }

      // 2. Initialize jsPDF (A4 size: 210mm x 297mm)
      const doc = new jsPDFClass({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const margin = 20;
      let y = 20;

      // Dark Header Banner
      doc.setFillColor(9, 9, 13);
      doc.rect(0, 0, 210, 40, "F");

      // App Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text("SPEAKMIRROR", margin, 26);
      
      // Subtitle
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text("// SPONTANEOUS SPEECH DIAGNOSTICS REPORT", margin, 33);

      // Date of Report
      doc.setFont("courier", "bold");
      doc.setFontSize(9);
      doc.setTextColor(99, 102, 241);
      const dateStr = new Date().toLocaleDateString("en-US", {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      doc.text(`DATE: ${dateStr.toUpperCase()}`, 210 - margin, 26, { align: "right" });

      y = 55;

      // Section 1: Evaluation Details
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(31, 41, 55);
      doc.text("SPEECH EVALUATION DETAILS", margin, y);
      y += 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text("TOPIC / TASK:", margin, y);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(17, 24, 39);
      const topicText = metrics.title ? `${metrics.title}` : "Free Practice Session";
      const splitTopicText = doc.splitTextToSize(topicText, 140);
      doc.text(splitTopicText, margin + 28, y);
      y += splitTopicText.length * 5 + 6;

      // Draw line separator
      doc.setDrawColor(229, 231, 235);
      doc.line(margin, y, 210 - margin, y);
      y += 10;

      // Section 2: Telemetry Metrics Grid
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(31, 41, 55);
      doc.text("DIAGNOSTIC TELEMETRY INDEX", margin, y);
      y += 8;

      const gridItems = [
        { label: "CONFIDENCE", val: `${metrics.confidence}%` },
        { label: "CLARITY", val: `${metrics.clarity}%` },
        { label: "PACING", val: `${metrics.wpm} WPM` },
        { label: "FILLER WORDS", val: `${metrics.fillerWords}` }
      ];

      if (metrics.eyeContact !== undefined && metrics.eyeContact !== null) {
        gridItems.push({ label: "EYE CONTACT", val: `${metrics.eyeContact}%` });
      }
      if (metrics.expressionScore !== undefined && metrics.expressionScore !== null) {
        gridItems.push({ label: "EXPRESSION SCORE", val: `${metrics.expressionScore}%` });
      }

      let itemIndex = 0;
      gridItems.forEach((item) => {
        const col = itemIndex % 2;
        const row = Math.floor(itemIndex / 2);
        
        const cardX = margin + col * 88;
        const cardY = y + row * 18;
        
        // Draw card background
        doc.setFillColor(243, 244, 246);
        doc.rect(cardX, cardY, 82, 14, "F");
        
        // Text labels
        doc.setFont("courier", "bold");
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(`// ${item.label.toLowerCase().replace(" ", "_")}`, cardX + 4, cardY + 5.5);
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(17, 24, 39);
        doc.text(item.val, cardX + 4, cardY + 11.5);
        
        itemIndex++;
      });

      y += Math.ceil(gridItems.length / 2) * 18 + 8;

      // Draw line separator
      doc.setDrawColor(229, 231, 235);
      doc.line(margin, y, 210 - margin, y);
      y += 10;

      // Section 3: AI Coaching Insights Suggestions
      if (metrics.suggestions && metrics.suggestions.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(31, 41, 55);
        doc.text("AI DIAGNOSTIC ANALYSIS & INSIGHTS", margin, y);
        y += 8;

        doc.setFontSize(9);
        
        metrics.suggestions.forEach((sug, i) => {
          // Line wrap helper
          const splitSug = doc.splitTextToSize(sug.text, 155);
          
          // Check page break
          if (y + splitSug.length * 5 > 275) {
            doc.addPage();
            y = 20;
          }

          doc.setFont("courier", "bold");
          doc.setTextColor(99, 102, 241);
          doc.text(`0${i+1} //`, margin, y);

          doc.setFont("helvetica", "normal");
          doc.setTextColor(55, 65, 81);
          doc.text(splitSug, margin + 15, y);
          y += splitSug.length * 5 + 3;
        });

        y += 6;
        
        // Draw separator
        doc.setDrawColor(229, 231, 235);
        doc.line(margin, y, 210 - margin, y);
        y += 10;
      }

      // Section 4: Transcript Output
      if (metrics.transcript) {
        // Check page break
        if (y > 250) {
          doc.addPage();
          y = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(31, 41, 55);
        doc.text("SPEECH TRANSCRIPT DUMP", margin, y);
        y += 8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(55, 65, 81);
        
        const splitTranscript = doc.splitTextToSize(metrics.transcript, 170);
        
        splitTranscript.forEach((line: string) => {
          if (y > 275) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, margin, y);
          y += 5.5;
        });
      }

      // Export file download
      doc.save(`speakmirror-evaluation-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to export PDF: " + (err as Error).message);
    } finally {
      setIsExportingPDF(false);
    }
  };

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

  const handleDownload = async () => {
    if (!videoUrl) return;

    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      const { triggerDownload } = await import("@/lib/videoUtils");
      triggerDownload(blob, `speakmirror-practice-${new Date().toISOString().split('T')[0]}.${ext}`);
    } catch (err) {
      console.error("Failed to download video:", err);
      alert("Failed to export video: " + (err instanceof Error ? err.message : String(err)));
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

  const renderAnnotatedTranscript = () => {
    const text = metrics.transcript;
    const annotations = metrics.annotations;
    
    if (!annotations || annotations.length === 0) {
      return <span>{text}</span>;
    }

    // Sort by length descending to prevent substring mismatching
    const sortedAnnotations = [...annotations].sort((a, b) => b.text.length - a.text.length);
    
    const escapeRegExp = (string: string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    const pattern = sortedAnnotations.map(a => `(${escapeRegExp(a.text)})`).join('|');
    if (!pattern) return <span>{text}</span>;

    const regex = new RegExp(pattern, 'gi');
    const parts = text.split(regex);
    
    return (
      <>
        {parts.map((part, index) => {
          if (!part) return null;
          
          const matchedAnnotation = sortedAnnotations.find(
            a => a.text.toLowerCase() === part.toLowerCase()
          );
          
          if (matchedAnnotation) {
            const highlightColor = matchedAnnotation.type === 'filler' 
              ? 'bg-amber-500/15 text-amber-500 dark:text-amber-300 border border-amber-500/30' 
              : 'bg-indigo-500/15 text-indigo-500 dark:text-indigo-300 border border-indigo-500/30';
            
            return (
              <span 
                key={index} 
                className={`relative group inline-block mx-0.5 px-1 rounded cursor-help font-semibold transition-all duration-200 ${highlightColor} hover:scale-[1.02]`}
              >
                {part}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-zinc-950 border border-white/10 text-white text-[10px] p-2.5 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 font-normal leading-normal font-sans text-center">
                  <span className="font-extrabold uppercase block text-[8px] tracking-wider mb-1 text-zinc-400">
                    {matchedAnnotation.type === 'filler' ? 'Filler Word Spike' : 'Pacing Deviation'}
                  </span>
                  {matchedAnnotation.comment}
                  <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-950" />
                </span>
              </span>
            );
          }
          
          return <span key={index}>{part}</span>;
        })}
      </>
    );
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
            <div className="glass-panel rounded-3xl overflow-hidden aspect-[9/16] max-h-[calc(100vh-120px)] shadow-2xl border border-slate-200/50 dark:border-zinc-800/80 relative bg-black group">
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
                  className="w-16 h-16 md:w-20 md:h-20 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md rounded-full flex items-center justify-center pointer-events-auto transition-all text-white shadow-xl cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-8 h-8 md:w-10 md:h-10 fill-current" /> : <Play className="w-8 h-8 md:w-10 md:h-10 fill-current ml-2" />}
                </button>
              </div>
            </div>
            {/* Filter Selector in Feedback Dashboard */}
            <div className="glass-panel px-4 py-3 rounded-2xl border border-slate-200/50 bg-white/70 dark:border-zinc-800/80 dark:bg-[#09090d]/60 flex items-center justify-between text-left font-mono">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500">// active_filter</span>
              <select
                value={activeFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setActiveFilter(val);
                  localStorage.setItem("speak_mirror_beautify_filter", val);
                }}
                className="p-1.5 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-300 font-semibold focus:outline-none focus:ring-1 focus:ring-[#5B7C99] cursor-pointer text-[10px]"
              >
                <option value="none" className="bg-white text-slate-800 dark:bg-[#09090d] dark:text-white">Original</option>
                <option value="studio" className="bg-white text-slate-800 dark:bg-[#09090d] dark:text-white">Studio Glow ✨</option>
                <option value="warm" className="bg-white text-slate-800 dark:bg-[#09090d] dark:text-white">Warm Golden ☀️</option>
                <option value="cool" className="bg-white text-slate-800 dark:bg-[#09090d] dark:text-white">Nordic Cool ❄️</option>
                <option value="smooth" className="bg-white text-slate-800 dark:bg-[#09090d] dark:text-white">Soft Focus 🌸</option>
              </select>
            </div>
          </>
        ) : (
          <div className="glass-panel rounded-3xl aspect-[9/16] max-h-[60vh] border border-slate-200/50 dark:border-zinc-800/80 flex items-center justify-center bg-white/[0.01]">
            <p className="text-slate-400 dark:text-foreground/40 text-sm font-mono">[ NO_VIDEO_RECORDED ]</p>
          </div>
        )}
        
        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 mt-4 font-mono">
          {onSave && (
            <button 
              onClick={onSave}
              disabled={isSaving || isSaved || !videoUrl}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 transition-all rounded-xl font-bold text-xs border cursor-pointer ${
                isSaved 
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 shadow-[0_4px_12px_rgba(16,185,129,0.05)]' 
                  : 'bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white shadow-[0_4px_12px_rgba(2,132,199,0.15)] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 dark:bg-none dark:shadow-none border-transparent disabled:opacity-50'
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
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/25 hover:border-rose-500/40 dark:text-rose-400 dark:border-rose-500/20 dark:hover:bg-rose-500/20 transition-all rounded-xl font-bold text-xs disabled:opacity-50 shadow-[0_4px_12px_rgba(244,63,94,0.05)] cursor-pointer"
            >
              RETAKE_TEST
            </button>
          )}
          <button 
            onClick={handleDownload}
            disabled={!videoUrl}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 hover:border-slate-300 dark:bg-white/[0.03] dark:border-white/10 dark:hover:bg-white/[0.08] dark:hover:border-white/20 dark:text-white transition-all rounded-xl font-bold disabled:opacity-50 text-xs cursor-pointer shadow-sm dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] backdrop-blur-md border"
          >
            <Download className="w-3.5 h-3.5" />
            EXPORT_VIDEO
          </button>
          <button 
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 hover:border-slate-300 dark:bg-white/[0.03] dark:border-white/10 dark:hover:bg-white/[0.08] dark:hover:border-white/20 dark:text-white transition-all rounded-xl font-bold disabled:opacity-50 text-xs cursor-pointer shadow-sm dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] backdrop-blur-md border"
          >
            {isExportingPDF ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            {isExportingPDF ? "EXPORTING..." : "EXPORT_PDF"}
          </button>
          <button 
            onClick={handleShare}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 hover:border-slate-300 dark:bg-white/[0.03] dark:border-white/10 dark:hover:bg-white/[0.08] dark:hover:border-white/20 dark:text-white transition-all rounded-xl font-bold text-xs cursor-pointer col-span-2 shadow-sm dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] backdrop-blur-md border"
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
          <motion.div variants={itemVariants} className="glass-panel p-5 rounded-2xl flex flex-col items-start text-left float-slow interactive-card relative overflow-hidden font-mono border-slate-200/50 bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-zinc-800/80 dark:bg-[#09090d]/60 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
            <span className="text-slate-500 dark:text-zinc-500 text-[9px] font-bold uppercase tracking-widest mb-1">// index_confidence</span>
            <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-blue-600 dark:bg-none dark:text-white mt-1">
              <AnimatedCounter value={metrics.confidence} suffix="%" />
            </div>
            <div className="w-full bg-slate-200 dark:bg-zinc-900 h-1.5 rounded-full mt-4 overflow-hidden border border-slate-300/30 dark:border-zinc-800">
              <motion.div 
                className={`h-full rounded-full ${metrics.confidence >= 80 ? 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : metrics.confidence >= 60 ? 'bg-amber-500 dark:bg-amber-400' : 'bg-rose-500 dark:bg-rose-400'}`} 
                initial={{ width: 0 }}
                animate={{ width: `${metrics.confidence}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <span className="text-[8px] text-slate-500 dark:text-zinc-500 mt-2 font-bold">
              DIAGNOSTIC: {metrics.confidence >= 80 ? 'SECURE' : metrics.confidence >= 60 ? 'STABLE' : 'LOW_INDEX'}
            </span>
          </motion.div>

          {/* Clarity */}
          <motion.div variants={itemVariants} className="glass-panel p-5 rounded-2xl flex flex-col items-start text-left float-medium interactive-card relative overflow-hidden font-mono border-slate-200/50 bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-zinc-800/80 dark:bg-[#09090d]/60 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
            <span className="text-slate-500 dark:text-zinc-500 text-[9px] font-bold uppercase tracking-widest mb-1">// index_clarity</span>
            <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-blue-600 dark:bg-none dark:text-white mt-1">
              <AnimatedCounter value={metrics.clarity} suffix="%" />
            </div>
            <div className="w-full bg-slate-200 dark:bg-zinc-900 h-1.5 rounded-full mt-4 overflow-hidden border border-slate-300/30 dark:border-zinc-800">
              <motion.div 
                className={`h-full rounded-full ${metrics.clarity >= 80 ? 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : metrics.clarity >= 60 ? 'bg-amber-500 dark:bg-amber-400' : 'bg-rose-500 dark:bg-rose-400'}`} 
                initial={{ width: 0 }}
                animate={{ width: `${metrics.clarity}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <span className="text-[8px] text-slate-500 dark:text-zinc-500 mt-2 font-bold">
              EVALUATION: {metrics.clarity >= 80 ? 'OPTIMAL' : metrics.clarity >= 60 ? 'STABLE' : 'DEVIATED'}
            </span>
          </motion.div>

          {/* Filler Words */}
          <motion.div variants={itemVariants} className="glass-panel p-5 rounded-2xl flex flex-col items-start text-left float-fast interactive-card relative overflow-hidden font-mono border-slate-200/50 bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-zinc-800/80 dark:bg-[#09090d]/60 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
            <span className="text-slate-500 dark:text-zinc-500 text-[9px] font-bold uppercase tracking-widest mb-1">// counter_fillers</span>
            <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-blue-600 dark:bg-none dark:text-white mt-1">
              <AnimatedCounter value={metrics.fillerWords} />
            </div>
            <div className="w-full bg-slate-200 dark:bg-zinc-900 h-1.5 rounded-full mt-4 overflow-hidden border border-slate-300/30 dark:border-zinc-800">
              <motion.div 
                className={`h-full rounded-full ${metrics.fillerWords <= 2 ? 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : metrics.fillerWords <= 5 ? 'bg-amber-500 dark:bg-amber-400' : 'bg-rose-500 dark:bg-rose-400'}`} 
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(0, 100 - (metrics.fillerWords * 10))}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <span className="text-[8px] text-slate-500 dark:text-zinc-500 mt-2 font-bold">
              DIAGNOSTIC: {metrics.fillerWords <= 2 ? 'CLEAN' : metrics.fillerWords <= 5 ? 'MODERATE' : 'HIGH_FREQUENCY'}
            </span>
          </motion.div>

          {/* Pace */}
          <motion.div variants={itemVariants} className="glass-panel p-5 rounded-2xl flex flex-col items-start text-left float-slow interactive-card relative overflow-hidden font-mono border-slate-200/50 bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-zinc-800/80 dark:bg-[#09090d]/60 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
            <span className="text-slate-500 dark:text-zinc-500 text-[9px] font-bold uppercase tracking-widest mb-1">// rate_wpm</span>
            <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-blue-600 dark:bg-none dark:text-white mt-1">
              <AnimatedCounter value={metrics.wpm} /> <span className="text-[10px] text-slate-500 dark:text-zinc-500">WPM</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-zinc-900 h-1.5 rounded-full mt-4 overflow-hidden border border-slate-300/30 dark:border-zinc-800">
              <motion.div 
                className="h-full rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (metrics.wpm / 200) * 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <span className="text-[8px] text-slate-500 dark:text-zinc-500 mt-2 font-bold">
              DIAGNOSTIC: {metrics.wpm >= 110 && metrics.wpm <= 170 ? 'BALANCED' : metrics.wpm > 170 ? 'COMPRESSED' : 'LACONIC'}
            </span>
          </motion.div>

          {/* Eye Contact (Conditional) */}
          {metrics.eyeContact !== undefined && metrics.eyeContact !== null && (
            <motion.div variants={itemVariants} className="glass-panel p-5 rounded-2xl flex flex-col items-start text-left float-slow interactive-card relative overflow-hidden font-mono border-slate-200/50 bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-zinc-800/80 dark:bg-[#09090d]/60 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <span className="text-slate-500 dark:text-zinc-500 text-[9px] font-bold uppercase tracking-widest mb-1">// index_gaze</span>
              <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-blue-600 dark:bg-none dark:text-white mt-1">
                <AnimatedCounter value={metrics.eyeContact} suffix="%" />
              </div>
              <div className="w-full bg-slate-200 dark:bg-zinc-900 h-1.5 rounded-full mt-4 overflow-hidden border border-slate-300/30 dark:border-zinc-800">
                <motion.div 
                  className={`h-full rounded-full ${metrics.eyeContact >= 80 ? 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : metrics.eyeContact >= 60 ? 'bg-amber-500 dark:bg-amber-400' : 'bg-rose-500 dark:bg-rose-400'}`} 
                  initial={{ width: 0 }}
                  animate={{ width: `${metrics.eyeContact}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <span className="text-[8px] text-slate-500 dark:text-zinc-500 mt-2 font-bold">
                DIAGNOSTIC: {metrics.eyeContact >= 80 ? 'OPTIMAL' : metrics.eyeContact >= 60 ? 'DEVIATING' : 'LOW_CONTACT'}
              </span>
            </motion.div>
          )}

          {/* Expression / Engagement (Conditional) */}
          {metrics.expressionScore !== undefined && metrics.expressionScore !== null && (
            <motion.div variants={itemVariants} className="glass-panel p-5 rounded-2xl flex flex-col items-start text-left float-medium interactive-card relative overflow-hidden font-mono border-slate-200/50 bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-zinc-800/80 dark:bg-[#09090d]/60 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <span className="text-slate-500 dark:text-zinc-500 text-[9px] font-bold uppercase tracking-widest mb-1">// index_expression</span>
              <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-blue-600 dark:bg-none dark:text-white mt-1">
                <AnimatedCounter value={metrics.expressionScore} suffix="%" />
              </div>
              <div className="w-full bg-slate-200 dark:bg-zinc-900 h-1.5 rounded-full mt-4 overflow-hidden border border-slate-300/30 dark:border-zinc-800">
                <motion.div 
                  className={`h-full rounded-full ${metrics.expressionScore >= 75 ? 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : metrics.expressionScore >= 40 ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-amber-500 dark:bg-amber-400'}`} 
                  initial={{ width: 0 }}
                  animate={{ width: `${metrics.expressionScore}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <span className="text-[8px] text-slate-500 dark:text-zinc-500 mt-2 font-bold">
                DIAGNOSTIC: {metrics.expressionScore >= 75 ? 'EXPRESSIVE' : metrics.expressionScore >= 40 ? 'BALANCED' : 'NEUTRAL'}
              </span>
            </motion.div>
          )}
        </div>

        {/* AI Insights Panel */}
        <motion.div variants={itemVariants} className="glass-panel p-6 md:p-8 rounded-3xl flex-1 float-slow interactive-card border-slate-200/50 bg-white/70 font-mono shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-zinc-800/80 dark:bg-[#09090d]/60 dark:shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
          <h3 className="text-sm font-bold mb-5 flex items-center gap-2 text-slate-800 dark:text-white uppercase tracking-wider">
            <Activity className="w-4 h-4 text-[#5B7C99] dark:text-indigo-400" />
            [ DIAGNOSTIC_ANALYSIS ]
          </h3>

          {/* AI Coach Quote Card */}
          {metrics.coachComment && (
            <motion.div 
              variants={itemVariants}
              className="mb-6 p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 flex gap-4 items-start text-left relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-2 text-indigo-500/10 pointer-events-none">
                <Sparkles className="w-16 h-16 -mr-4 -mt-4 rotate-12" />
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <div className="flex flex-col gap-1 relative z-10 font-sans">
                <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-400 font-mono">// ai_coach_feedback</span>
                <p className="text-slate-800 dark:text-zinc-150 text-xs md:text-sm italic font-light leading-relaxed">
                  "{metrics.coachComment}"
                </p>
              </div>
            </motion.div>
          )}

          <ul className="space-y-4">
            {metrics.suggestions && metrics.suggestions.length > 0 ? (
              metrics.suggestions.map((suggestion, i) => (
                <li key={i} className="flex items-start gap-3.5 text-slate-600 dark:text-zinc-300 text-xs md:text-sm leading-relaxed font-light">
                  <span className="mt-0.5 shrink-0 select-none font-bold text-[#5B7C99] dark:text-indigo-500">{`0${i+1} //`}</span>
                  <span>{suggestion.text}</span>
                </li>
              ))
            ) : (
              <li className="flex items-start gap-3.5 text-slate-500 dark:text-zinc-500 text-xs md:text-sm leading-relaxed">
                <span className="mt-0.5 shrink-0 select-none font-bold text-[#5B7C99] dark:text-indigo-500">-- //</span>
                <span>Consistent daily practice is required to gather trend data. Continue recording to unlock advanced coaching telemetry.</span>
              </li>
            )}
          </ul>
        </motion.div>
        
        {/* Transcript Section */}
        {metrics.transcript && (
          <motion.div variants={itemVariants} className="glass-panel p-6 md:p-8 rounded-3xl float-medium interactive-card border-slate-200/50 bg-white/70 font-mono shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-zinc-800/80 dark:bg-[#09090d]/60 dark:shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
            <h3 className="text-sm font-bold mb-4 text-slate-800 dark:text-white uppercase tracking-wider flex items-center justify-between">
              <span>[ TRANSCRIPT_DUMP ]</span>
              <span className="text-[9px] text-slate-500 dark:text-zinc-600 font-normal">CHAR_COUNT: {metrics.transcript.length}</span>
            </h3>
            <div className="relative bg-slate-50 border border-slate-200 dark:bg-black/40 dark:border-zinc-900 rounded-2xl p-4 md:p-5 overflow-hidden">
              <div className="absolute left-4 top-4 md:top-5 text-[10px] text-slate-400 dark:text-zinc-700 select-none flex flex-col gap-1 text-right font-semibold">
                <span>01</span>
                {metrics.transcript.length > 80 && <span>02</span>}
                {metrics.transcript.length > 160 && <span>03</span>}
              </div>
              <p className="text-slate-650 dark:text-zinc-350 leading-relaxed font-light text-xs md:text-sm pl-8">
                {renderAnnotatedTranscript()}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
