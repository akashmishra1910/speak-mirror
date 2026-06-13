import React from "react";

interface LiveMetricPillsProps {
  eyeContactDotRef: React.RefObject<HTMLDivElement | null>;
  eyeContactTextRef: React.RefObject<HTMLSpanElement | null>;
  expressionTextRef: React.RefObject<HTMLSpanElement | null>;
  wpmTextRef: React.RefObject<HTMLSpanElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function LiveMetricPills({
  eyeContactDotRef,
  eyeContactTextRef,
  expressionTextRef,
  wpmTextRef,
  containerRef,
}: LiveMetricPillsProps) {
  return (
    <div
      ref={containerRef}
      className="absolute top-4 right-4 z-20 flex flex-col gap-2 pointer-events-none select-none font-mono"
      style={{ display: "none" }}
    >
      {/* Eye Contact Pill */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-stage/75 border border-brand-gold/20 shadow-md backdrop-blur-md">
        <div
          ref={eyeContactDotRef}
          className="w-1.5 h-1.5 bg-brand-gold rounded-full transition-colors duration-300"
        />
        <span className="text-[10px] text-white/90">
          EYE · <span ref={eyeContactTextRef}>100%</span>
        </span>
      </div>

      {/* Expression Pill */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-stage/75 border border-brand-gold/20 shadow-md backdrop-blur-md">
        <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
        <span className="text-[10px] text-white/90">
          EXPR · <span ref={expressionTextRef}>50%</span>
        </span>
      </div>

      {/* WPM Pill */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-stage/75 border border-brand-gold/20 shadow-md backdrop-blur-md">
        <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
        <span className="text-[10px] text-white/90">
          <span ref={wpmTextRef}>130 WPM</span>
        </span>
      </div>
    </div>
  );
}
