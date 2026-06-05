"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, X } from "lucide-react";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const consent = localStorage.getItem("speak_mirror_cookie_consent");
      if (!consent) {
        setIsVisible(true);
      }
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("speak_mirror_cookie_consent", "accepted");
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem("speak_mirror_cookie_consent", "declined");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md glass-panel dark:border-white/10 dark:bg-[#09090d]/95 dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] shadow-[0_20px_50px_rgba(0,0,0,0.06)] p-5 rounded-2xl z-[100] flex flex-col gap-4 float-slow interactive-card"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-650 dark:bg-white/5 dark:border-white/10 dark:text-zinc-300 flex items-center justify-center shadow-[0_0_10px_rgba(255,255,255,0.01)]">
                <Info className="w-4 h-4 animate-pulse" />
              </div>
              <h4 className="font-bold text-sm text-themeText dark:text-white font-mono">Cookie Consent</h4>
            </div>
            <button 
              onClick={() => setIsVisible(false)}
              className="p-1 text-slate-500 hover:text-themeText bg-slate-100 hover:bg-slate-200 dark:text-zinc-400 dark:hover:text-white dark:bg-white/5 dark:hover:bg-white/10 rounded-md transition-colors cursor-pointer"
              title="Close Banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-650 dark:text-foreground/70 leading-relaxed font-light">
            We use cookies to analyze performance, save context switcher preferences, secure inactive sessions, and improve our AI coaching diagnostics. By clicking "Accept", you agree to our processing policies. Read our <a href="/privacy" className="text-indigo-600 dark:text-white hover:underline font-medium">Privacy Policy</a> to learn more.
          </p>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button 
              onClick={handleDecline}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-themeText bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:border-white/5 dark:hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            >
              Decline
            </button>
            <button 
              onClick={handleAccept}
              className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 rounded-xl transition-all cursor-pointer shadow-[0_4px_10px_rgba(14,165,233,0.15)] hover:shadow-[0_4px_15px_rgba(14,165,233,0.25)] active:scale-95"
            >
              Accept
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
