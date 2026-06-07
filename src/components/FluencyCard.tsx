"use client";

import React, { useRef, useState, useEffect } from "react";
import { Download, Copy, Check } from "lucide-react";
import { toPng } from "html-to-image";

interface FluencyCardProps {
  userName: string;
  confidenceScore: number | string;
  clarityScore: number | string;
  paceWpm: number | string;
  fillerWordsCount: number | string;
}

export function FluencyCard({
  userName,
  confidenceScore,
  clarityScore,
  paceWpm,
  fillerWordsCount
}: FluencyCardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scale, setScale] = useState(1);

  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const cleanName = userName || "A Speaker";

  // Dynamic scaling handler to keep card perfectly aligned and un-cropped on mobile screens
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.offsetWidth;
      if (width < 620) {
        setScale(width / 620);
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
      await new Promise((resolve) => setTimeout(resolve, 150));
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        style: {
          transform: "scale(1)",
        }
      });
      const link = document.createElement("a");
      link.download = `speakmirror-milestone-${cleanName.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Save image failed:", err);
      alert("Failed to save fluency milestone card. Please try again.");
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
      handleSaveImage();
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center select-none" ref={containerRef}>
      
      {/* ==================== CARD CONTAINER (WITH RESPONSIVE SCALE WRAPPER) ==================== */}
      <div 
        style={{ 
          transform: `scale(${scale})`, 
          transformOrigin: "center center",
          width: "620px",
          height: "385px",
          marginTop: `${(scale - 1) * 192.5}px`,
          marginBottom: `${(scale - 1) * 192.5}px`
        }}
        className="transition-transform duration-200 shrink-0"
      >
        <div 
          ref={cardRef}
          className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-[28px] p-8 relative overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] flex flex-col justify-between text-left"
        >
          {/* Enhanced Subtle Ambient Glows */}
          <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-blue-500/5 rounded-full blur-[70px] pointer-events-none" />
          
          {/* Header */}
          <div className="flex justify-between items-center z-10">
            <div className="flex items-center gap-2">
              {/* Logo */}
              <div className="relative w-8 h-8 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg shadow-md shadow-indigo-500/20">
                <div className="w-4 h-4 border-2 border-white rounded-md rotate-45 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
              </div>
              <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                SpeakMirror <span className="text-sm font-normal text-slate-500">✨</span>
              </span>
            </div>
            
            {/* Pill Badge */}
            <span className="px-2.5 py-1 text-[9px] tracking-[0.15em] font-extrabold uppercase bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full flex items-center gap-1">
              Fluency ⚡
            </span>
          </div>

          {/* Heading Section */}
          <div className="z-10">
            <span className="text-[9px] tracking-[0.22em] font-extrabold text-slate-500 uppercase flex items-center gap-1.5">
              🏆 Speaking Performance Milestone
            </span>
            <h2 className="text-xl font-bold text-white mt-2 leading-snug tracking-tight max-w-[530px]">
              This certifies that <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 font-extrabold">{cleanName}</span> has successfully reached a new level of speaking excellence! 🚀
            </h2>
          </div>

          {/* Metrics Section (4 Grid Items) */}
          <div className="grid grid-cols-4 gap-3.5 z-10">
            
            {/* Confidence */}
            <div className="bg-slate-950/45 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden hover:border-emerald-500/30 transition-all duration-300">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500 rounded-r-md" />
              <span className="text-[9px] tracking-wider font-extrabold text-slate-400 uppercase flex items-center gap-1">
                Confidence 🎯
              </span>
              <span className="text-2xl font-black text-white mt-2 leading-none">{confidenceScore}%</span>
            </div>

            {/* Clarity */}
            <div className="bg-slate-950/45 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden hover:border-blue-500/30 transition-all duration-300">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500 rounded-r-md" />
              <span className="text-[9px] tracking-wider font-extrabold text-slate-400 uppercase flex items-center gap-1">
                Clarity 💎
              </span>
              <span className="text-2xl font-black text-white mt-2 leading-none">{clarityScore}%</span>
            </div>

            {/* Pace */}
            <div className="bg-slate-950/45 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden hover:border-amber-500/30 transition-all duration-300">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-500 rounded-r-md" />
              <span className="text-[9px] tracking-wider font-extrabold text-slate-400 uppercase flex items-center gap-1">
                Pace ⏱️
              </span>
              <span className="text-2xl font-black text-white mt-2 leading-none">
                {paceWpm} <span className="text-[10px] font-normal text-slate-500">WPM</span>
              </span>
            </div>

            {/* Filler Words */}
            <div className="bg-slate-950/45 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden hover:border-cyan-500/30 transition-all duration-300">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-cyan-500 rounded-r-md" />
              <span className="text-[9px] tracking-wider font-extrabold text-slate-400 uppercase flex items-center gap-1">
                Filler Words 🚫
              </span>
              <span className="text-2xl font-black text-white mt-2 leading-none">{fillerWordsCount}</span>
            </div>

          </div>

          {/* Footer */}
          <div className="flex justify-between items-center border-t border-slate-800/50 pt-4 z-10">
            <div className="flex items-center gap-3">
              <span className="text-[8px] text-slate-500 font-medium max-w-[320px] leading-tight">
                Validated via SpeakMirror AI analysis engine. Results represent statistical estimates of performance during mirror mode practice sessions.
              </span>
              {/* Green stamp */}
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[7px] font-extrabold text-emerald-400 tracking-wider uppercase shrink-0">
                <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Verified ✅
              </div>
            </div>

            <span className="text-[10px] tracking-wider font-extrabold text-indigo-400 shrink-0">
              speakmirror.app 🔗
            </span>
          </div>

        </div>
      </div>

      {/* Utilities */}
      <div className="flex gap-3">
        <button
          onClick={handleSaveImage}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-lg disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {isSaving ? "Creating PNG..." : "Download Certificate"}
        </button>
        <button
          onClick={handleCopyToClipboard}
          disabled={isCopying}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-semibold text-sm hover:bg-slate-800 hover:text-white active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          {isCopying ? "Copying..." : copied ? "Copied!" : "Copy Image"}
        </button>
      </div>

    </div>
  );
}
