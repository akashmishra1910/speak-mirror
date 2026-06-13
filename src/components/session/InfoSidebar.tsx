"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Shuffle, Sparkles, Settings as SettingsIcon } from "lucide-react";
import { ProTipCard } from "./ProTipCard";
import { FocusPill } from "./FocusPill";
import { PracticeAssignment } from "@/types";

interface InfoSidebarProps {
  mode: "freeform" | "reading" | "warmup";
  topic: string;
  bullets: { label: string; text: string }[];
  wordOfTheDay?: string | null;
  wordDefinition?: string | null;
  tips?: string[] | null;
  focusMetric: string | null;
  isRecording: boolean;
  isLoadingTopic: boolean;
  onShuffleTopic?: () => void;
  onGenerateAITopic?: () => void;
  customSuggestedTopics?: string[];
  onSelectSuggestedTopic?: (topic: string) => void;
  
  // Settings
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  bellTiming: number;
  setBellTiming: (time: number) => void;
  timeLimit: number;
  userId?: string | null;

  // Workspace configuration (for when not recording)
  isPersonal: boolean;
  activeTaskId: string | null;
  pendingAssignments: PracticeAssignment[];
  selectedChallenge: any;
  completedWarmupToday: boolean;
  onStartChallenge: () => void;
  onShuffleChallenge: () => void;
  onSelectAssignment: (assignment: PracticeAssignment) => void;
  onClearAssignment: () => void;
  onShowChallengeModal: () => void;
}

