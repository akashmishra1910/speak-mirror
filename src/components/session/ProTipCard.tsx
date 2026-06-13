import React from "react";
import { Lightbulb } from "lucide-react";

interface ProTipCardProps {
  text: string;
}

export function ProTipCard({ text }: ProTipCardProps) {
  return (
    <div className="flex gap-2.5 p-3.5 bg-brand-gold/6 dark:bg-brand-gold/8 border-l-2 border-brand-gold rounded-r-lg text-left select-none">
      <Lightbulb className="w-4 h-4 text-brand-gold stroke-[1.5] shrink-0 mt-0.5" />
      <p className="text-[12px] leading-relaxed text-[#6b6357] dark:text-white/50 font-normal">
        {text}
      </p>
    </div>
  );
}
