"use client";

import { motion } from "framer-motion";
import { Flame, Trophy, Calendar, Target, Loader2, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

interface Recording {
  id: string;
  created_at: string;
  topic: string;
  confidence: number;
  clarity: number;
  video_url: string;
}

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Removed auto-redirect to prevent race conditions during OAuth
  // useEffect(() => {
  //   if (!authLoading && !user) {
  //     router.push("/auth");
  //   }
  // }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchRecordings() {
      if (!user) return;
      try {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("recordings")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;
        if (data) {
          const recordsWithProxyUrls = data.map((record) => {
            if (record.video_url) {
              const filename = record.video_url.startsWith('http') ? record.video_url.split('/').pop() : record.video_url;
              if (filename) {
                return { ...record, video_url: `/api/video?file=${filename}` };
              }
            }
            return record;
          });
          setRecordings(recordsWithProxyUrls);
        }
      } catch (err) {
        console.error("Error fetching recordings:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecordings();
  }, []);

  const avgConfidence = recordings.length > 0 
    ? Math.round(recordings.reduce((acc, curr) => acc + (curr.confidence || 0), 0) / recordings.length) 
    : 0;

  // Calculate a simple global streak based on unique days
  const uniqueDays = new Set(recordings.map(r => new Date(r.created_at).toDateString()));
  const streak = uniqueDays.size;

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (authLoading || isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex justify-center items-center">
        <Loader2 className="w-10 h-10 animate-spin text-white" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="glass-panel p-8 rounded-3xl border border-white/5 float-slow">
          <h2 className="text-2xl font-extrabold mb-4 text-white">Not Authenticated</h2>
          <p className="text-foreground/60 mb-6 font-light">We couldn't verify your session. If you just logged in, please wait a moment or try again.</p>
          <button 
            onClick={() => router.push("/auth")}
            className="px-6 py-3 bg-white text-zinc-950 font-semibold rounded-xl hover:bg-zinc-200 transition-all border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.08)]"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-white">
          {user?.user_metadata?.full_name ? `${user.user_metadata.full_name}'s Progress` : "Your Progress"}
        </h1>
        <p className="text-foreground/60 max-w-xl font-light leading-relaxed">
          Track your personal communication journey and see how you're improving over time.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-6 rounded-3xl flex items-center gap-6 float-slow interactive-card"
        >
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.02)]">
            <Flame className="w-8 h-8 text-orange-500" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white">{streak} Days</div>
            <div className="text-foreground/40 text-xs font-semibold uppercase tracking-wider">Active Streak</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel p-6 rounded-3xl flex items-center gap-6 float-medium interactive-card"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.02)]">
            <Target className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white">{avgConfidence}%</div>
            <div className="text-foreground/40 text-xs font-semibold uppercase tracking-wider">Avg. Confidence</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel p-6 rounded-3xl flex items-center gap-6 float-fast interactive-card"
        >
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.02)]">
            <Trophy className="w-8 h-8 text-purple-500" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white">{recordings.length}</div>
            <div className="text-foreground/40 text-xs font-semibold uppercase tracking-wider">Sessions Logged</div>
          </div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-panel p-8 rounded-3xl border border-white/5 float-medium interactive-card"
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Calendar className="w-6 h-6 text-zinc-300" />
            Recent Recordings
          </h2>
        </div>

        <div className="space-y-4">
          {recordings.length === 0 ? (
            <div className="text-center py-8 text-foreground/40 font-light">
              No recordings found. Go practice and be the first!
            </div>
          ) : (
            recordings.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center font-bold border ${item.confidence >= 80 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : item.confidence >= 70 ? "bg-white/5 text-zinc-300 border-white/10" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                    {item.confidence}%
                  </div>
                  <div>
                    <div className="font-bold text-white line-clamp-1">{item.topic || "Free Practice"}</div>
                    <div className="text-xs text-foreground/40 font-light">{formatDate(item.created_at)} • {item.clarity}% Clarity</div>
                  </div>
                </div>
                
                {item.video_url && (
                  <a 
                    href={item.video_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 border border-white/5 text-white hover:bg-white/10 hover:border-white/10 transition-all rounded-xl font-semibold text-sm sm:w-auto w-full"
                  >
                    <Play className="w-4 h-4" />
                    Watch
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
