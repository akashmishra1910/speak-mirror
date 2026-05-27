"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Info, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PrivacyPage() {
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
              <ShieldCheck className="w-5 h-5 text-zinc-300" />
            </div>
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Privacy Compliance</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">Privacy Policy</h1>
          <p className="text-foreground/40 text-sm font-mono">Last Updated: May 27, 2026</p>
        </div>

        {/* Content Layout */}
        <div className="space-y-10 text-zinc-300 font-light leading-relaxed text-sm md:text-base">
          <p className="text-zinc-400 italic">
            At SpeakMirror, we prioritize your data privacy. This policy explains what information we collect, how we process it using artificial intelligence, and how we protect it.
          </p>

          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 flex items-center gap-2 font-mono">
              <span className="text-zinc-500 text-sm font-mono">01.</span> Information We Collect
            </h2>
            <p className="mb-3">
              To deliver our AI-powered communication diagnostics, we collect:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-zinc-400">
              <li><strong>Profile Information</strong>: Your name, email address, and authentication metadata.</li>
              <li><strong>Media Recordings</strong>: Audio and video speech clips recorded via your webcam/mic.</li>
              <li><strong>Speech Metrics</strong>: Pacing (WPM), filler word occurrence, clarity scores, and transcripts.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 flex items-center gap-2 font-mono">
              <span className="text-zinc-500 text-sm font-mono">02.</span> How We Process Your Speech
            </h2>
            <p>
              When you complete a practice exercise, our server-side integration forwards the audio payload to our processing nodes (and secure LLM partners like Groq) to transcribe and grade your delivery. Your recordings are stored securely in encrypted object storage (Supabase Bucket) and are accessible only to you and authorized members of your specific Team Workspaces.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 flex items-center gap-2 font-mono">
              <span className="text-zinc-500 text-sm font-mono">03.</span> Session Isolation & Cookie Security
            </h2>
            <p className="mb-4">
              We employ strict session parameters to protect unauthorized access on public or shared terminals:
            </p>
            <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex gap-4 items-start">
              <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <ul className="list-disc list-inside space-y-1 text-zinc-300">
                  <li><strong>sessionStorage</strong>: Authentic session tokens are stored locally inside `sessionStorage` (cleared immediately when you close the tab).</li>
                  <li><strong>Session Cookies</strong>: Browser cookies (`sb-access-token`) do not contain persistent `max-age` markers and are purged when the browser process terminates.</li>
                  <li><strong>Inactivity Logout</strong>: Active states automatically expire and log out if a user remains inactive for more than 15 minutes.</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 flex items-center gap-2 font-mono">
              <span className="text-zinc-500 text-sm font-mono">04.</span> Data Retention & Deletion
            </h2>
            <p>
              You have complete control over your content. You can delete individual practice submissions at any time. When a workspace room is deleted by its creator, all member submissions linked to that room are permanently purged from our database and storage buckets. If you choose to delete your account, all personal history is cleared immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 flex items-center gap-2 font-mono">
              <span className="text-zinc-500 text-sm font-mono">05.</span> Third-Party Subprocessors
            </h2>
            <p>
              We partner with trusted cloud providers and analytics platforms to operate:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-zinc-400">
              <li><strong>Supabase</strong>: Database hosting, user authentication, and media storage.</li>
              <li><strong>Vercel</strong>: Web application hosting and routing middleware.</li>
              <li><strong>Groq / OpenAI</strong>: Inference engines for speech diagnostics and guidance.</li>
            </ul>
          </section>

          <section className="border-t border-white/10 pt-10">
            <h2 className="text-lg font-bold text-white mb-2">Exercising Your GDPR / Privacy Rights?</h2>
            <p className="text-zinc-400">
              Please email our data protection officer at{" "}
              <a href="mailto:privacy@speakmirror.com" className="text-white underline hover:text-zinc-300 transition-colors">
                privacy@speakmirror.com
              </a>.
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
