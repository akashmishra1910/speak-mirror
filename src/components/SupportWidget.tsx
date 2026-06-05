"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { submitSupportRequest } from "@/actions/support";

export function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("bug");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside the widget
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      await submitSupportRequest({
        email: email.trim(),
        category,
        message: message.trim(),
      });
      setIsSuccess(true);
      setEmail("");
      setMessage("");
      setTimeout(() => {
        setIsSuccess(false);
        setIsOpen(false);
      }, 2500);
    } catch (err) {
      console.error("Failed to submit support request:", err);
      alert("Failed to send support request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40" ref={containerRef}>
      {/* Popover Form */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="absolute bottom-18 right-0 w-80 md:w-96 glass-panel dark:border-white/10 dark:bg-[#09090d]/95 dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] shadow-[0_20px_50px_rgba(0,0,0,0.06)] p-5 rounded-2xl flex flex-col gap-4 overflow-hidden mb-2"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-bold text-sm text-themeText dark:text-white">Support & Feedback</h4>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-500 hover:text-themeText bg-slate-100 hover:bg-slate-200 dark:text-zinc-400 dark:hover:text-white dark:bg-white/5 dark:hover:bg-white/10 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {isSuccess ? (
                /* Success View */
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center justify-center py-8 text-center"
                >
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 dark:text-emerald-400 mb-3 animate-pulse" />
                  <h5 className="font-bold text-themeText dark:text-white text-sm mb-1">Message Sent!</h5>
                  <p className="text-slate-600 dark:text-zinc-400 text-xs font-light px-4 leading-relaxed">
                    Thank you for your feedback. Our support team will review your report and respond if necessary.
                  </p>
                </motion.div>
              ) : (
                /* Form View */
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  className="space-y-4 text-left"
                >
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5">
                      Your Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-white/80 border border-slate-200/60 rounded-xl px-3.5 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800 placeholder-zinc-400 dark:placeholder-zinc-650 font-light text-xs dark:bg-white/5 dark:border-white/5 dark:focus:border-white/20 dark:focus:bg-white/10 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-white border border-slate-200/60 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 transition-all text-slate-800 font-light text-xs cursor-pointer dark:bg-[#050508] dark:border-white/5 dark:focus:border-white/20 dark:focus:bg-white/5 dark:text-white shadow-sm dark:shadow-none"
                    >
                      <option value="bug" className="bg-white text-slate-800 dark:bg-[#050508] dark:text-white">Bug Report</option>
                      <option value="feature" className="bg-white text-slate-800 dark:bg-[#050508] dark:text-white">Feature Request</option>
                      <option value="account" className="bg-white text-slate-800 dark:bg-[#050508] dark:text-white">Account Issue</option>
                      <option value="other" className="bg-white text-slate-800 dark:bg-[#050508] dark:text-white">General Inquiry / Feedback</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5">
                      Message
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe the issue or share your ideas..."
                      className="w-full bg-white/80 border border-slate-200/60 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800 placeholder-zinc-400 dark:placeholder-zinc-650 font-light text-xs resize-none leading-relaxed dark:bg-white/5 dark:border-white/5 dark:focus:border-white/20 dark:focus:bg-white/10 dark:text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !email.trim() || !message.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white font-bold text-xs transition-all shadow-[0_4px_15px_rgba(14,165,233,0.15)] hover:shadow-[0_4px_20px_rgba(14,165,233,0.25)] active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3" />
                        <span>Submit Request</span>
                      </>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white flex items-center justify-center shadow-[0_4px_20px_rgba(14,165,233,0.25)] hover:shadow-[0_4px_25px_rgba(14,165,233,0.35)] border border-sky-400/20 transition-all cursor-pointer z-50 relative shrink-0"
        aria-label="Open support and feedback widget"
      >
        <MessageSquare className="w-5 h-5 md:w-6 md:h-6 fill-current" />
      </motion.button>
    </div>
  );
}
