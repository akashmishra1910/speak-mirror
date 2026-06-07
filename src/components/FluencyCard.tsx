"use client";

import React, { useRef, useState } from "react";
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
  const cardRef = useRef<HTMLDivElement>(null);

  const cleanName = userName || "A Speaker";

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
      // Fallback: direct download
      handleSaveImage();
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      
      {/* ==================== CARD CONTAINER ==================== */}
      <div 
        ref={cardRef}
        className="w-full max-w-[620px] bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl flex flex-col justify-between aspect-[1.6/1] text-left select-none"
      >
        {/* Gradient Glows */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.05),transparent_50%)] pointer-events-none" />
        
        {/* Header */}
        <div className="flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            {/* Logo */}
            <div className="relative w-8 h-8 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg shadow-md shadow-indigo-500/20">
              <div className="w-4 h-4 border-2 border-white rounded-md rotate-45 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>
            <span className="text-lg font-black tracking-tight text-white">
              Speak<span className="text-indigo-400">Mirror</span>
            </span>
          </div>
          
          {/* Badge */}
          <span className="px-2.5 py-1 text-[10px] tracking-widest font-extrabold uppercase bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full">
            Fluency
          </span>
        </div>

        {/* Heading Section */}
        <div className="mt-8 mb-6 z-10">
          <span className="text-[10px] tracking-[0.2em] font-extrabold text-slate-500 uppercase">
            Speaking Performance Milestone
          </span>
          <h2 className="text-2xl font-extrabold text-white mt-1.5 leading-tight tracking-tight max-w-[520px]">
            This certifies that <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 font-black">{cleanName}</span> has successfully reached a new level of speaking excellence.
          </h2>
        </div>

        {/* Metrics Section (4 identical cards in a row/grid) */}
        <div className="grid grid-cols-4 gap-3 z-10">
          
          {/* Confidence - Emerald Accent */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden hover:border-emerald-500/30 transition-all duration-300">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500 rounded-r-md" />
            <span className="text-[9px] tracking-wider font-extrabold text-slate-400 uppercase">Confidence</span>
            <span className="text-2xl font-black text-white mt-2 leading-none">{confidenceScore}%</span>
          </div>

          {/* Clarity - Blue Accent */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden hover:border-blue-500/30 transition-all duration-300">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500 rounded-r-md" />
            <span className="text-[9px] tracking-wider font-extrabold text-slate-400 uppercase">Clarity</span>
            <span className="text-2xl font-black text-white mt-2 leading-none">{clarityScore}%</span>
          </div>

          {/* Pace - Orange Accent */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden hover:border-amber-500/30 transition-all duration-300">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-500 rounded-r-md" />
            <span className="text-[9px] tracking-wider font-extrabold text-slate-400 uppercase">Pace</span>
            <span className="text-2xl font-black text-white mt-2 leading-none">
              {paceWpm} <span className="text-[10px] font-normal text-slate-400">WPM</span>
            </span>
          </div>

          {/* Filler Words - Teal Accent */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden hover:border-cyan-500/30 transition-all duration-300">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-cyan-500 rounded-r-md" />
            <span className="text-[9px] tracking-wider font-extrabold text-slate-400 uppercase">Filler Words</span>
            <span className="text-2xl font-black text-white mt-2 leading-none">{fillerWordsCount}</span>
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-between items-center border-t border-slate-800/60 pt-4 mt-8 z-10">
          <div className="flex items-center gap-3">
            <span className="text-[8px] text-slate-650 text-slate-500 font-medium max-w-[280px] leading-tight">
              Validated via SpeakMirror AI analysis engine. Results represent statistical estimates of performance during mirror mode practice sessions.
            </span>
            {/* Green Colored Verified Stamp */}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-extrabold text-emerald-400 tracking-wider uppercase">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Verified
            </div>
          </div>

          <a 
            href="https://speakmirror.app" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-[10px] tracking-widest font-extrabold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            speakmirror.app
          </a>
        </div>
      </div>

      {/* Utilities */}
      <div className="flex gap-3 mt-6">
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
