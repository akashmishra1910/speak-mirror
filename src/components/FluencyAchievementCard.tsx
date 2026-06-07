"use client";

import React, { useRef, useState, useEffect } from "react";
import { Download, Share2, Award, ShieldCheck, Activity, Timer, MessageSquare, Eye, Sparkles, Smile, Copy, Check } from "lucide-react";
import { toPng } from "html-to-image";

interface FluencyAchievementCardProps {
  metrics?: {
    overallScore?: number;
    wpm?: number;
    fillerWordsCount?: number;
    fillerWordsList?: string[];
    pauseDuration?: number;
    eyeContactScore?: number;
    engagementScore?: number;
    primaryEmotion?: string;
    // Legacy support fallback
    confidence?: number;
    clarity?: number;
    fillerWords?: number;
  };
  userName?: string;
  topic?: string;
  date?: string;
}

export function FluencyAchievementCard({ metrics: rawMetrics, userName, topic, date }: FluencyAchievementCardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scale, setScale] = useState(1);

  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize metrics with robust defaults
  const overallScore = rawMetrics?.overallScore ?? rawMetrics?.confidence ?? 85;
  const wpm = rawMetrics?.wpm ?? 135;
  const fillerWordsCount = rawMetrics?.fillerWordsCount ?? rawMetrics?.fillerWords ?? 3;
  const fillerWordsList = rawMetrics?.fillerWordsList ?? ["uh", "um", "like"];
  const pauseDuration = rawMetrics?.pauseDuration ?? 1.8;
  const eyeContactScore = rawMetrics?.eyeContactScore ?? rawMetrics?.clarity ?? 78;
  const engagementScore = rawMetrics?.engagementScore ?? 84;
  const primaryEmotion = rawMetrics?.primaryEmotion ?? "Confident";

  const cleanName = userName || "A Speaker";
  const cleanTopic = topic || "Impromptu Presentation";
  const cleanDate = date || new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  // Calculate dynamic skill levels
  let performanceLevel = "Developing Fluency";
  let performanceColor = "text-amber-400";
  if (overallScore >= 85) {
    performanceLevel = "Excellent Fluency";
    performanceColor = "text-emerald-400";
  } else if (overallScore >= 70) {
    performanceLevel = "Good Fluency";
    performanceColor = "text-indigo-400";
  }

  // Handle dynamic sizing & scaling to make it fully responsive
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.offsetWidth;
      if (width < 864) {
        // Leave some margin for padding
        setScale(Math.max(0.35, (width - 32) / 800));
      } else {
        setScale(1);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSaveImage = async () => {
    if (!cardRef.current || isSaving) return;
    setIsSaving(true);
    try {
      // Small delay to ensure CSS classes and fonts render fully
      await new Promise((resolve) => setTimeout(resolve, 150));
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        style: {
          transform: "scale(1)",
        }
      });
      const link = document.createElement("a");
      link.download = `speakmirror-achievement-${cleanName.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Save image failed:", err);
      alert("Failed to save achievement card. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!cardRef.current || isCopying) return;
    setIsCopying(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        style: {
          transform: "scale(1)",
        }
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy to clipboard failed:", err);
      // Fallback to direct download if clipboard fails (common in some browsers/HTTP contexts)
      handleSaveImage();
    } finally {
      setIsCopying(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current || isSharing) return;
    setIsSharing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        style: {
          transform: "scale(1)",
        }
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `speakmirror-achievement.png`, { type: "image/png" });

      const shareText = `Proud to share my speech analytics certificate from SpeakMirror! Overall Fluency: ${overallScore}%. 🚀`;

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "SpeakMirror Fluency Achievement Certificate",
          text: shareText
        });
      } else {
        // Fallback
        await handleSaveImage();
        alert("Web Share API is not supported in this browser. We downloaded the certificate image for you!");
      }
    } catch (err) {
      console.error("Share failed:", err);
      alert("Failed to share card. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center py-6 select-none" ref={containerRef}>
      
      {/* ==================== CERTIFICATE CONTAINER (RESPONSIVE WRAPPER) ==================== */}
      <div 
        style={{ 
          transform: `scale(${scale})`, 
          transformOrigin: "center center",
          width: "800px",
          height: "450px",
          marginTop: `${(scale - 1) * 225}px`,
          marginBottom: `${(scale - 1) * 225}px`
        }}
        className="transition-transform duration-200 shrink-0"
      >
        {/* Card Border Padding Wrapper */}
        <div className="p-[1.5px] bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-3xl shadow-[0_20px_50px_rgba(99,102,241,0.25)] w-full h-full">
          
          {/* Main Card Body */}
          <div 
            ref={cardRef}
            className="w-full h-full bg-slate-950 rounded-[23px] relative overflow-hidden p-8 flex flex-col justify-between text-left"
          >
            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none z-0" />
            
            {/* Glowing Orbs */}
            <div className="absolute -left-16 -top-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none z-0" />
            <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none z-0" />
            <div className="absolute left-[40%] top-[30%] w-60 h-60 bg-pink-500/5 rounded-full blur-[90px] pointer-events-none z-0" />

            {/* SVG Gradients for Progress Ring */}
            <svg className="hidden">
              <defs>
                <linearGradient id="certScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
                <filter id="certGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
            </svg>

            {/* ==================== HEADER (TOP) ==================== */}
            <div className="z-10 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <ShieldCheck className="w-5 h-5 text-indigo-400 animate-pulse" />
                  <span className="text-[10px] tracking-[0.2em] font-extrabold text-indigo-400 uppercase">
                    SpeakMirror Verified Assessment
                  </span>
                </div>
                <h3 className="text-3xl font-black text-white tracking-tight leading-none">
                  {cleanName}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-[480px] truncate">
                  Topic: <span className="text-slate-200 font-semibold">{cleanTopic}</span>
                </p>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Assessment Date</span>
                <span className="text-sm font-bold text-slate-300 mt-0.5">{cleanDate}</span>
              </div>
            </div>

            {/* ==================== BODY (MIDDLE) ==================== */}
            <div className="z-10 flex justify-between items-center my-auto">
              
              {/* Hero Section (Left Side) */}
              <div className="flex flex-col items-center justify-center w-[230px] h-[230px] bg-white/[0.02] border border-white/5 rounded-3xl relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
                
                <span className="text-[10px] tracking-widest font-extrabold text-indigo-300 uppercase mb-2">Overall Score</span>
                
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-32 h-32 transform -rotate-90">
                    {/* Track Circle */}
                    <circle
                      cx="64"
                      cy="64"
                      r="52"
                      className="stroke-slate-800/80"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    {/* Progress Circle with Glow & Gradient */}
                    <circle
                      cx="64"
                      cy="64"
                      r="52"
                      stroke="url(#certScoreGrad)"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 52}
                      strokeDashoffset={2 * Math.PI * 52 * (1 - overallScore / 100)}
                      strokeLinecap="round"
                      filter="url(#certGlow)"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  
                  {/* Inside Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-white tracking-tight drop-shadow-[0_0_10px_rgba(168,85,247,0.4)]">
                      {overallScore}%
                    </span>
                    <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">
                      Accuracy
                    </span>
                  </div>
                </div>
                
                <div className="mt-2.5 text-center">
                  <p className={`text-xs font-black tracking-wide ${performanceColor}`}>
                    {performanceLevel}
                  </p>
                </div>
              </div>

              {/* Data Grid (Right Side) */}
              <div className="grid grid-cols-2 gap-3 w-[470px]">
                
                {/* Tile 1: Pace */}
                <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-2xl p-3 flex flex-col justify-between hover:border-white/10 transition-all duration-350">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Speaking Pace</span>
                    <Activity className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="mt-2">
                    <div className="text-lg font-extrabold text-white">
                      {wpm} <span className="text-xs font-medium text-slate-400">WPM</span>
                    </div>
                    <div className="text-[8px] text-slate-500 font-medium mt-0.5">Optimal: 110–150 WPM</div>
                  </div>
                </div>
                
                {/* Tile 2: Pauses */}
                <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-2xl p-3 flex flex-col justify-between hover:border-white/10 transition-all duration-350">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Pause Duration</span>
                    <Timer className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="mt-2">
                    <div className="text-lg font-extrabold text-white">
                      {pauseDuration}s
                    </div>
                    <div className="text-[8px] text-slate-500 font-medium mt-0.5">Total pause silence</div>
                  </div>
                </div>

                {/* Tile 3: Filler Words */}
                <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-2xl p-3 flex flex-col justify-between hover:border-white/10 transition-all duration-350">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Filler Words</span>
                    <MessageSquare className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="mt-2">
                    <div className="text-lg font-extrabold text-white">
                      {fillerWordsCount} <span className="text-xs font-medium text-slate-400">used</span>
                    </div>
                    <div className="text-[8px] text-slate-400 font-medium mt-0.5 truncate">
                      Top: {fillerWordsList.slice(0, 3).map(w => `"${w}"`).join(", ")}
                    </div>
                  </div>
                </div>

                {/* Tile 4: Eye Contact */}
                <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-2xl p-3 flex flex-col justify-between hover:border-white/10 transition-all duration-350">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Eye Contact</span>
                    <Eye className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="mt-2">
                    <div className="text-lg font-extrabold text-white">
                      {eyeContactScore}%
                    </div>
                    <div className="text-[8px] text-slate-500 font-medium mt-0.5">Camera engagement</div>
                  </div>
                </div>

                {/* Tile 5: Expressiveness */}
                <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-2xl p-3 flex flex-col justify-between hover:border-white/10 transition-all duration-350">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Expressiveness</span>
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="mt-2">
                    <div className="text-lg font-extrabold text-white">
                      {engagementScore}%
                    </div>
                    <div className="text-[8px] text-slate-500 font-medium mt-0.5">Vocal & facial dynamics</div>
                  </div>
                </div>

                {/* Tile 6: Primary Emotion */}
                <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-2xl p-3 flex flex-col justify-between hover:border-white/10 transition-all duration-350">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Tone Profile</span>
                    <Smile className="w-4 h-4 text-pink-400" />
                  </div>
                  <div className="mt-2">
                    <div className="text-lg font-extrabold text-white capitalize">
                      {primaryEmotion}
                    </div>
                    <div className="text-[8px] text-slate-500 font-medium mt-0.5">Dominant emotion vibe</div>
                  </div>
                </div>

              </div>

            </div>

            {/* ==================== FOOTER (BOTTOM) ==================== */}
            <div className="z-10 flex justify-between items-center border-t border-white/5 pt-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[9px] tracking-wider font-extrabold text-slate-500 uppercase">
                  Assessment Validated
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold tracking-wider">
                speak-mirror.com
              </span>
            </div>

          </div>
        </div>
      </div>

      {/* ==================== UTILITY PANEL (OUTSIDE CARD CONTAINER) ==================== */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        <button
          onClick={handleSaveImage}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-lg disabled:opacity-50 disabled:pointer-events-none"
        >
          <Download className="w-4 h-4" />
          {isSaving ? "Creating PNG..." : "Download Certificate PNG"}
        </button>

        <button
          onClick={handleCopyToClipboard}
          disabled={isCopying}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-semibold text-sm hover:bg-slate-800 hover:text-white active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          {isCopying ? "Copying..." : copied ? "Copied!" : "Copy Image to Clipboard"}
        </button>

        <button
          onClick={handleShare}
          disabled={isSharing}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-semibold text-sm hover:bg-slate-800 hover:text-white active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
        >
          <Share2 className="w-4 h-4" />
          {isSharing ? "Sharing..." : "Share Certificate"}
        </button>
      </div>

    </div>
  );
}
