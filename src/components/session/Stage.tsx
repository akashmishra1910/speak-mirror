"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Video, HelpCircle, Lightbulb, Sparkles, Loader2, Flame } from "lucide-react";
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

  isPersonal?: boolean;
  streak?: number;
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
  isPersonal,
  streak,
}: StageProps) {
  return (
    <div className="flex-1 min-h-[450px] h-auto bg-brand-stage rounded-3xl border border-brand-gold/12 flex flex-col justify-between p-3.5 relative overflow-hidden select-none">
      
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

      {/* 1. Header Row (Mounts Speech Mode and Streak above recording screen without overlapping) */}
      <div className="w-full flex items-center justify-between pb-2 border-b border-brand-gold/12 relative z-20 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-white uppercase tracking-wider bg-brand-gold/10 px-2 py-0.5 rounded border border-brand-gold/25 font-mono">
            {mode === "warmup" ? "Warm-up" : mode === "reading" ? "Reading Aloud" : "Freeform Speech"}
          </span>
          {isPersonal && streak !== undefined && (
            <div className="flex items-center gap-1 bg-brand-gold/10 border border-brand-gold/20 px-1.5 py-0.5 rounded text-brand-gold text-[9px] font-bold font-mono">
              <Flame className="w-2.5 h-2.5 fill-brand-gold text-brand-gold" />
              <span>{streak}d</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Right Controls: Teleprompter / Assist trigger */}
          <button
            onClick={() => setIsAssistEnabled(!isAssistEnabled)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border backdrop-blur-md transition-all text-[9px] font-bold uppercase tracking-wider cursor-pointer select-none ${
              isAssistEnabled
                ? "bg-white text-brand-navy border-white/20 shadow-md font-semibold"
                : "bg-black/40 border-white/10 text-white/70 hover:bg-black/60 hover:text-white"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>{mode === "reading" ? "Prompter" : "Assist"}</span>
          </button>
        </div>
      </div>

      {/* 2. Bounded Video Card Feed */}
      <div className="flex-1 w-full relative rounded-2xl overflow-hidden bg-black border border-brand-gold/10 flex items-center justify-center z-10 my-2 shadow-inner">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover z-0"
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/60 z-10 pointer-events-none" />

        {/* Live Metric Telemetry Pills (overlaying only the video box corner!) */}
        <LiveMetricPills
          eyeContactDotRef={eyeContactDotRef}
          eyeContactTextRef={eyeContactTextRef}
          expressionTextRef={expressionTextRef}
          wpmTextRef={wpmTextRef}
          containerRef={metricsContainerRef}
        />

        {/* Recording Timer Pill (absolute top-center overlay) */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
          <TimerPill containerRef={timerContainerRef} textRef={timerTextRef} />
        </div>

        {/* Speech Telemetry Pills (absolute bottom-left overlay) */}
        <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
          <StageHUD
            fillerContainerRef={fillerContainerRef}
            fillerTextRef={fillerTextRef}
            pacingContainerRef={pacingContainerRef}
            pacingFillRef={pacingFillRef}
            pacingTextRef={pacingTextRef}
          />
        </div>

        {/* Center Warnings & Interactive Cards inside video card */}
        <div className="w-full max-w-sm absolute inset-0 z-20 flex flex-col items-center justify-center p-3 gap-3 pointer-events-none">
          {/* Debounced Look at Camera Warning */}
          <div
            ref={gazeWarningRef}
            className="bg-[#dc2626]/90 border border-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg text-center shadow-lg flex items-center justify-center gap-1.5 transition-all duration-200"
            style={{ display: "none" }}
          >
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
            <span className="text-[9px] font-bold text-white uppercase tracking-widest font-mono">
              Position your face in frame
            </span>
          </div>

          {/* Real-time Coach Nudges */}
          <div
            ref={coachNudgeContainerRef}
            className="bg-brand-navy/90 border border-brand-gold/30 backdrop-blur-md px-3 py-1.5 rounded-lg text-center shadow-lg flex items-center justify-center gap-1.5"
            style={{ display: "none" }}
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-gold animate-pulse shrink-0" />
            <span ref={coachNudgeTextRef} className="text-[9px] font-bold text-[#f1f0ee] tracking-wider font-mono">
              Nudge
            </span>
          </div>

          {/* Conclude Speech Warning Card */}
          <div
            ref={concludePromptRef}
            className="bg-brand-navy/90 border border-brand-gold/30 backdrop-blur-md px-4 py-2 rounded-xl text-center shadow-2xl flex flex-col items-center gap-1 max-w-[200px]"
            style={{ display: "none" }}
          >
            <span className="text-brand-gold font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
              Conclude Speech
            </span>
            <p className="text-[9px] text-white/80 font-light leading-normal">
              Wrap up your thoughts! Time limit approaching.
            </p>
          </div>

          {/* Assist / Teleprompter Floating Overlay card inside video container */}
          <AnimatePresence>
            {isAssistEnabled && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="pointer-events-auto absolute inset-3 bg-brand-stage/90 border border-brand-gold/20 backdrop-blur-xl p-3 rounded-xl shadow-2xl overflow-y-auto flex flex-col justify-start"
              >
                {mode === "reading" ? (
                  <>
                    <h3 className="text-brand-gold font-bold mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                      <Lightbulb className="w-3.5 h-3.5 stroke-[1.5]" />
                      Read Aloud
                    </h3>
                    <p className="text-white/90 text-xs leading-relaxed font-light text-left font-sans">
                      {readingText}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-brand-gold font-bold mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                      <Lightbulb className="w-3.5 h-3.5 stroke-[1.5]" />
                      Guide (4W + 1H)
                    </h3>
                    <ul className="space-y-2">
                      {bullets.map((b, i) => (
                        <li key={i} className="flex flex-col sm:flex-row sm:items-start gap-0.5 text-left">
                          <span className="text-brand-gold/60 font-bold text-[9px] uppercase tracking-wider sm:w-10 shrink-0">
                            {b.label}
                          </span>
                          <span className="text-white/95 text-xs italic">"{b.text}"</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 3. Bottom Controls Area (Symmetrically Centered) */}
      <div className="w-full flex items-center justify-center z-20 relative shrink-0 pt-1">
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
                className="w-11 h-11 rounded-full bg-brand-navy border-2 border-brand-gold/30 hover:border-brand-gold text-brand-gold flex items-center justify-center shadow-lg transition-colors duration-300 cursor-pointer"
              >
                <Mic className="w-4 h-4 stroke-[1.5]" />
              </motion.button>
            )
          )}
        </div>
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
