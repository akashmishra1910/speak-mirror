import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { FeedbackDashboard, AnalysisMetrics } from "@/components/FeedbackDashboard";
import { FluencyCard } from "@/components/FluencyCard";
import { User } from "@/types";

interface AnalysisResultsProps {
  phase: "freeform_recording" | "reading_recording" | "analyzing" | "results";
  metricsList: AnalysisMetrics[];
  videoUrls: string[];
  onSave: () => void;
  isSaving: boolean;
  isSaved: boolean;
  onRetake: () => void;
  activeRoomId: string | null;
  user: User | null;
}

export function AnalysisResults({
  phase,
  metricsList,
  videoUrls,
  onSave,
  isSaving,
  isSaved,
  onRetake,
  activeRoomId,
  user,
}: AnalysisResultsProps) {
  if (phase !== "results") return null;

  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      {metricsList.map((m, idx) => (
        <div key={idx} className="mb-12 border-b border-white/5 pb-8 last:border-0">
          <h3 className="text-2xl font-bold mb-6 text-zinc-300">{m.title}</h3>
          <FeedbackDashboard
            metrics={m}
            videoUrl={videoUrls[idx]}
            onSave={onSave}
            isSaving={isSaving}
            isSaved={isSaved}
            onRetake={onRetake}
          />
          <FluencyCard
            userName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || "A Speaker"}
            confidenceScore={m.confidence}
            clarityScore={m.clarity}
            paceWpm={m.wpm}
            fillerWordsCount={m.fillerWords}
          />
        </div>
      ))}

      <div className="mt-8 text-center flex flex-col items-center gap-4">
        {isSaved && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
            <Sparkles className="w-4 h-4 animate-pulse" />
            Progress Saved
          </div>
        )}

        <Link
          href={activeRoomId ? `/rooms/${activeRoomId}` : "/profile"}
          className="px-8 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:text-white transition-all font-semibold shadow-sm dark:shadow-[0_0_15px_rgba(255,255,255,0.02)] cursor-pointer"
        >
          {activeRoomId ? "Return to Room" : "View Profile"}
        </Link>
      </div>
    </motion.div>
  );
}
