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

      // Helper to wrap text on canvas
      const wrapText = (
        context: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        lineHeight: number
      ) => {
        const words = text.split(" ");
        let line = "";
        let currentY = y;

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + " ";
          const metrics = context.measureText(testLine);
          const testWidth = metrics.width;
          if (testWidth > maxWidth && n > 0) {
            context.fillText(line, x, currentY);
            line = words[n] + " ";
            currentY += lineHeight;
          } else {
            line = testLine;
          }
        }
        context.fillText(line, x, currentY);
      };

      // 8. Draw Branding Footer info
      ctx.font = "light 16px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      wrapText(ctx, "SpeakMirror uses advanced AI speech analysis to score delivery and reduce filler words.", 80, 570, 800, 22);

      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = "#818cf8";
      ctx.fillText("speakmirror.app", 1030, 575);

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
    <div className="w-full glass-panel p-6 md:p-8 rounded-3xl border border-white/10 bg-[#09090d]/90 backdrop-blur-3xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] mt-8 text-left">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            Fluency Share Card
          </h3>
          <p className="text-xs text-zinc-400 font-light mt-1">
            Showcase your technical speaking metrics to your peers and recruiters.
          </p>
        </div>
        <button
          onClick={handleDownload}
          disabled={isGenerating}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all font-bold text-xs flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Save Local PNG
        </button>
      </div>

      {/* Canvas - hidden offscreen */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Image Preview Container */}
      <div className="relative w-full aspect-[1200/630] rounded-2xl overflow-hidden border border-white/5 bg-zinc-950 flex items-center justify-center">
        {isGenerating || !imgUrl ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Generating Card Graphic...</span>
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

      {/* Share Actions - Premium Quote and Unified Share Button */}
      <div className="mt-6 flex flex-col md:flex-row items-stretch gap-4 border-t border-white/5 pt-6">
        <div className="flex-1 flex items-start justify-between gap-3 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
          <p className="text-xs md:text-sm text-zinc-300 italic leading-relaxed whitespace-pre-wrap">
            "{shareText}"
          </p>
          <button
            onClick={handleCopyText}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white transition-all shrink-0 border border-white/5 text-zinc-400"
            title="Copy Share Text"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <button
          onClick={handleShareCard}
          disabled={isGenerating || isSharing}
          className="px-6 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs md:text-sm transition-all shadow-[0_0_20px_rgba(99,102,241,0.25)] flex items-center justify-center gap-2 md:w-[220px]"
        >
          {isSharing ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Share2 className="w-4.5 h-4.5" />}
          Share Card Direct
        </button>
      </div>
    </div>
  );
}
