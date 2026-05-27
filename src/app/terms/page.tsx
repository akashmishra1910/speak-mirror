"use client";

import { motion } from "framer-motion";
import { FileText, ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 md:py-24 relative z-10">
      {/* Back to Home */}
      <Link 
        href="/" 
        className="inline-flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white mb-8 transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Page Header */}
        <div className="border-b border-white/10 pb-8 mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.02)]">
              <FileText className="w-5 h-5 text-zinc-300" />
            </div>
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Legal Documentation</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">Terms of Service</h1>
          <p className="text-foreground/40 text-sm font-mono">Last Updated: May 27, 2026</p>
        </div>

        {/* Content Layout */}
        <div className="space-y-10 text-zinc-300 font-light leading-relaxed text-sm md:text-base">
          <p className="text-zinc-400 italic">
            Welcome to SpeakMirror. Please read these Terms of Service ("Terms") carefully before using our website and AI-powered communication coaching services.
          </p>

          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 flex items-center gap-2 font-mono">
              <span className="text-zinc-500 text-sm font-mono">01.</span> Acceptance of Terms
            </h2>
            <p>
              By accessing or using the services provided by SpeakMirror ("we," "our," or "us"), you agree to be bound by these Terms and our Privacy Policy. If you do not agree to all of these Terms, do not access or use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 flex items-center gap-2 font-mono">
              <span className="text-zinc-500 text-sm font-mono">02.</span> Description of Service
            </h2>
            <p>
              SpeakMirror provides an AI-powered communication coaching SaaS. The service allows users to record video/audio speech, practice verbal topics, read structured exercises, and receive instant diagnostic metrics (including confidence, clarity, filler words, and pacing analytics). Services are provided on both a personal sandbox basis and collaborative team workspace basis.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 flex items-center gap-2 font-mono">
              <span className="text-zinc-500 text-sm font-mono">03.</span> Account Registration & Security
            </h2>
            <p className="mb-4">
              To use certain features of SpeakMirror, you must register for an account. You agree to provide accurate, current, and complete information during registration and keep it updated.
            </p>
            <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex gap-4 items-start">
              <ShieldAlert className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong className="text-white block mb-1">Session Security Notice</strong>
                For security and privacy, active sessions are bound to the browser tab lifecycle and automatically expire after 15 minutes of user inactivity. Users are automatically logged out upon tab closure.
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 flex items-center gap-2 font-mono">
              <span className="text-zinc-500 text-sm font-mono">04.</span> Workspaces & Collaboration
            </h2>
            <p>
              Users can join collaborative Team Workspaces using unique Invite Keys. Room creation and task assignments are managed exclusively by Workspace Owners or Mentors. Team owners retain the right to permanently delete rooms or workspace scopes, which cascades to delete all associated submissions, tasks, and data for all members.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 flex items-center gap-2 font-mono">
              <span className="text-zinc-500 text-sm font-mono">05.</span> User Content & AI Diagnostics
            </h2>
            <p>
              By uploading or recording speech data, you grant SpeakMirror a limited, non-exclusive license to process your media files for the sole purpose of generating AI feedback and transcript diagnostics. We do not sell or share your media files with third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 flex items-center gap-2 font-mono">
              <span className="text-zinc-500 text-sm font-mono">06.</span> Prohibited Activities
            </h2>
            <p>
              You agree not to bypass, disable, or interfere with security features, nor attempt to upload malicious payloads. Scraping, indexing, or reverse-engineering our proprietary AI analysis systems is strictly prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 flex items-center gap-2 font-mono">
              <span className="text-zinc-500 text-sm font-mono">07.</span> Disclaimers & Limitation of Liability
            </h2>
            <p>
              Our services and AI feedback are provided "as is" and "as available" without warranty of any kind. SpeakMirror does not guarantee career outcomes or speech improvements and will not be liable for any indirect or consequential damages.
            </p>
          </section>

          <section className="border-t border-white/10 pt-10">
            <h2 className="text-lg font-bold text-white mb-2">Have questions about these terms?</h2>
            <p className="text-zinc-400">
              Reach out to our compliance team at{" "}
              <a href="mailto:support@speakmirror.com" className="text-white underline hover:text-zinc-300 transition-colors">
                support@speakmirror.com
              </a>.
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
