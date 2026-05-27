"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Caught global page crash:", error);

    // TODO: Initialize Sentry or other third-party error tracking services:
    // if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    //   Sentry.captureException(error, {
    //     extra: { digest: error.digest }
    //   });
    // }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 text-center relative z-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="glass-panel p-8 md:p-12 rounded-[2rem] w-full max-w-lg shadow-2xl relative bg-zinc-950/40 backdrop-blur-xl border border-white/5 float-slow"
      >
        {/* Animated Icon */}
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(245,158,11,0.05)] animate-pulse-slow">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-extrabold text-white mb-3 tracking-tight leading-tight">
          Something went wrong
        </h1>
        <p className="text-foreground/60 font-light text-sm md:text-base mb-6 leading-relaxed">
          We encountered an unexpected crash while rendering this view. The issue has been registered, and our engineering team is investigating.
        </p>

        {/* Error Code / Digest Details */}
        {error.digest && (
          <div className="bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 mb-8 font-mono text-[10px] text-zinc-500 select-all truncate max-w-full text-center">
            CRASH DIGEST: {error.digest}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-zinc-950 hover:bg-zinc-200 transition-all rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(255,255,255,0.08)] cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Try again
          </button>
          
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-white transition-all rounded-xl font-semibold text-sm cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Return Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
