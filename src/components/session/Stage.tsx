"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Video, HelpCircle, Lightbulb, Sparkles, Loader2 } from "lucide-react";
import { TimerPill } from "./TimerPill";
import { LiveMetricPills } from "./LiveMetricPills";
import { StopButton } from "./StopButton";
import { StageHUD } from "./StageHUD";
import { CountdownOverlay } from "./CountdownOverlay";
import { BEAUTIFY_FILTERS } from "@/lib/filters";

interface StageProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  storageCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  
  // HUD/Pills Refs
  timerContainerRef: React.RefObject<HTMLDivElement | null>;
  timerTextRef: React.RefObject<HTMLSpanElement | null>;
  eyeContactDotRef: React.RefObject<HTMLDivElement | null>;
  eyeContactTextRef: React.RefObject<HTMLSpanElement | null>;
  expressionTextRef: React.RefObject<HTMLSpanElement | null>;
  wpmTextRef: React.RefObject<HTMLSpanElement | null>;
  metricsContainerRef: React.RefObject<HTMLDivElement | null>;
  
  // Warnings/Coaches Refs
  gazeWarningRef: React.RefObject<HTMLDivElement | null>;
  coachNudgeContainerRef: React.RefObject<HTMLDivElement | null>;
  coachNudgeTextRef: React.RefObject<HTMLSpanElement | null>;
  concludePromptRef: React.RefObject<HTMLDivElement | null>;
  
  // HUD bottom Refs
  fillerContainerRef: React.RefObject<HTMLDivElement | null>;
  fillerTextRef: React.RefObject<HTMLSpanElement | null>;
  pacingContainerRef: React.RefObject<HTMLDivElement | null>;
  pacingFillRef: React.RefObject<HTMLDivElement | null>;
  pacingTextRef: React.RefObject<HTMLSpanElement | null>;

  // Values
  activeFilter: string;
  isRecording: boolean;
  isProcessing: boolean;
  cameraLoaded: boolean;
  setCameraLoaded: (val: boolean) => void;
  isAssistEnabled: boolean;
  setIsAssistEnabled: (val: boolean) => void;
  mode: "freeform" | "reading" | "warmup";
  readingText?: string | null;
  bullets: { label: string; text: string }[];
  
  // Actions
  onStartRecording: () => void;
  onStopRecording: () => void;
  
  // Countdown
  showCountdown: boolean;
  setShowCountdown: (val: boolean) => void;
  onCountdownComplete: () => void;
}

