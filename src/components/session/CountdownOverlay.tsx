import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CountdownOverlayProps {
  onComplete: () => void;
}

export function CountdownOverlay({ onComplete }: CountdownOverlayProps) {
  const [count, setCount] = useState<number | string>(3);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (count === 3) {
      timer = setTimeout(() => setCount(2), 700);
    } else if (count === 2) {
      timer = setTimeout(() => setCount(1), 700);
    } else if (count === 1) {
      timer = setTimeout(() => setCount("Go"), 700);
    } else if (count === "Go") {
      timer = setTimeout(() => {
        onComplete();
      }, 700);
    }

    return () => clearTimeout(timer);
  }, [count, onComplete]);

  return (
    <div className="absolute inset-0 z-50 bg-[#0d1117]/88 flex items-center justify-center pointer-events-auto select-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 1.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-brand-gold text-[72px] font-medium tracking-wide uppercase font-sans"
        >
          {count}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
