"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Flame, Trophy, Calendar, Target, Loader2, Play, X, Share2, Download } from "lucide-react";
import { FluencyCard } from "@/components/FluencyCard";
import { useEffect, useState } from "react";
import { BEAUTIFY_FILTERS } from "@/lib/filters";
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
  wpm?: number | null;
  filler_words?: number | null;
  transcript?: string | null;
}

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [watchRecording, setWatchRecording] = useState<Recording | null>(null);
  const [shareRecording, setShareRecording] = useState<Recording | null>(null);
  const [activeFilter, setActiveFilter] = useState("studio");

  useEffect(() => {
    const saved = localStorage.getItem("speak_mirror_beautify_filter");
    if (saved) {
      setActiveFilter(saved);
    }
  }, []);

  // Removed auto-redirect to prevent race conditions during OAuth
  // useEffect(() => {
  //   if (!authLoading && !user) {
  //     router.push("/auth");
  //   }
  // }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchRecordings() {
      if (!user) {
        if (!authLoading) {
          setIsLoading(false);
        }
        return;
      }
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
  }, [user, authLoading]);

  const avgConfidence = recordings.length > 0 
    ? Math.round(recordings.reduce((acc, curr) => acc + (curr.confidence || 0), 0) / recordings.length) 
    : 0;

  // Calculate true consecutive daily practice streak (updates if practiced daily at least once)
  const calculateStreak = () => {
    if (recordings.length === 0) return 0;
    
    // Convert all recording dates to local midnight timestamps
    const dates = recordings.map(r => {
      const d = new Date(r.created_at);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    });
    
    // Sort unique timestamps descending (most recent first)
    const uniqueTimestamps = Array.from(new Set(dates)).sort((a, b) => b - a);
    
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const yesterdayMidnight = todayMidnight - 86400000;
    
    const mostRecent = uniqueTimestamps[0];
    
    // Streak is broken (0) if there's no practice today or yesterday
    if (mostRecent !== todayMidnight && mostRecent !== yesterdayMidnight) {
      return 0;
    }
    
    let currentStreak = 1;
    for (let i = 0; i < uniqueTimestamps.length - 1; i++) {
      const diff = uniqueTimestamps[i] - uniqueTimestamps[i + 1];
      if (diff === 86400000) {
        currentStreak++;
      } else if (diff > 86400000) {
        // Gap is larger than 1 day, streak is broken
        break;
      }
    }
    return currentStreak;
  };

  const streak = calculateStreak();

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
            <div className="text-3xl font-extrabold text-white">{user?.user_metadata?.login_count || 1}</div>
            <div className="text-foreground/40 text-xs font-semibold uppercase tracking-wider">Login Sessions</div>
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
                  <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                    <button 
                      onClick={() => setWatchRecording(item)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/20 transition-all rounded-xl font-bold text-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Watch
                    </button>
                    <button 
                      onClick={() => setShareRecording(item)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white/5 border border-white/5 text-white hover:bg-white/10 transition-all rounded-xl font-bold text-xs"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Share Card
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </motion.div>

      {/* Modal Popup for Watch Recording */}
      <AnimatePresence>
        {watchRecording && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
            onClick={() => setWatchRecording(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative max-w-lg w-full glass-panel p-6 rounded-[2rem] border border-white/10 bg-[#09090d]/95 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-left flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setWatchRecording(null)}
                className="absolute top-5 right-5 p-2 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <h3 className="text-xl font-extrabold text-white line-clamp-1 pr-12">
                  {watchRecording.topic || "Free Practice"}
                </h3>
                <p className="text-xs text-zinc-400 font-light mt-1">
                  Recorded on {new Date(watchRecording.created_at).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {/* Video Player Container */}
              <div className="glass-panel rounded-2xl overflow-hidden aspect-[9/16] max-h-[45vh] shadow-2xl border border-white/5 relative bg-black flex items-center justify-center">
                <video 
                  src={watchRecording.video_url} 
                  className="w-full h-full object-cover"
                  controls
                  playsInline
                  autoPlay
                  style={{ 
                    transform: 'scaleX(-1)',
                    filter: BEAUTIFY_FILTERS[activeFilter] || BEAUTIFY_FILTERS.none
                  }}
                />
              </div>

              {/* Filter Selector in Playback Modal */}
              <div className="glass-panel px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Beautify Filter:</span>
                <select
                  value={activeFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setActiveFilter(val);
                    localStorage.setItem("speak_mirror_beautify_filter", val);
                  }}
                  className="p-1 px-2 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="none" className="bg-[#09090d]">Original</option>
                  <option value="studio" className="bg-[#09090d]">Studio Glow ✨</option>
                  <option value="warm" className="bg-[#09090d]">Warm Golden ☀️</option>
                  <option value="cool" className="bg-[#09090d]">Nordic Cool ❄️</option>
                  <option value="smooth" className="bg-[#09090d]">Soft Focus 🌸</option>
                </select>
              </div>

              {/* Score Badges */}
              <div className="flex gap-4">
                <div className="flex-1 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                  <div className="text-2xl font-black text-white">{watchRecording.confidence}%</div>
                  <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold mt-0.5">Confidence</div>
                </div>
                <div className="flex-1 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                  <div className="text-2xl font-black text-white">{watchRecording.clarity}%</div>
                  <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold mt-0.5">Clarity</div>
                </div>
              </div>

              {/* Transcript */}
              {watchRecording.transcript && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">Transcript</span>
                  <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 text-xs text-zinc-300 leading-relaxed max-h-[120px] overflow-y-auto font-light">
                    {watchRecording.transcript}
                  </div>
                </div>
              )}

              {/* Save Video Action */}
              <a
                href={watchRecording.video_url}
                download={`speakmirror-recording-${watchRecording.id}.webm`}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white transition-all rounded-xl font-bold text-xs shadow-[0_0_15px_rgba(99,102,241,0.2)] mt-2"
              >
                <Download className="w-4 h-4" />
                Download Video File
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Popup for Share / Download Fluency Card */}
      <AnimatePresence>
        {shareRecording && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
            onClick={() => setShareRecording(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative max-w-3xl w-full max-h-[95vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setShareRecording(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all z-20"
              >
                <X className="w-5 h-5" />
              </button>

              <FluencyCard 
                metrics={{
                  confidence: shareRecording.confidence,
                  clarity: shareRecording.clarity,
                  wpm: shareRecording.wpm || 135,
                  fillerWords: typeof shareRecording.filler_words === 'number' 
                    ? shareRecording.filler_words 
                    : Math.max(0, Math.round((100 - shareRecording.confidence) / 10))
                }}
                userName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || "A Speaker"}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
