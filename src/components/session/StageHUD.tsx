import React from "react";

interface StageHUDProps {
  fillerContainerRef: React.RefObject<HTMLDivElement | null>;
  fillerTextRef: React.RefObject<HTMLSpanElement | null>;
  pacingContainerRef: React.RefObject<HTMLDivElement | null>;
  pacingFillRef: React.RefObject<HTMLDivElement | null>;
  pacingTextRef: React.RefObject<HTMLSpanElement | null>;
}

export function StageHUD({
  fillerContainerRef,
  fillerTextRef,
  pacingContainerRef,
  pacingFillRef,
  pacingTextRef,
}: StageHUDProps) {
  return (
    <div className="w-full flex flex-col gap-2 select-none font-mono">
      {/* Bar 1: Filler Words */}
      <div
        ref={fillerContainerRef}
        className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-brand-stage/70 border border-brand-gold/12 backdrop-blur-md shadow-md"
        style={{ display: "none" }}
      >
        <span className="text-[10px] text-white/35 font-bold tracking-wider">// FILLERS</span>
        <span ref={fillerTextRef} className="text-xs font-bold text-brand-gold">
          0 (um)
        </span>
      </div>

      {/* Bar 2: Pacing Progress */}
      <div
        ref={pacingContainerRef}
        className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-brand-stage/70 border border-brand-gold/12 backdrop-blur-md shadow-md gap-4"
        style={{ display: "none" }}
      >
        <span className="text-[10px] text-white/35 font-bold tracking-wider">// PACING</span>
        
        {/* Thin progress track */}
        <div className="flex-1 h-1 bg-white/8 rounded-full overflow-hidden relative">
          <div
            ref={pacingFillRef}
            className="h-full bg-brand-gold rounded-full transition-all duration-300 ease-out"
            style={{ width: "43.75%" }} // Initial fallback width representing 130 WPM
          />
        </div>

        <span ref={pacingTextRef} className="text-xs font-bold text-brand-gold whitespace-nowrap">
          GOOD
        </span>
      </div>
    </div>
  );
}
