import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { Challenge } from "@/lib/challenges";

interface ChallengeModalProps {
  showChallengeModal: boolean;
  onClose: () => void;
  completedWarmupToday: boolean;
  activeTaskId: string | null;
  selectedChallenge: Challenge | null;
  onClearAssignment: () => void;
  onShuffleChallenge: () => void;
  onStartChallenge: () => void;
}

export function ChallengeModal({
  showChallengeModal,
  onClose,
  completedWarmupToday,
  activeTaskId,
  selectedChallenge,
  onClearAssignment,
  onShuffleChallenge,
  onStartChallenge,
}: ChallengeModalProps) {
  return (
    <AnimatePresence>
      {showChallengeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#09090d]/80 backdrop-blur-sm"
          />
          
          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-md glass-panel p-6 rounded-3xl dark:border-white/10 dark:bg-[#09090d]/95 dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] shadow-[0_20px_50px_rgba(0,0,0,0.06)] text-left overflow-hidden z-55"
          >
            {/* Top Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200/50 text-slate-500 hover:text-slate-800 dark:bg-white/5 dark:border-white/5 dark:hover:bg-white/10 dark:text-zinc-400 dark:hover:text-white transition-all z-10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="w-5 h-5 text-orange-400 animate-pulse" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-themeText dark:text-zinc-300">
                Daily Warm-up Challenge
              </h3>
            </div>

            {completedWarmupToday ? (
              <div className="space-y-4">
                <div className="p-6 text-center border border-emerald-500/20 bg-emerald-500/5 rounded-2xl">
                  <Sparkles className="w-10 h-10 text-emerald-400 mx-auto mb-3 animate-bounce" />
                  <h4 className="text-base font-extrabold text-themeText dark:text-white mb-1.5">Streak Safe! 🔥</h4>
                  <p className="text-xs text-slate-650 dark:text-zinc-400 font-light leading-relaxed">
                    You've completed today's warm-up challenge. Keep up the consistency to improve your speaking fluency!
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white font-bold text-xs transition-all shadow-[0_4px_12px_rgba(2,132,199,0.15)] cursor-pointer"
                >
                  Awesome, thanks!
                </button>
              </div>
            ) : activeTaskId?.startsWith("challenge-") ? (
              <div className="space-y-4">
                <div className="p-4 border border-indigo-500/20 bg-indigo-500/5 rounded-2xl">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-400/5 px-2 py-0.5 rounded-md border border-indigo-400/10 uppercase">
                      Active Challenge
                    </span>
                  </div>
                  <h4 className="text-sm font-bold leading-snug text-themeText dark:text-white mb-2">
                    {selectedChallenge?.prompt}
                  </h4>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-[11px] mb-4 text-left leading-relaxed text-slate-700 dark:text-zinc-300">
                    <span className="font-bold text-indigo-650 dark:text-indigo-400">Word of the Day:</span>{" "}
                    <strong className="text-slate-800 dark:text-white">{selectedChallenge?.word_of_the_day}</strong>
                    <p className="text-slate-500 dark:text-zinc-400 font-light mt-0.5 text-[10px]">
                      {selectedChallenge?.definition}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        onClearAssignment();
                        onClose();
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-xs font-semibold text-rose-500 dark:text-rose-455 transition-all cursor-pointer"
                    >
                      Exit Challenge
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 transition-all font-bold text-xs cursor-pointer"
                    >
                      Close View
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-all">
                  <div className="flex justify-between items-start gap-2 mb-2.5">
                    <span className="text-[10px] font-semibold text-slate-655 bg-slate-105 px-2 py-0.5 rounded-md border border-slate-200 uppercase dark:text-zinc-400 dark:bg-white/5 dark:border-white/10">
                      Today's Prompt
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500">
                      {selectedChallenge?.suggestedDuration}s limit
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-themeText dark:text-white leading-relaxed mb-3">
                    {selectedChallenge?.prompt}
                  </h4>
                  <div className="p-3 rounded-xl bg-slate-105/50 border border-slate-200 text-[11px] mb-4 text-left leading-relaxed text-slate-750 dark:bg-white/5 dark:border-white/5 dark:text-zinc-300 dark:border-transparent">
                    <span className="font-bold text-indigo-650 dark:text-indigo-400">Word of the Day:</span>{" "}
                    <strong className="text-slate-800 dark:text-white">{selectedChallenge?.word_of_the_day}</strong>
                    <p className="text-slate-500 dark:text-zinc-400 font-light mt-0.5 text-[10px]">
                      {selectedChallenge?.definition}
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={onShuffleChallenge}
                      className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-750 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:text-white transition-all font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Shuffle
                    </button>
                    <button
                      onClick={onStartChallenge}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white font-bold text-xs transition-all shadow-[0_4px_12px_rgba(2,132,199,0.15)] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      Start Warm-up
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-white/5 text-center">
                  <Sparkles className="w-5 h-5 text-zinc-500 mx-auto mb-2 animate-pulse" />
                  <h5 className="text-[11px] font-bold text-themeText dark:text-white mb-1">Consistency pays off!</h5>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-500 font-light leading-relaxed">
                    Explaining a random topic for 30s daily is a proven way to eliminate pacing issues and filter out filler words.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
