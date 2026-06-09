import { motion } from "framer-motion";
import { BookOpen, Loader2, Sparkles, Clock, ChevronRight } from "lucide-react";

interface PendingAssignmentsProps {
  isPersonal: boolean;
  activeTaskId: string | null;
  isLoadingAssignments: boolean;
  pendingAssignments: any[];
  onClearAssignment: () => void;
  onSelectAssignment: (assignment: any) => void;
}

export function PendingAssignments({
  isPersonal,
  activeTaskId,
  isLoadingAssignments,
  pendingAssignments,
  onClearAssignment,
  onSelectAssignment,
}: PendingAssignmentsProps) {
  if (isPersonal) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="lg:col-span-1 glass-panel p-6 rounded-3xl dark:border-white/10 dark:bg-[#09090d]/90 dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)] shadow-[0_10px_30px_rgba(0,0,0,0.04)] w-full"
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Pending Assignments
        </h3>
        {pendingAssignments.length > 0 && (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border border-indigo-500/20">
            {pendingAssignments.length} Left
          </span>
        )}
      </div>

      {isLoadingAssignments ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400 mb-2" />
          <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Fetching assignments...</span>
        </div>
      ) : pendingAssignments.length === 0 ? (
        <div className="text-center py-10 px-4 border border-dashed border-slate-200 dark:border-white/5 rounded-2xl">
          <Sparkles className="w-8 h-8 text-slate-500 dark:text-zinc-600 mx-auto mb-3 animate-pulse" />
          <h4 className="text-xs font-bold text-themeText dark:text-white mb-1">All Caught Up!</h4>
          <p className="text-[10px] text-slate-500 dark:text-zinc-500 font-light leading-relaxed">
            No pending mentor assignments in this team. You can continue practicing in sandbox mode.
          </p>
          {activeTaskId && (
            <button
              onClick={onClearAssignment}
              className="mt-4 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-white/5 dark:border-white/5 dark:hover:bg-white/10 dark:text-white text-[10px] font-medium transition-all cursor-pointer"
            >
              Enter Sandbox Mode
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Sandbox practice toggle */}
          {activeTaskId && (
            <button
              onClick={onClearAssignment}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-semibold text-slate-555 hover:text-themeText bg-slate-100/50 hover:bg-slate-100 border border-slate-200 dark:bg-white/5 dark:border-white/5 dark:hover:bg-white/10 dark:hover:border-white/10 dark:text-zinc-400 dark:hover:text-white transition-all text-left cursor-pointer"
            >
              <span>Switch to Sandbox Mode</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Pending Assignments List */}
          <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
            {pendingAssignments.map((assignment) => {
              const isActive = activeTaskId === assignment.id;
              return (
                <div
                  key={assignment.id}
                  onClick={() => onSelectAssignment(assignment)}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-indigo-500/5 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.08)]"
                      : "bg-slate-100/30 border-slate-200/50 hover:bg-slate-100/80 hover:border-slate-300 dark:bg-white/[0.01] dark:border-white/5 dark:hover:bg-white/[0.04] dark:hover:border-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-semibold text-indigo-650 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-400/10">
                      {assignment.roomName}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider ${
                      assignment.isUrgent ? "text-rose-550 animate-pulse" : "text-slate-500 dark:text-zinc-500"
                    }`}>
                      <Clock className="w-3.5 h-3.5" />
                      {assignment.deadlineText}
                    </span>
                  </div>
                  <h4 className={`text-xs font-bold leading-snug mb-1 truncate ${isActive ? "text-white dark:text-white" : "text-slate-800 dark:text-zinc-300"}`}>
                    {assignment.topic_of_the_day}
                  </h4>
                  {assignment.word_of_the_day && (
                    <p className="text-[10px] text-slate-500 dark:text-zinc-500 font-light truncate">
                      Word of the day: <strong className="text-slate-700 dark:text-zinc-455">{assignment.word_of_the_day}</strong>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
