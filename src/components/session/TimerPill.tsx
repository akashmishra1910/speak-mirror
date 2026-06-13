import React from "react";

interface TimerPillProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  textRef: React.RefObject<HTMLSpanElement | null>;
}

export function TimerPill({ containerRef, textRef }: TimerPillProps) {
  return (
    <div
      ref={containerRef}
      className="bg-[#dc2626]/85 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg select-none font-mono"
      style={{ display: "none" }}
    >
      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
      <span ref={textRef} className="text-white font-medium tracking-wider text-xs">
        0:00
      </span>
    </div>
  );
}
