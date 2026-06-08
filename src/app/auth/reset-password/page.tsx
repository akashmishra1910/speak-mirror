"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Loader2, KeyRound, Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const router = useRouter();

  // Verify that the user has a valid recovery session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Invalid or expired session. Please request a new password reset link.");
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccessMsg("Password updated successfully! Redirecting...");
      setTimeout(() => {
        router.push("/auth?message=" + encodeURIComponent("Password reset successfully! Please sign in with your new password."));
      }, 1500);
    } catch (err: any) {
      setError(err.message || "An error occurred while updating your password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-24 w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-8 rounded-[2rem] dark:border-white/5 float-slow shadow-2xl relative dark:bg-zinc-950/40 backdrop-blur-xl"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:bg-white/5 dark:border-white/10 dark:text-zinc-300 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(255,255,255,0.02)]">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold mb-2 text-themeText dark:text-white">New Password</h1>
          <p className="text-slate-650 dark:text-foreground/60 font-light">
            Enter and confirm your new secure password below.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm mb-6 text-center">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 p-4 rounded-xl text-sm mb-6 text-center">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 ml-1 text-slate-650 dark:text-zinc-300">New Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-foreground/40" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                tabIndex={1}
                placeholder="••••••••"
                className="w-full bg-white/80 border border-slate-200/60 rounded-xl pl-11 pr-11 py-3 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800 placeholder-zinc-400 dark:placeholder-zinc-500 font-light text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] dark:bg-white/5 dark:border-white/5 dark:focus:border-white/20 dark:focus:bg-white/10 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-foreground/40 dark:hover:text-white/60 focus:outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 ml-1 text-slate-650 dark:text-zinc-300">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-foreground/40" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                tabIndex={2}
                placeholder="••••••••"
                className="w-full bg-white/80 border border-slate-200/60 rounded-xl pl-11 pr-11 py-3 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800 placeholder-zinc-400 dark:placeholder-zinc-500 font-light text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] dark:bg-white/5 dark:border-white/5 dark:focus:border-white/20 dark:focus:bg-white/10 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-foreground/40 dark:hover:text-white/60 focus:outline-none cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            tabIndex={3}
            className="w-full bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white font-semibold py-3.5 rounded-xl mt-6 transition-all flex items-center justify-center shadow-[0_4px_15px_rgba(14,165,233,0.15)] hover:shadow-[0_4px_20px_rgba(14,165,233,0.25)] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
