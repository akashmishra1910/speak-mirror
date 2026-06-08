"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Loader2, KeyRound, Eye, EyeOff } from "lucide-react";

export default function AuthPage() {
  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgotPassword">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const emailInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { user } = useAuth();

  // Focus email input on mount
  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (user) {
      router.push("/");
    }

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const msg = params.get("message");
      if (msg) {
        setSuccessMsg(msg);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [user, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setTermsError(null);

    try {
      if (authMode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        if (data?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("onboarding_completed")
            .eq("id", data.user.id)
            .maybeSingle();

          if (!profile || !profile.onboarding_completed) {
            router.push("/onboarding");
          } else {
            router.push("/");
          }
        } else {
          router.push("/");
        }
      } else if (authMode === "signup") {
        if (!agreedToTerms) {
          setTermsError("Please agree to the Terms of Service to continue");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: name
            }
          }
        });
        if (error) throw error;
        
        if (data?.user && !data?.session) {
          setSuccessMsg("Success! Please check your email inbox to verify your account.");
          setAuthMode("login");
          setPassword(""); // Clear password field
        } else {
          router.push("/onboarding");
        }
      } else if (authMode === "forgotPassword") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        if (error) throw error;
        setSuccessMsg("Reset link sent! Check your inbox.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.");
      if (authMode === "login") {
        setPassword(""); // Clear password on failure
      }
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = loading || googleLoading || (authMode === "signup" && !agreedToTerms);

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
          <h1 className="text-3xl font-extrabold mb-2 text-themeText dark:text-white">
            {authMode === "login" ? "Welcome Back" : authMode === "signup" ? "Create Account" : "Reset Password"}
          </h1>
          <p className="text-slate-650 dark:text-foreground/60 font-light">
            {authMode === "login" 
              ? "Sign in to access your private recordings." 
              : authMode === "signup" 
                ? "Sign up to track your progress and join team rooms."
                : "Enter your email to receive a password reset link."}
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

        <form onSubmit={handleAuth} className="space-y-4">
          {authMode === "signup" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
              <label className="block text-sm font-medium mb-1.5 ml-1 text-slate-650 dark:text-zinc-300">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={authMode === "signup"}
                tabIndex={1}
                placeholder="John Doe"
                className="w-full bg-white/80 border border-slate-200/60 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800 placeholder-zinc-400 dark:placeholder-zinc-500 font-light text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] dark:bg-white/5 dark:border-white/5 dark:focus:border-white/20 dark:focus:bg-white/10 dark:text-white"
              />
            </motion.div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5 ml-1 text-slate-650 dark:text-zinc-300">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-foreground/40" />
              <input
                ref={emailInputRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                tabIndex={2}
                placeholder="you@example.com"
                className="w-full bg-white/80 border border-slate-200/60 rounded-xl px-11 py-3 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800 placeholder-zinc-400 dark:placeholder-zinc-500 font-light text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] dark:bg-white/5 dark:border-white/5 dark:focus:border-white/20 dark:focus:bg-white/10 dark:text-white"
              />
            </div>
          </div>

          {authMode !== "forgotPassword" && (
            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label className="block text-sm font-medium text-slate-650 dark:text-zinc-300">Password</label>
                {authMode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("forgotPassword");
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs text-indigo-600 dark:text-zinc-450 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-foreground/40" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  tabIndex={3}
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
          )}

          {authMode === "signup" && (
            <div className="space-y-2">
              <div className="flex items-start gap-2 mt-2">
                <input
                  type="checkbox"
                  id="tos"
                  checked={agreedToTerms}
                  onChange={(e) => {
                    setAgreedToTerms(e.target.checked);
                    if (e.target.checked) setTermsError(null);
                  }}
                  className="mt-1 rounded border-slate-350 dark:border-white/10 text-indigo-650 focus:ring-indigo-500"
                />
                <label htmlFor="tos" className="text-xs text-slate-650 dark:text-foreground/60 font-light leading-tight">
                  I agree to the{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-650 dark:text-white font-semibold hover:underline"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-650 dark:text-white font-semibold hover:underline"
                  >
                    Privacy Policy
                  </a>
                </label>
              </div>
              {termsError && (
                <div className="text-red-500 text-xs ml-1 font-medium">
                  {termsError}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitDisabled}
            tabIndex={4}
            className="w-full bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white font-semibold py-3.5 rounded-xl mt-4 transition-all flex items-center justify-center shadow-[0_4px_15px_rgba(14,165,233,0.15)] hover:shadow-[0_4px_20px_rgba(14,165,233,0.25)] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (authMode === "login" ? "Sign In" : authMode === "signup" ? "Sign Up" : "Send Reset Link")}
          </button>
        </form>

        <div className="my-6 flex items-center justify-center">
          <div className="h-px bg-slate-200 dark:bg-white/5 flex-1"></div>
          <span className="px-4 text-xs text-zinc-500 font-medium uppercase tracking-wider">Or</span>
          <div className="h-px bg-slate-200 dark:bg-white/5 flex-1"></div>
        </div>

        <button
          onClick={async () => {
            setGoogleLoading(true);
            setError(null);
            const { error } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: `${window.location.origin}/auth/callback?next=/`
              }
            });
            if (error) {
              setError(error.message);
              setGoogleLoading(false);
            }
          }}
          disabled={googleLoading || loading}
          className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(255,255,255,0.02)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {googleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          Continue with Google
        </button>

        <div className="mt-8 text-center text-sm text-slate-650 dark:text-foreground/60 font-light">
          {authMode === "forgotPassword" ? (
            <button
              onClick={() => {
                setAuthMode("login");
                setError(null);
                setSuccessMsg(null);
              }}
              className="text-indigo-650 dark:text-white font-semibold hover:underline transition-colors cursor-pointer"
            >
              Back to Sign In
            </button>
          ) : (
            <>
              {authMode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => {
                  setAuthMode(authMode === "login" ? "signup" : "login");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-indigo-650 dark:text-white font-semibold hover:underline transition-colors cursor-pointer"
              >
                {authMode === "login" ? "Sign Up" : "Sign In"}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