export function Stage({
  videoRef,
  canvasRef,
  storageCanvasRef,
  timerContainerRef,
  timerTextRef,
  eyeContactDotRef,
  eyeContactTextRef,
  expressionTextRef,
  wpmTextRef,
  metricsContainerRef,
  gazeWarningRef,
  coachNudgeContainerRef,
  coachNudgeTextRef,
  concludePromptRef,
  fillerContainerRef,
  fillerTextRef,
  pacingContainerRef,
  pacingFillRef,
  pacingTextRef,
  activeFilter,
  isRecording,
  isProcessing,
  cameraLoaded,
  setCameraLoaded,
  isAssistEnabled,
  setIsAssistEnabled,
  mode,
  readingText,
  bullets,
  onStartRecording,
  onStopRecording,
  showCountdown,
  setShowCountdown,
  onCountdownComplete,
}: StageProps) {
  return (
    <div className="flex-1 min-h-[460px] bg-brand-stage rounded-3xl border border-brand-gold/12 flex flex-col items-center justify-between p-4 relative overflow-hidden select-none">
      
      {/* 3-2-1 Countdown Overlay */}
      {showCountdown && (
        <CountdownOverlay onComplete={onCountdownComplete} />
      )}

      {/* Hidden zero-copy compositing canvases */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "1px",
          height: "1px",
          overflow: "hidden",
          opacity: 0.01,
          pointerEvents: "none",
          zIndex: -1,
        }}
      >
        <canvas ref={canvasRef} />
        <canvas ref={storageCanvasRef} width={640} height={360} />
      </div>

      {/* Live Video Feed Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover z-0 rounded-3xl border border-brand-gold/15"
        style={{
          transform: "scaleX(-1) translateZ(0)",
          willChange: "transform",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          filter: BEAUTIFY_FILTERS[activeFilter] || BEAUTIFY_FILTERS.none,
          opacity: cameraLoaded ? 1 : 0,
          transition: "opacity 1s ease-out",
        }}
        onPlay={() => setCameraLoaded(true)}
        onLoadedMetadata={() => setCameraLoaded(true)}
      />

      {/* Subtle Overlay Gradient for Readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/75 z-10 pointer-events-none rounded-3xl" />

      {/* Top Overlay Section: Timer, Assist Button, and Metrics */}
      <div className="w-full flex justify-between items-start z-20 relative pointer-events-none">
        
        {/* Timer Pill */}
        <TimerPill containerRef={timerContainerRef} textRef={timerTextRef} />

        {/* Right Controls: Teleprompter / Assist trigger */}
        <div className="flex items-center gap-2 pointer-events-auto ml-auto">
          <button
            onClick={() => setIsAssistEnabled(!isAssistEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border backdrop-blur-md transition-all text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none ${
              isAssistEnabled
                ? "bg-white text-brand-navy border-white/20 shadow-md font-semibold"
                : "bg-black/40 border-white/10 text-white/70 hover:bg-black/60 hover:text-white"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>{mode === "reading" ? "Teleprompter" : "Assist"}</span>
          </button>
        </div>

        {/* Live Metric Telemetry Pills (Right overlays) */}
        <LiveMetricPills
          eyeContactDotRef={eyeContactDotRef}
          eyeContactTextRef={eyeContactTextRef}
          expressionTextRef={expressionTextRef}
          wpmTextRef={wpmTextRef}
          containerRef={metricsContainerRef}
        />
      </div>

      {/* Center Alerts & Interactive Cards */}
      <div className="w-full max-w-sm flex-1 flex flex-col items-center justify-center z-20 relative gap-3 select-none pointer-events-none">
        
        {/* Debounced Look at Camera Warning */}
        <div
          ref={gazeWarningRef}
          className="bg-[#dc2626]/90 border border-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-center shadow-lg flex items-center justify-center gap-2 transition-all duration-200"
          style={{ display: "none" }}
        >
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          <span className="text-[10px] font-bold text-white uppercase tracking-widest font-mono">
            Position your face in frame
          </span>
        </div>

        {/* Real-time Coach Nudges */}
        <div
          ref={coachNudgeContainerRef}
          className="bg-brand-navy/90 border border-brand-gold/30 backdrop-blur-md px-4 py-2.5 rounded-xl text-center shadow-lg flex items-center justify-center gap-2"
          style={{ display: "none" }}
        >
          <Sparkles className="w-4 h-4 text-brand-gold animate-pulse shrink-0" />
          <span ref={coachNudgeTextRef} className="text-[10px] font-bold text-[#f1f0ee] tracking-wider font-mono">
            Nudge
          </span>
        </div>

        {/* Conclude Speech Warning Card */}
        <div
          ref={concludePromptRef}
          className="bg-brand-navy/90 border border-brand-gold/30 backdrop-blur-md px-5 py-3.5 rounded-2xl text-center shadow-2xl flex flex-col items-center gap-1.5 max-w-[260px]"
          style={{ display: "none" }}
        >
          <span className="text-brand-gold font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
            Conclude Speech
          </span>
          <p className="text-[11px] text-white/80 font-light leading-relaxed">
            Wrap up your final thoughts! Time limit approaching.
          </p>
        </div>

        {/* Assist / Teleprompter Floating Overlay card */}
        <AnimatePresence>
          {isAssistEnabled && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="pointer-events-auto absolute inset-x-4 top-12 bottom-16 bg-brand-stage/85 border border-brand-gold/20 backdrop-blur-xl p-4 md:p-5 rounded-2xl shadow-2xl overflow-y-auto flex flex-col justify-start"
            >
              {mode === "reading" ? (
                <>
                  <h3 className="text-brand-gold font-bold mb-3 flex items-center gap-2 text-xs uppercase tracking-wider">
                    <Lightbulb className="w-4 h-4 stroke-[1.5]" />
                    Read Aloud
                  </h3>
                  <p className="text-white/90 text-[13px] leading-relaxed font-light text-left font-sans">
                    {readingText}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-brand-gold font-bold mb-3 flex items-center gap-2 text-xs uppercase tracking-wider">
                    <Lightbulb className="w-4 h-4 stroke-[1.5]" />
                    Guide (4W + 1H)
                  </h3>
                  <ul className="space-y-3">
                    {bullets.map((b, i) => (
                      <li key={i} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 text-left">
                        <span className="text-brand-gold/60 font-bold text-[10px] uppercase tracking-wider sm:w-10 sm:mt-0.5 shrink-0">
                          {b.label}
                        </span>
                        <span className="text-white/90 text-xs italic">"{b.text}"</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Controls & HUD Area */}
      <div className="w-full flex flex-col items-center gap-4 z-20 relative">
        
        {/* Record/Stop Button Controls */}
        <div className="pointer-events-auto select-none">
          {!isProcessing && (
            isRecording ? (
              <StopButton onClick={onStopRecording} isRecording={isRecording} />
            ) : (
              <motion.button
                onClick={() => setShowCountdown(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-[52px] h-[52px] rounded-full bg-brand-navy border-[3px] border-brand-gold/30 hover:border-brand-gold text-brand-gold flex items-center justify-center shadow-lg transition-colors duration-300 cursor-pointer"
              >
                <Mic className="w-5 h-5 stroke-[1.5]" />
              </motion.button>
            )
          )}
        </div>

        {/* Stage Bottom telemetry pacing & fillers HUD */}
        <StageHUD
          fillerContainerRef={fillerContainerRef}
          fillerTextRef={fillerTextRef}
          pacingContainerRef={pacingContainerRef}
          pacingFillRef={pacingFillRef}
          pacingTextRef={pacingTextRef}
        />
      </div>

      {/* Processing Analysis Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 z-40 bg-brand-stage/85 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-lg">
            <Loader2 className="w-6 h-6 text-brand-gold animate-spin" />
          </div>
          <span className="mt-4 text-[10px] font-semibold text-brand-gold tracking-widest uppercase font-mono">
            Analyzing session...
          </span>
        </div>
      )}
    </div>
  );
}
