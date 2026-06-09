import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Flame, Sparkles, Bell } from "lucide-react";

interface PromptSelectorProps {
  activeRoomId: string | null;
  activeTaskId: string | null;
  isPersonal: boolean;
  phase: "freeform_recording" | "reading_recording" | "analyzing" | "results";
  streak: number;
  isLoadingStreak: boolean;
  completedWarmupToday: boolean;
  notificationPermission: string;
  onRequestNotificationPermission: () => void;
  onShowChallengeModal: () => void;
  taskTopic?: string;
  activeWorkspaceName: string;
}

export function PromptSelector({
  activeRoomId,
  activeTaskId,
  isPersonal,
  phase,
  streak,
  isLoadingStreak,
  completedWarmupToday,
  notificationPermission,
  onRequestNotificationPermission,
  onShowChallengeModal,
  taskTopic,
  activeWorkspaceName,
}: PromptSelectorProps) {
  if (phase === "results" || phase === "analyzing") return null;

  return (
    <div className="w-full flex flex-col items-center">
      {activeRoomId && (
        <Link
          href={`/rooms/${activeRoomId}`}
          className="absolute top-12 left-4 sm:left-8 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-themeText dark:text-white/60 dark:hover:text-white transition-all z-10 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Room
        </Link>
      )}

      {/* Top Left Controls Row */}
      {isPersonal && (
        <div className="w-full flex justify-start items-center gap-2.5 mb-6 flex-wrap z-20">
          {/* Streak Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-extrabold text-xs shadow-[0_0_15px_rgba(249,115,22,0.05)]">
            <Flame className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
            <span>{isLoadingStreak ? "..." : `${streak} ${streak === 1 ? 'day' : 'days'}`}</span>
          </div>

          {/* Daily Challenge Pill Button */}
          <button
            onClick={onShowChallengeModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:hover:border-white/20 dark:text-white transition-all shadow-sm dark:shadow-[0_0_10px_rgba(255,255,255,0.02)] cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
            <span>Daily Challenge</span>
            {completedWarmupToday ? (
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30">
                Done
              </span>
            ) : activeTaskId?.startsWith("challenge-") ? (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            ) : null}
          </button>

          {/* PWA Reminders Pill Button */}
          {notificationPermission !== "unsupported" && (
            <button
              onClick={notificationPermission !== "granted" ? onRequestNotificationPermission : undefined}
              disabled={notificationPermission === "granted" || notificationPermission === "denied"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-xs font-semibold shadow-[0_0_10px_rgba(0,0,0,0.1)] ${
                notificationPermission === "granted"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : notificationPermission === "denied"
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-400 opacity-60 cursor-not-allowed"
                    : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20"
              }`}
            >
              <Bell className={`w-3.5 h-3.5 ${notificationPermission === "granted" ? "fill-emerald-400/20" : ""}`} />
              <span>
                {notificationPermission === "granted"
                  ? "Reminders Active"
                  : notificationPermission === "denied"
                    ? "Reminders Blocked"
                    : "Enable Reminders"}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Dynamic Header */}
      <motion.div
        key="header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 overflow-hidden float-slow w-full"
      >
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/45 text-black text-xs md:text-sm font-semibold border border-slate-200/50 mb-4 shadow-sm dark:bg-white/5 dark:text-zinc-300 dark:border-white/5 dark:shadow-[0_0_15px_rgba(255,255,255,0.02)]">
          <Sparkles className="w-4 h-4 text-[#5B7C99] dark:text-zinc-400 animate-pulse" />
          {isPersonal ? "Daily Practice Arena" : `Team practice: ${activeWorkspaceName}`}
        </span>
        <h1 className="text-3xl md:text-5xl font-extrabold mb-4 text-black dark:text-white tracking-tight">
          {activeTaskId
            ? (phase === "freeform_recording" ? "Part 1: Speak Freely" : "Part 2: Read Aloud")
            : "Free Speech Sandbox"}
        </h1>
        <p className="text-slate-650 dark:text-foreground/60 max-w-xl mx-auto font-light leading-relaxed text-sm md:text-base">
          {activeTaskId
            ? (phase === "freeform_recording"
                ? "Speak naturally about the assignment topic for 90 seconds. We will analyze your pacing, clarity, and metrics."
                : "Now, read the provided text using the teleprompter. We will analyze your pronunciation and articulation.")
            : "Record speech on any topic you like. You'll receive full instant diagnostics, transcripts, and AI suggestions."}
        </p>
      </motion.div>
    </div>
  );
}
