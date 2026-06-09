"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface CountdownOverlayProps {
  onComplete: () => void;
}

export function CountdownOverlay({ onComplete }: CountdownOverlayProps) {
  const [count, setCount] = useState<number>(3);

  useEffect(() => {
    if (count === 0) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setCount(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, onComplete]);

  return (
    <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-[2px] flex items-center justify-center select-none pointer-events-none">
      <AnimatePresence mode="wait">
        {count > 0 && (
          <motion.div
            key={count}
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1.4 }}
            exit={{ opacity: 0, scale: 2.0 }}
            transition={{ duration: 0.85, ease: "easeOut" }}
            className="text-8xl md:text-9xl font-black text-white font-mono tracking-tighter"
          >
            {count}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
