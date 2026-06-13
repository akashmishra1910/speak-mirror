import React from "react";
import { motion } from "framer-motion";
import { Square } from "lucide-react";

interface StopButtonProps {
  onClick: () => void;
  isRecording: boolean;
}

export function StopButton({ onClick, isRecording }: StopButtonProps) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Pulsing Gold Ring */}
      {isRecording && (
        <motion.div
          className="absolute inset-[-4px] rounded-full border-[3px] border-brand-gold/40 pointer-events-none"
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.6, 0, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
      
      {/* Main Stop Button */}
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-[52px] h-[52px] rounded-full bg-[#dc2626] border-[3px] border-brand-gold/30 hover:border-brand-gold text-white flex items-center justify-center shadow-lg transition-colors duration-300 relative z-10 cursor-pointer"
      >
        <Square className="w-4 h-4 fill-current text-white stroke-none" />
      </motion.button>
    </div>
  );
}
