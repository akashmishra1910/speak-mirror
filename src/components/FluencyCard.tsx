"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share2, Check, Copy, Sparkles, Loader2 } from "lucide-react";

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" className={className} fill="currentColor">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
);

interface FluencyCardProps {
  metrics: {
    confidence: number;
    clarity: number;
    wpm: number;
    fillerWords: number;
  };
  userName: string;
}

export function FluencyCard({ metrics, userName }: FluencyCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const cleanName = userName || "A Speaker";
  const shareText = `I just hit ${metrics.wpm} WPM with ${metrics.clarity}% Clarity on SpeakMirror! 🚀 Practicing daily to refine my technical speaking fluency.`;

  useEffect(() => {
    const drawCard = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      setIsGenerating(true);

      // Set fixed dimensions for optimal social sharing
      canvas.width = 1200;
      canvas.height = 630;

      // 1. Draw Background
      const bgGrad = ctx.createLinearGradient(0, 0, 1200, 630);
      bgGrad.addColorStop(0, "#050508");
      bgGrad.addColorStop(0.5, "#0b0a14");
      bgGrad.addColorStop(1, "#111022");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1200, 630);

      // 2. Draw Decorative Glowing Nebula Circles
      const drawNebula = (x: number, y: number, r: number, color: string) => {
        const radGrad = ctx.createRadialGradient(x, y, 10, x, y, r);
        radGrad.addColorStop(0, color);
        radGrad.addColorStop(1, "transparent");
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      };
      drawNebula(1000, 150, 400, "rgba(99, 102, 241, 0.12)"); // Purple top-right
      drawNebula(200, 500, 500, "rgba(249, 115, 22, 0.08)");  // Orange bottom-left
      drawNebula(600, 315, 300, "rgba(139, 92, 246, 0.08)");  // Violet center

      // 3. Draw Grid Lines (Tech Theme)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < 1200; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 630);
        ctx.stroke();
      }
      for (let y = 0; y < 630; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1200, y);
        ctx.stroke();
      }

      // 4. Draw Outer Neon Border
      const borderGrad = ctx.createLinearGradient(0, 0, 1200, 630);
      borderGrad.addColorStop(0, "rgba(99, 102, 241, 0.4)");
      borderGrad.addColorStop(0.5, "rgba(139, 92, 246, 0.2)");
      borderGrad.addColorStop(1, "rgba(249, 115, 22, 0.4)");
      ctx.strokeStyle = borderGrad;
      ctx.lineWidth = 16;
      ctx.strokeRect(8, 8, 1184, 614);

      // 5. Draw SpeakMirror Logo and Branding
      // Icon Circle
      ctx.fillStyle = "rgba(99, 102, 241, 0.15)";
      ctx.strokeStyle = "rgba(99, 102, 241, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(80, 80, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Icon Mirror Reflection lines
      ctx.strokeStyle = "#818cf8";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(70, 70);
      ctx.lineTo(90, 90);
      ctx.moveTo(65, 80);
      ctx.lineTo(95, 80);
      ctx.stroke();

      // Logo Text
      ctx.font = "bold 32px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("SpeakMirror", 130, 90);

      // Beta Tag
      ctx.font = "bold 12px sans-serif";
      ctx.fillStyle = "#818cf8";
      ctx.strokeStyle = "rgba(129, 140, 248, 0.3)";
      ctx.lineWidth = 1;
      // Draw capsule around beta
      ctx.beginPath();
      ctx.roundRect(330, 68, 55, 22, 6);
      ctx.stroke();
      ctx.fillText("FLUENCY", 336, 84);

      // 6. Draw Main User Announcement
      ctx.font = "300 24px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.fillText("SPEAKING PERFORMANCE MILESTONE", 80, 190);

      // User Name
      ctx.font = "bold 64px sans-serif";
      // Text Gradient
      const nameGrad = ctx.createLinearGradient(80, 0, 800, 0);
      nameGrad.addColorStop(0, "#ffffff");
      nameGrad.addColorStop(1, "#a5b4fc");
      ctx.fillStyle = nameGrad;
      ctx.fillText(cleanName, 80, 260);

      // Title
      ctx.font = "light 36px sans-serif";
      ctx.fillStyle = "#e0e7ff";
      ctx.fillText("just hit a high-scoring session! 🚀", 80, 315);

      // 7. Draw Metrics Blocks
      const startX = 80;
      const startY = 380;
      const cardWidth = 240;
      const cardHeight = 160;
      const gap = 20;

      const items = [
        { label: "CONFIDENCE", val: `${metrics.confidence}%`, color: "#10b981", bg: "rgba(16, 185, 129, 0.05)" },
        { label: "CLARITY", val: `${metrics.clarity}%`, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.05)" },
        { label: "PACE", val: `${metrics.wpm} WPM`, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.05)" },
        { label: "FILLER WORDS", val: `${metrics.fillerWords}`, color: metrics.fillerWords <= 3 ? "#10b981" : "#ef4444", bg: metrics.fillerWords <= 3 ? "rgba(16, 185, 129, 0.05)" : "rgba(239, 68, 68, 0.05)" },
      ];

      items.forEach((item, idx) => {
        const x = startX + idx * (cardWidth + gap);
        const y = startY;

        // Card Glow Background
        ctx.fillStyle = item.bg;
        ctx.beginPath();
        ctx.roundRect(x, y, cardWidth, cardHeight, 16);
        ctx.fill();

        // Card Border
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Card Neon Left Indicator line
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.roundRect(x + 12, y + 25, 4, 110, 2);
        ctx.fill();

        // Metric Label
        ctx.font = "bold 12px sans-serif";
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.fillText(item.label, x + 30, y + 45);

        // Metric Value
        ctx.font = "bold 44px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(item.val, x + 30, y + 105);
      });

      // Helper to wrap text on canvas and align it baseline-up
      const wrapText = (
        context: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        lineHeight: number
      ) => {
        const words = text.split(" ");
        const lines: string[] = [];
        let currentLine = "";

        for (let n = 0; n < words.length; n++) {
          const testLine = currentLine + words[n] + " ";
          const metrics = context.measureText(testLine);
          const testWidth = metrics.width;
          if (testWidth > maxWidth && n > 0) {
            lines.push(currentLine.trim());
            currentLine = words[n] + " ";
          } else {
            currentLine = testLine;
          }
        }
        lines.push(currentLine.trim());

        const startY = y - (lines.length - 1) * lineHeight;
        lines.forEach((line, idx) => {
          context.fillText(line, x, startY + idx * lineHeight);
        });
      };

      // 8. Draw Branding Footer info
      ctx.font = "300 13px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      wrapText(ctx, "SpeakMirror uses advanced AI speech analysis to score delivery and reduce filler words.", 80, 580, 800, 18);

      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = "#818cf8";
      ctx.fillText("speakmirror.app", 1030, 580);

      // Convert to Data URL
      const dataUrl = canvas.toDataURL("image/png");
      setImgUrl(dataUrl);
      setIsGenerating(false);
    };

    // Ensure fonts are loaded before drawing
    if (document.fonts) {
      document.fonts.ready.then(() => {
        drawCard();
      });
    } else {
      setTimeout(drawCard, 500);
    }
  }, [metrics, cleanName]);

  const handleDownload = () => {
    if (!imgUrl) return;
    const a = document.createElement("a");
    a.href = imgUrl;
    a.download = `speakmirror-fluency-${cleanName.toLowerCase().replace(/\s+/g, "-")}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(shareText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleShareCard = async () => {
    if (!imgUrl) return;
    setIsSharing(true);
    try {
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const file = new File([blob], `speakmirror-fluency-${cleanName.toLowerCase().replace(/\s+/g, "-")}.png`, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "SpeakMirror Fluency Card 🚀",
          text: shareText
        });
      } else {
        // Fallback: download the file and copy text
        handleDownload();
        handleCopyText();
        alert("Direct card sharing is not supported by your browser on this device. We've downloaded your fluency card PNG and copied the share text to your clipboard so you can post it directly!");
      }
    } catch (err) {
      console.error("Share failed:", err);
      // Fallback
      handleDownload();
      handleCopyText();
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="w-full bg-[#faf9f6] border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:bg-[#09090d]/90 dark:border-white/10 dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-6 md:p-8 rounded-3xl mt-8 text-left transition-colors duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-extrabold text-themeText dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            Fluency Share Card
          </h3>
          <p className="text-xs text-slate-550 dark:text-zinc-400 font-light mt-1">
            Showcase your technical speaking metrics to your peers and recruiters.
          </p>
        </div>
        <button
          onClick={handleDownload}
          disabled={isGenerating}
          className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/60 text-slate-800 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:text-white transition-all font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Download className="w-4 h-4" />
          Save Local PNG
        </button>
      </div>

      {/* Canvas - hidden offscreen */}
      <canvas ref={canvasRef} className="hidden" />

      {/* 3D Flashcard Flip Container */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="relative w-full aspect-[1200/630] perspective-1000 cursor-pointer select-none"
      >
        <div
          className={`w-full h-full relative transition-transform duration-700 preserve-3d ${
            isFlipped ? "rotate-y-180" : ""
          }`}
        >
          {/* FRONT FACE (Tactile Lined Index Card) */}
          <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl bg-[#faf9f6] border border-slate-250/80 shadow-[0_12px_30px_rgba(0,0,0,0.04),0_4px_10px_rgba(0,0,0,0.02)] dark:bg-[#121214] dark:border-white/5 dark:shadow-[0_20px_40px_rgba(0,0,0,0.6)] p-6 md:p-10 flex flex-col justify-between overflow-hidden">
            {/* Lined Paper Background Effect */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.04)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:100%_2.5rem] pointer-events-none" />
            
            {/* Index Card Lined Margin Line */}
            <div className="absolute left-12 md:left-16 top-0 bottom-0 w-px bg-red-400/25 dark:bg-red-500/15 pointer-events-none" />

            {/* Content Container */}
            <div className="pl-10 md:pl-16 flex flex-col justify-between h-full z-10">
              {/* Top Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-indigo-500/10 dark:bg-indigo-400/10 flex items-center justify-center">
                    <Sparkles className="w-2.5 h-2.5 text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-450 dark:text-zinc-500">
                    Fluency Diagnostic
                  </span>
                </div>
                <span className="text-[8px] font-mono text-slate-400 dark:text-zinc-650">
                  SM-CARD-{metrics.wpm}
                </span>
              </div>

              {/* Middle Title */}
              <div className="my-auto space-y-2 md:space-y-3">
                <div className="inline-flex px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[9px] font-bold uppercase tracking-wider">
                  Session Verified
                </div>
                <h4 className="text-2xl md:text-4xl font-extrabold text-slate-800 dark:text-white leading-tight">
                  {cleanName}
                </h4>
                <p className="text-[10px] md:text-xs font-light text-slate-500 dark:text-zinc-450 max-w-md leading-relaxed">
                  Successfully completed a spontaneous speaking task with <span className="font-semibold text-slate-755 dark:text-zinc-350">{metrics.clarity}% Clarity</span> and an active pace of <span className="font-semibold text-slate-755 dark:text-zinc-350">{metrics.wpm} WPM</span>.
                </p>
              </div>

              {/* Bottom Row */}
              <div className="flex items-end justify-between pt-3 border-t border-dashed border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider animate-pulse">
                    Click Card to Flip & Reveal Metrics
                  </span>
                </div>
                <div className="w-9 h-9 rounded-full border border-dashed border-slate-300 dark:border-zinc-700 flex items-center justify-center text-[8px] font-bold text-slate-450 dark:text-zinc-600 rotate-12 shrink-0">
                  SM-VERIFIED
                </div>
              </div>
            </div>
          </div>

          {/* BACK FACE (Generated Image) */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-2xl bg-zinc-950 border border-slate-200/80 dark:border-white/5 shadow-[0_15px_35px_rgba(0,0,0,0.05),0_5px_15px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.6)] overflow-hidden flex items-center justify-center">
            {isGenerating || !imgUrl ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Generating Card Graphic...</span>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgUrl}
                alt="SpeakMirror Fluency Card"
                className="w-full h-full object-contain"
              />
            )}
          </div>
        </div>
      </div>

      {/* Share Actions - Premium Quote and Unified Share Button */}
      <div className="mt-6 flex flex-col md:flex-row items-stretch gap-4 border-t border-slate-200/60 dark:border-white/5 pt-6">
        <div className="flex-1 flex items-start justify-between gap-3 bg-slate-100/50 dark:bg-white/[0.02] border border-slate-200/65 dark:border-white/5 p-4 rounded-2xl">
          <p className="text-xs md:text-sm text-slate-700 dark:text-zinc-300 italic leading-relaxed whitespace-pre-wrap">
            "{shareText}"
          </p>
          <button
            onClick={handleCopyText}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200/60 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:text-white transition-all shrink-0 dark:border-white/5 text-slate-550 dark:text-zinc-400 cursor-pointer"
            title="Copy Share Text"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <button
          onClick={handleShareCard}
          disabled={isGenerating || isSharing}
          className="px-6 py-4 rounded-2xl bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 disabled:opacity-50 text-white font-extrabold text-xs md:text-sm transition-all shadow-[0_4px_15px_rgba(14,165,233,0.15)] hover:shadow-[0_4px_20px_rgba(14,165,233,0.25)] active:scale-98 flex items-center justify-center gap-2 md:w-[220px] cursor-pointer"
        >
          {isSharing ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Share2 className="w-4.5 h-4.5" />}
          Share Card Direct
        </button>
      </div>
    </div>
  );
}
