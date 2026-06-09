import { Loader2 } from "lucide-react";

interface AnalysisLoaderProps {
  phase: "freeform_recording" | "reading_recording" | "analyzing" | "results";
}

export function AnalysisLoader({ phase }: AnalysisLoaderProps) {
  if (phase !== "analyzing") return null;

  return (
    <div className="flex flex-col items-center justify-center p-24 w-full glass-panel rounded-3xl dark:border-white/5">
      <Loader2 className="w-12 h-12 animate-spin text-themeText dark:text-white mb-6" />
      <span className="text-lg font-bold text-themeText dark:text-white">Analyzing your speeches...</span>
      <span className="text-sm text-foreground/40 mt-2 font-light">This usually takes about 10 seconds.</span>
    </div>
  );
}
