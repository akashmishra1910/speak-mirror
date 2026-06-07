"use client";

import React, { useRef, useState } from "react";
import { Download, Share2, Sparkles, RefreshCw, Activity, Video, Smile } from "lucide-react";
import { toPng } from "html-to-image";

interface FluencyCardProps {
  metrics?: {
    overallScore?: number;
    wpm?: number;
    fillerWordsCount?: number;
    fillerWordsList?: string[];
    pauseDuration?: number;
    eyeContactScore?: number;
    engagementScore?: number;
    primaryEmotion?: string;
    // Legacy metrics fallback support
    confidence?: number;
    clarity?: number;
    fillerWords?: number;
  };
  userName?: string;
  topic?: string;
  date?: string;
}

export function FluencyCard({ metrics: rawMetrics, userName, topic, date }: FluencyCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);

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
  const cleanTopic = topic || "Spontaneous Presentation";
  const cleanDate = date || new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  const handleSaveImage = async (e: React.MouseEvent, cardRef: React.RefObject<HTMLDivElement | null>, face: string) => {
    e.stopPropagation();
    if (!cardRef.current || isSaving) return;
    setIsSaving(true);
    try {
      // Small delay to ensure styles and fonts are applied
      await new Promise((resolve) => setTimeout(resolve, 100));
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        style: {
          transform: "scale(1)",
        }
      });
      const link = document.createElement("a");
      link.download = `speakmirror-fluency-${face}-${cleanName.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Save image failed:", err);
      alert("Failed to save card image. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async (e: React.MouseEvent, cardRef: React.RefObject<HTMLDivElement | null>) => {
    e.stopPropagation();
    if (!cardRef.current || isSharing) return;
    setIsSharing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const dataUrl = await toPng(cardRef.current, { cacheBust: true });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `speakmirror-card.png`, { type: "image/png" });

      const shareText = `Check out my speech analytics on SpeakMirror! Pace: ${wpm} WPM, Score: ${overallScore}%! 🚀`;

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "SpeakMirror Fluency Card",
          text: shareText
        });
      } else {
        // Fallback
        const link = document.createElement("a");
        link.download = `speakmirror-card.png`;
        link.href = dataUrl;
        link.click();
        alert("Direct sharing is not supported in this browser. We downloaded the card PNG for you!");
      }
    } catch (err) {
      console.error("Share failed:", err);
      alert("Failed to share card. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto mt-8 text-left select-none">
      {/* 3D Flashcard Flip Wrapper */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full h-[500px] perspective-1000 cursor-pointer"
      >
        <div
          className={`w-full h-full relative transition-transform duration-700 preserve-3d ${
            isFlipped ? "rotate-y-180" : ""
          }`}
        >
          {/* ==================== FRONT OF CARD (Speech Fluency) ==================== */}
          <div
            ref={frontCardRef}
            className="absolute inset-0 w-full h-full backface-hidden rounded-3xl bg-[#faf9f6] border border-slate-200/80 shadow-[0_10px_35px_rgba(0,0,0,0.05)] p-6 flex flex-col justify-between overflow-hidden"
          >
            {/* Lined index card decoration */}
            <div className="absolute top-14 inset-x-0 h-px bg-rose-200/50 pointer-events-none" />
            <div className="absolute left-8 top-0 bottom-0 w-px bg-red-200/30 pointer-events-none" />

            {/* Front Header */}
            <div className="z-10 flex items-start justify-between gap-2 pl-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-650 text-[9px] font-bold uppercase tracking-wider rounded">
                    Speech Fluency
                  </span>
                  <span className="text-[9px] text-slate-400 font-light">{cleanDate}</span>
                </div>
                <h4 className="text-base font-extrabold text-slate-900 line-clamp-1">
                  {cleanTopic}
                </h4>
                <p className="text-[10px] text-slate-500 font-light mt-0.5">
                  Speaker: {cleanName}
                </p>
              </div>

              {/* Right Side Header Utilities */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Overall Score Badge */}
                <div className="w-9 h-9 rounded-full border-2 border-indigo-500/20 bg-indigo-500/5 flex items-center justify-center text-xs font-bold text-slate-900 shadow-sm" title="Overall Score">
                  {overallScore}%
                </div>

                {/* Save/Share icons */}
                <button
                  onClick={(e) => handleSaveImage(e, frontCardRef, "speech")}
                  disabled={isSaving}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 transition-all hover:bg-slate-50 shadow-sm cursor-pointer disabled:opacity-50"
                  title="Download Image"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => handleShare(e, frontCardRef)}
                  disabled={isSharing}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 transition-all hover:bg-slate-50 shadow-sm cursor-pointer disabled:opacity-50"
                  title="Share Card"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Front Body (3 stacked metric widgets with white background) */}
            <div className="z-10 space-y-3 pl-4 flex-1 mt-6 flex flex-col justify-center">
              {/* Widget 1: Pace */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/40 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Pace
                  </span>
                  <span className="text-xs font-extrabold text-slate-900">
                    {wpm} WPM
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden relative">
                  {/* Normal target zone (110 - 150 WPM) */}
                  <div className="absolute left-[55%] right-[25%] bg-emerald-500/20 h-full" />
                  {/* Current Pace indicator */}
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (wpm / 200) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[8px] text-slate-400 mt-1 font-medium">
                  <span>Slow</span>
                  <span className="text-emerald-600">Target (110-150)</span>
                  <span>Fast</span>
                </div>
              </div>

              {/* Widget 2: Filler Words */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/40 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Filler Words
                  </span>
                  <span className="text-xs font-extrabold text-slate-900">
                    {fillerWordsCount} words
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {fillerWordsList.length > 0 ? (
                    fillerWordsList.map((word, i) => (
                      <span
                        key={i}
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[9px] font-semibold rounded-md uppercase tracking-wider transition-colors hover:bg-slate-200 cursor-pointer"
                      >
                        {word}
                      </span>
                    ))
                  ) : (
                    <span className="text-[9px] text-slate-450 italic">
                      Zero fillers! Perfect delivery.
                    </span>
                  )}
                </div>
              </div>

              {/* Widget 3: Pauses */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/40 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Pause Duration
                  </span>
                  <span className="text-[8px] text-slate-400 font-light block mt-0.5">
                    Total pauses longer than 1.5s
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-slate-900 block">
                    {pauseDuration}s
                  </span>
                  <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 uppercase tracking-wide inline-block mt-1">
                    Good Stability
                  </span>
                </div>
              </div>
            </div>

            {/* Front Footer */}
            <div className="z-10 flex items-center justify-center gap-1.5 pt-4 border-t border-dashed border-slate-200 pl-4 mt-4 text-slate-450 hover:text-slate-700 transition-colors">
              <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Click Card to View Face Analytics
              </span>
            </div>
          </div>

          {/* ==================== BACK OF CARD (Visual Dynamics) ==================== */}
          <div
            ref={backCardRef}
            className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-3xl bg-[#faf9f6] border border-slate-200/80 shadow-[0_10px_35px_rgba(0,0,0,0.05)] p-6 flex flex-col justify-between overflow-hidden"
          >
            {/* Lined index card decoration */}
            <div className="absolute top-14 inset-x-0 h-px bg-rose-200/50 pointer-events-none" />
            <div className="absolute left-8 top-0 bottom-0 w-px bg-red-200/30 pointer-events-none" />

            {/* Back Header */}
            <div className="z-10 flex items-start justify-between gap-2 pl-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="px-2 py-0.5 bg-sky-50 border border-sky-100 text-sky-650 text-[9px] font-bold uppercase tracking-wider rounded">
                    Visual Dynamics
                  </span>
                  <span className="text-[9px] text-slate-400 font-light">{cleanDate}</span>
                </div>
                <h4 className="text-base font-extrabold text-slate-900 line-clamp-1">
                  {cleanTopic}
                </h4>
                <p className="text-[10px] text-slate-500 font-light mt-0.5">
                  Speaker: {cleanName}
                </p>
              </div>

              {/* Right Side Header Utilities */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-9 h-9 rounded-full border-2 border-sky-500/20 bg-sky-500/5 flex items-center justify-center text-xs font-bold text-slate-900 shadow-sm" title="Engagement Score">
                  {engagementScore}%
                </div>

                <button
                  onClick={(e) => handleSaveImage(e, backCardRef, "visual")}
                  disabled={isSaving}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 transition-all hover:bg-slate-50 shadow-sm cursor-pointer disabled:opacity-50"
                  title="Download Image"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => handleShare(e, backCardRef)}
                  disabled={isSharing}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 transition-all hover:bg-slate-50 shadow-sm cursor-pointer disabled:opacity-50"
                  title="Share Card"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Back Body (3 stacked metric widgets with white background) */}
            <div className="z-10 space-y-3 pl-4 flex-1 mt-6 flex flex-col justify-center">
              {/* Widget 1: Eye Contact */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/40 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-slate-450" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Eye Contact
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-slate-900">
                    {eyeContactScore}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${eyeContactScore}%` }}
                  />
                </div>
                <span className="text-[8px] text-slate-400 block mt-1 font-light">
                  Percentage of time gaze was centered
                </span>
              </div>

              {/* Widget 2: Expressiveness */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/40 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-slate-450" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Expressiveness
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-slate-900">
                    {engagementScore}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${engagementScore}%` }}
                  />
                </div>
                <span className="text-[8px] text-slate-400 block mt-1 font-light">
                  Facial expression variation frequency
                </span>
              </div>

              {/* Widget 3: Primary Emotion */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/40 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smile className="w-4 h-4 text-slate-450" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Primary Emotion
                    </span>
                    <span className="text-[8px] text-slate-400 font-light block mt-0.5">
                      Most persistent visual expression
                    </span>
                  </div>
                </div>
                <div className="px-3.5 py-1.5 bg-sky-50 border border-sky-100 rounded-xl text-sky-700 text-xs font-bold uppercase tracking-wider shrink-0 shadow-sm">
                  {primaryEmotion}
                </div>
              </div>
            </div>

            {/* Back Footer */}
            <div className="z-10 flex items-center justify-center gap-1.5 pt-4 border-t border-dashed border-slate-200 pl-4 mt-4 text-slate-450 hover:text-slate-700 transition-colors">
              <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Click Card to Flip to Delivery
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