export function InfoSidebar({
  mode,
  topic,
  bullets,
  wordOfTheDay,
  wordDefinition,
  tips,
  focusMetric,
  isRecording,
  isLoadingTopic,
  onShuffleTopic,
  onGenerateAITopic,
  customSuggestedTopics = [],
  onSelectSuggestedTopic,
  
  activeFilter,
  setActiveFilter,
  bellTiming,
  setBellTiming,
  timeLimit,
  userId,

  isPersonal,
  activeTaskId,
  pendingAssignments,
  selectedChallenge,
  completedWarmupToday,
  onStartChallenge,
  onShuffleChallenge,
  onSelectAssignment,
  onClearAssignment,
  onShowChallengeModal,
}: InfoSidebarProps) {
  // Collapsible sections
  const [isKeyPointsExpanded, setIsKeyPointsExpanded] = useState(true);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);

  // Beautify filters list
  const filterOptions = [
    { value: "none", label: "Original" },
    { value: "studio", label: "Studio Glow ✨" },
    { value: "warm", label: "Warm Golden ☀️" },
    { value: "cool", label: "Nordic Cool ❄️" },
    { value: "smooth", label: "Soft Focus 🌸" },
  ];

  return (
    <aside className="w-full lg:w-[280px] shrink-0 flex flex-col gap-6 text-left p-4 lg:p-6 bg-[#faf8f4]/60 dark:bg-[#0a0e1a]/65 backdrop-blur-xl border-t lg:border-t-0 lg:border-l border-[#e8e2d8]/55 dark:border-brand-gold/10 transition-colors duration-300">
      
      {/* Configuration Section (Only shown when not recording) */}
      {!isRecording && (
        <div className="flex flex-col gap-5 border-b border-[#e8e2d8] dark:border-brand-gold/10 pb-5">
          {/* Mode Selector */}
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-brand-gold">
              STUDIO MODE
            </span>
            <div className="relative flex p-1 bg-[#f0eae1]/50 dark:bg-[#0d1117]/40 backdrop-blur-md rounded-full border border-[#e8e2d8]/60 dark:border-white/5 w-full">
              <div
                className="absolute top-1 bottom-1 rounded-full bg-white dark:bg-zinc-700 shadow-sm transition-all duration-300 ease-out"
                style={{
                  left: !activeTaskId ? "4px" : "calc(50% + 2px)",
                  width: "calc(50% - 6px)",
                }}
              />
              <button
                onClick={onClearAssignment}
                className={`relative z-10 w-1/2 py-1.5 text-[10px] font-bold text-center rounded-full transition-colors cursor-pointer uppercase tracking-wider ${
                  !activeTaskId
                    ? "text-brand-navy dark:text-white"
                    : "text-brand-navy/60 dark:text-white/60"
                }`}
              >
                Freeform
              </button>
              <button
                onClick={() => {
                  if (isPersonal) {
                    onStartChallenge();
                  } else if (pendingAssignments.length > 0) {
                    onSelectAssignment(pendingAssignments[0]);
                  } else {
                    onShowChallengeModal();
                  }
                }}
                className={`relative z-10 w-1/2 py-1.5 text-[10px] font-bold text-center rounded-full transition-colors cursor-pointer uppercase tracking-wider ${
                  activeTaskId
                    ? "text-brand-navy dark:text-white"
                    : "text-brand-navy/60 dark:text-white/60"
                }`}
              >
                Prompt
              </button>
            </div>
          </div>

          {/* Dynamic Configuration badges */}
          {!activeTaskId ? (
            /* Topic Suggestions in Freeform mode */
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-brand-gold">
                  SUGGESTIONS
                </span>
                {onGenerateAITopic && (
                  <button
                    onClick={onGenerateAITopic}
                    disabled={isLoadingTopic}
                    className="text-[9px] font-bold text-brand-navy dark:text-brand-gold hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50 uppercase tracking-wider shrink-0"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    AI Topic
                  </button>
                )}
              </div>
              
              <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                {customSuggestedTopics.map((item, idx) => {
                  const isSelected = topic === item;
                  return (
                    <button
                      key={idx}
                      onClick={() => onSelectSuggestedTopic && onSelectSuggestedTopic(item)}
                      className={`text-[10px] px-2.5 py-1.5 rounded-lg border text-left transition-all duration-150 transform hover:-translate-y-0.5 cursor-pointer line-clamp-1 ${
                        isSelected
                          ? "bg-brand-navy text-white border-brand-navy font-medium"
                          : "bg-white/40 border-[#e8e2d8] dark:bg-white/5 dark:border-brand-gold/12 text-brand-navy/70 dark:text-[#f1f0ee]/70 hover:border-brand-gold"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Prompt details (Assignments / Daily challenge) */
            <div className="flex flex-col gap-3">
              <span className="text-[9px] font-bold uppercase tracking-wider text-brand-gold">
                ACTIVE PROMPT
              </span>
              {isPersonal ? (
                /* Daily challenge */
                selectedChallenge && (
                  <div
                    onClick={onStartChallenge}
                    className={`p-3 rounded-xl border text-[11px] cursor-pointer hover:border-brand-gold transition-colors backdrop-blur-sm ${
                      activeTaskId === `challenge-${selectedChallenge.id}`
                        ? "bg-brand-navy/10 border-brand-gold dark:bg-brand-navy/30"
                        : "bg-white/40 border-[#e8e2d8]/60 dark:bg-white/5 dark:border-brand-gold/12 hover:bg-white/60 dark:hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[8px] font-bold text-brand-gold bg-brand-gold/10 px-1.5 py-0.5 rounded border border-brand-gold/20">
                        DAILY CHALLENGE
                      </span>
                    </div>
                    <p className="font-semibold text-brand-navy dark:text-white leading-snug line-clamp-2">
                      {selectedChallenge.prompt}
                    </p>
                  </div>
                )
              ) : (
                /* Team pending assignments */
                pendingAssignments.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {pendingAssignments.slice(0, 2).map((a) => (
                      <div
                        key={a.id}
                        onClick={() => onSelectAssignment(a)}
                        className={`p-3 rounded-xl border text-[11px] cursor-pointer hover:border-brand-gold transition-colors backdrop-blur-sm ${
                          activeTaskId === a.id
                            ? "bg-brand-navy/10 border-brand-gold dark:bg-brand-navy/30"
                            : "bg-white/40 border-[#e8e2d8]/60 dark:bg-white/5 dark:border-brand-gold/12 hover:bg-white/60 dark:hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[8px] font-bold text-brand-gold">{a.roomName}</span>
                          <span className={`text-[8px] px-1 rounded-full ${a.isUrgent ? 'bg-red-500/10 text-red-500' : 'bg-brand-gold/10 text-brand-gold'}`}>
                            {a.deadlineText}
                          </span>
                        </div>
                        <p className="font-semibold text-brand-navy dark:text-white line-clamp-1">
                          {a.topic_of_the_day}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Section 1: Topic & Focus */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-wider text-brand-gold">
            YOUR TOPIC
          </span>
          {mode === "freeform" && !activeTaskId && !isRecording && onShuffleTopic && (
            <button
              onClick={onShuffleTopic}
              disabled={isLoadingTopic}
              className="p-1 rounded-md border border-[#e8e2d8] dark:border-brand-gold/12 hover:border-brand-gold text-brand-navy/60 dark:text-white/60 hover:text-brand-navy dark:hover:text-white transition-colors cursor-pointer"
            >
              <Shuffle className="w-3 h-3 stroke-[1.5]" />
            </button>
          )}
        </div>
        <p className="text-[13px] font-medium leading-relaxed text-brand-navy dark:text-[#f1f0ee]">
          {topic}
        </p>
        <FocusPill focusMetric={focusMetric} />
      </div>

      {/* Section 2: Key Points (collapsible on mobile) */}
      {bullets.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-[#e8e2d8]/50 dark:border-brand-gold/5 pt-4">
          <button
            onClick={() => setIsKeyPointsExpanded(!isKeyPointsExpanded)}
            className="flex items-center justify-between w-full lg:cursor-default"
          >
            <span className="text-[9px] font-bold uppercase tracking-wider text-brand-gold">
              KEY POINTS
            </span>
            <div className="lg:hidden">
              {isKeyPointsExpanded ? (
                <ChevronUp className="w-3 h-3 text-brand-gold" />
              ) : (
                <ChevronDown className="w-3 h-3 text-brand-gold" />
              )}
            </div>
          </button>
          
          <AnimatePresence initial={false}>
            {isKeyPointsExpanded && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-3 overflow-hidden"
              >
                {bullets.map((b, i) => (
                  <li key={i} className="flex gap-2.5 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-gold shrink-0 mt-1.5" />
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] font-bold text-brand-navy/40 dark:text-white/30 uppercase font-mono tracking-wider">
                        {b.label}
                      </span>
                      <span className="text-[12px] leading-relaxed text-[#6b6357] dark:text-white/50 font-normal">
                        {b.text}
                      </span>
                    </div>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Section 3: Pro Tip */}
      <div className="flex flex-col gap-2 border-t border-[#e8e2d8]/50 dark:border-brand-gold/5 pt-4">
        <span className="text-[9px] font-bold uppercase tracking-wider text-brand-gold">
          PRO TIP
        </span>
        <ProTipCard
          text={
            mode === "reading"
              ? "Use the Teleprompter button on the camera view to reveal the exact text you need to read aloud. The AI will grade your pronunciation!"
              : "Use the Assist button on the camera view to reveal the 4W+1H guiding framework if you get stuck!"
          }
        />
      </div>

      {/* Section 4: Word of the Day (Only warmup tasks) */}
      {mode === "warmup" && wordOfTheDay && (
        <div className="flex flex-col gap-1.5 border-t border-[#e8e2d8]/50 dark:border-brand-gold/5 pt-4">
          <span className="text-[9px] font-bold uppercase tracking-wider text-brand-gold">
            WORD OF THE DAY
          </span>
          <p className="text-[14px] font-semibold text-brand-navy dark:text-white">
            {wordOfTheDay}
          </p>
          {wordDefinition && (
            <p className="text-[11px] leading-normal text-[#6b6357] dark:text-white/50 italic font-light">
              {wordDefinition}
            </p>
          )}
        </div>
      )}

      {/* Section 5: Settings (collapsible on mobile, pinned to bottom on desktop) */}
      <div className="flex flex-col gap-2 border-t border-[#e8e2d8]/50 dark:border-brand-gold/5 pt-4 lg:mt-auto">
        <button
          onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
          className="flex items-center justify-between w-full lg:cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <SettingsIcon className="w-3.5 h-3.5 text-brand-gold stroke-[1.5]" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-brand-gold">
              SETTINGS
            </span>
          </div>
          <div>
            {isSettingsExpanded ? (
              <ChevronUp className="w-3 h-3 text-brand-gold" />
            ) : (
              <ChevronDown className="w-3 h-3 text-brand-gold" />
            )}
          </div>
        </button>

        <AnimatePresence initial={false}>
          {isSettingsExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-col gap-3 overflow-hidden pt-2 font-mono text-[10px]"
            >
              {/* Row 1: Beautify Filter */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-[#6b6357] dark:text-white/45">// BEAUTIFY:</span>
                  <select
                    value={activeFilter}
                    onChange={(e) => setActiveFilter(e.target.value)}
                    disabled={isRecording}
                    className="p-1 rounded bg-white dark:bg-brand-stage border border-[#e8e2d8] dark:border-brand-gold/12 text-brand-navy dark:text-[#f1f0ee] text-[10px] font-bold tracking-tight focus:outline-none focus:ring-1 focus:ring-brand-gold cursor-pointer"
                  >
                    {filterOptions.map((o) => (
                      <option key={o.value} value={o.value} className="bg-white dark:bg-brand-stage text-brand-navy dark:text-white">
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Alarm Bell timing */}
              {userId && (
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[#6b6357] dark:text-white/45">// BELL_ALERT:</span>
                    <span className="text-brand-gold font-bold">{bellTiming}s</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max={timeLimit - 5}
                    value={bellTiming}
                    onChange={(e) => setBellTiming(parseInt(e.target.value))}
                    disabled={isRecording}
                    className="w-full h-1 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-gold mt-1"
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
