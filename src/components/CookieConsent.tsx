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
          className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md bg-[#09090d]/95 backdrop-blur-3xl border border-white/10 p-5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] flex flex-col gap-4 float-slow interactive-card"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_0_10px_rgba(255,255,255,0.01)]">
                <Info className="w-4 h-4 text-zinc-300 animate-pulse" />
              </div>
              <h4 className="font-bold text-sm text-white font-mono">Cookie Consent</h4>
            </div>
            <button 
              onClick={() => setIsVisible(false)}
              className="p-1 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-md transition-colors cursor-pointer"
              title="Close Banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-foreground/70 leading-relaxed font-light">
            We use cookies to analyze performance, save context switcher preferences, secure inactive sessions, and improve our AI coaching diagnostics. By clicking "Accept", you agree to our processing policies. Read our <a href="/privacy" className="text-white hover:underline">Privacy Policy</a> to learn more.
          </p>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button 
              onClick={handleDecline}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            >
              Decline
            </button>
            <button 
              onClick={handleAccept}
              className="px-4 py-2 text-xs font-bold text-zinc-950 bg-white hover:bg-zinc-200 rounded-xl transition-all cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            >
              Accept
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
