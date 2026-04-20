"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Loader2, KeyRound } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      router.push("/profile");
    }
  }, [user, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/profile");
      } else {
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
          setIsLogin(true);
        } else {
          router.push("/profile");
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-24 w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-8 rounded-3xl"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-8 h-8 text-brand-500" />
          </div>
          <h1 className="text-3xl font-bold mb-2">{isLogin ? "Welcome Back" : "Create Account"}</h1>
          <p className="text-foreground/70">
            {isLogin ? "Sign in to access your private recordings." : "Sign up to track your progress and join team rooms."}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm mb-6 text-center">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl text-sm mb-6 text-center">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
              <label className="block text-sm font-medium mb-1.5 ml-1 text-foreground/80">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
                placeholder="John Doe"
                className="w-full bg-surface/50 border border-surface-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-foreground placeholder:text-foreground/30"
              />
            </motion.div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5 ml-1 text-foreground/80">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-surface/50 border border-surface-border rounded-xl px-11 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-foreground placeholder:text-foreground/30"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 ml-1 text-foreground/80">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-surface/50 border border-surface-border rounded-xl px-11 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-foreground placeholder:text-foreground/30"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3.5 rounded-xl mt-4 transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? "Sign In" : "Sign Up")}
          </button>
        </form>

        <div className="my-6 flex items-center justify-center">
          <div className="h-px bg-surface-border flex-1"></div>
          <span className="px-4 text-xs text-foreground/50 font-medium uppercase tracking-wider">Or</span>
          <div className="h-px bg-surface-border flex-1"></div>
        </div>

        <button
          onClick={async () => {
            const { error } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: `${window.location.origin}/profile`
              }
            });
            if (error) setError(error.message);
          }}
          className="w-full bg-surface border border-surface-border hover:bg-surface-border text-foreground font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="mt-8 text-center text-sm text-foreground/70">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setSuccessMsg(null);
            }}
            className="text-brand-400 font-medium hover:text-brand-300 transition-colors"
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
