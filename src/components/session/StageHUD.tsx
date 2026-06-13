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
    <div className="flex flex-col gap-2 select-none font-mono">
      {/* Bar 1: Filler Words */}
      <div
        ref={fillerContainerRef}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-stage/75 border border-brand-gold/20 shadow-md backdrop-blur-md"
        style={{ display: "none" }}
      >
        <span className="text-[9px] text-white/50 font-bold uppercase tracking-wider">// FILLERS</span>
        <div className="w-px h-2.5 bg-white/20" />
        <span ref={fillerTextRef} className="text-[9px] font-bold text-brand-gold whitespace-nowrap">
          0
        </span>
      </div>

      {/* Bar 2: Pacing Progress */}
      <div
        ref={pacingContainerRef}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-stage/75 border border-brand-gold/20 shadow-md backdrop-blur-md min-w-[140px]"
        style={{ display: "none" }}
      >
        <span className="text-[9px] text-white/50 font-bold uppercase tracking-wider">// PACING</span>
        <div className="w-px h-2.5 bg-white/20" />
        
        {/* Thin progress track */}
        <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden relative shrink-0">
          <div
            ref={pacingFillRef}
            className="h-full bg-brand-gold rounded-full transition-all duration-300 ease-out"
            style={{ width: "43.75%" }}
          />
        </div>

        <span ref={pacingTextRef} className="text-[9px] font-bold text-brand-gold whitespace-nowrap">
          GOOD
        </span>
      </div>
    </div>
  );
}
