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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [user, authLoading, router]);

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
          const recordsWithSignedUrls = await Promise.all(data.map(async (record) => {
            if (record.video_url) {
              const filename = record.video_url.startsWith('http') ? record.video_url.split('/').pop() : record.video_url;
              if (filename) {
                const { data: signedData } = await supabase.storage.from('videos').createSignedUrl(filename, 3600);
                if (signedData) return { ...record, video_url: signedData.signedUrl };
              }
            }
            return record;
          }));
          setRecordings(recordsWithSignedUrls);
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
        <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          {user?.user_metadata?.full_name ? `${user.user_metadata.full_name}'s Progress` : "Your Progress"}
        </h1>
        <p className="text-foreground/70 max-w-xl">
          Track your personal communication journey and see how you're improving over time.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-6 rounded-3xl flex items-center gap-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center">
            <Flame className="w-8 h-8 text-orange-500" />
          </div>
          <div>
            <div className="text-3xl font-bold">{streak} Days</div>
            <div className="text-foreground/60 text-sm font-medium uppercase tracking-wider">Active Streak</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel p-6 rounded-3xl flex items-center gap-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-brand-500/20 flex items-center justify-center">
            <Target className="w-8 h-8 text-brand-500" />
          </div>
          <div>
            <div className="text-3xl font-bold">{avgConfidence}%</div>
            <div className="text-foreground/60 text-sm font-medium uppercase tracking-wider">Avg. Confidence</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel p-6 rounded-3xl flex items-center gap-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center">
            <Trophy className="w-8 h-8 text-purple-500" />
          </div>
          <div>
            <div className="text-3xl font-bold">{recordings.length}</div>
            <div className="text-foreground/60 text-sm font-medium uppercase tracking-wider">Sessions Logged</div>
          </div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-panel p-8 rounded-3xl"
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-brand-500" />
            Recent Recordings
          </h2>
        </div>

        <div className="space-y-4">
          {recordings.length === 0 ? (
            <div className="text-center py-8 text-foreground/50">
              No recordings found. Go practice and be the first!
            </div>
          ) : (
            recordings.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-surface-border/30 hover:bg-surface-border/50 transition-colors border border-surface-border/50 gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center font-bold ${item.confidence >= 80 ? "bg-green-500/20 text-green-400" : item.confidence >= 70 ? "bg-brand-500/20 text-brand-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                    {item.confidence}%
                  </div>
                  <div>
                    <div className="font-semibold line-clamp-1">{item.topic || "Free Practice"}</div>
                    <div className="text-sm text-foreground/50">{formatDate(item.created_at)} • {item.clarity}% Clarity</div>
                  </div>
                </div>
                
                {item.video_url && (
                  <a 
                    href={item.video_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors rounded-xl font-medium text-sm sm:w-auto w-full"
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
