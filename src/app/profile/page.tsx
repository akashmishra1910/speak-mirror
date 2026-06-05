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

  const [difficultyLevel, setDifficultyLevel] = useState<string>("Beginner");
  const [isUpdatingLevel, setIsUpdatingLevel] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("speak_mirror_beautify_filter");
    if (saved) {
      setActiveFilter(saved);
    }
  }, []);

  useEffect(() => {
    if (user?.user_metadata?.difficulty_level) {
      setDifficultyLevel(user.user_metadata.difficulty_level);
    }
  }, [user]);

  const handleUpdateDifficulty = async (level: string) => {
    setDifficultyLevel(level);
    setIsUpdatingLevel(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { difficulty_level: level }
      });
      if (error) throw error;
    } catch (err) {
      console.error("Failed to update difficulty level:", err);
      alert("Error updating difficulty level. Please try again.");
    } finally {
      setIsUpdatingLevel(false);
    }
  };

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
        <Loader2 className="w-10 h-10 animate-spin text-themeText dark:text-white" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="glass-panel p-8 rounded-3xl dark:border-white/5 float-slow">
          <h2 className="text-2xl font-extrabold mb-4 text-themeText dark:text-white">Not Authenticated</h2>
          <p className="text-slate-600 dark:text-foreground/60 mb-6 font-light">We couldn't verify your session. If you just logged in, please wait a moment or try again.</p>
          <button 
            onClick={() => router.push("/auth")}
            className="px-6 py-3 bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white font-semibold rounded-xl transition-all shadow-[0_4px_15px_rgba(14,165,233,0.15)] hover:shadow-[0_4px_20px_rgba(14,165,233,0.25)] cursor-pointer"
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
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-themeText dark:text-white">
          {user?.user_metadata?.full_name ? `${user.user_metadata.full_name}'s Progress` : "Your Progress"}
        </h1>
        <p className="text-slate-600 dark:text-foreground/60 max-w-xl font-light leading-relaxed">
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
            <div className="text-3xl font-extrabold text-themeText dark:text-white">{streak} Days</div>
            <div className="text-slate-500 dark:text-zinc-500 text-xs font-semibold uppercase tracking-wider">Active Streak</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel p-6 rounded-3xl flex items-center gap-6 float-medium interactive-card"
        >
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 dark:bg-white/5 dark:border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.02)]">
            <Target className="w-8 h-8 text-sky-600 dark:text-white" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-themeText dark:text-white">{avgConfidence}%</div>
            <div className="text-slate-500 dark:text-zinc-500 text-xs font-semibold uppercase tracking-wider">Avg. Confidence</div>
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
            <div className="text-3xl font-extrabold text-themeText dark:text-white">{user?.user_metadata?.login_count || 1}</div>
            <div className="text-slate-500 dark:text-zinc-500 text-xs font-semibold uppercase tracking-wider">Login Sessions</div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mb-12">
        {/* Left Side: Recent Recordings */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 glass-panel p-8 rounded-3xl dark:border-white/5 float-medium interactive-card"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-themeText dark:text-white">
              <Calendar className="w-6 h-6 text-slate-650 dark:text-zinc-300" />
              Recent Recordings
            </h2>
          </div>

          <div className="space-y-4">
            {recordings.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-zinc-500 font-light">
                No recordings found. Go practice and be the first!
              </div>
            ) : (
              recordings.map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-sky-500/5 hover:bg-sky-500/10 border border-sky-500/10 hover:border-sky-500/20 dark:bg-white/[0.01] dark:hover:bg-white/[0.03] dark:border-white/5 dark:hover:border-white/10 transition-all gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center font-bold border ${item.confidence >= 80 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : item.confidence >= 70 ? "bg-slate-500/10 text-slate-650 dark:text-zinc-300 border-slate-500/20 dark:bg-white/5 dark:border-white/10" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"}`}>
                      {item.confidence}%
                    </div>
                    <div>
                      <div className="font-bold text-themeText dark:text-white line-clamp-1">{item.topic || "Free Practice"}</div>
                      <div className="text-xs text-slate-500 dark:text-zinc-400 font-light">{formatDate(item.created_at)} • {item.clarity}% Clarity</div>
                    </div>
                  </div>
                  
                  {item.video_url && (
                    <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                      <button 
                        onClick={() => setWatchRecording(item)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50/50 dark:bg-indigo-600/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-600/20 transition-all rounded-xl font-bold text-xs cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Watch
                      </button>
                      <button 
                        onClick={() => setShareRecording(item)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-white/5 dark:border-white/5 dark:text-white dark:hover:bg-white/10 transition-all rounded-xl font-bold text-xs cursor-pointer"
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

        {/* Right Side: Preferences & Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-1 glass-panel p-8 rounded-3xl dark:border-white/5 dark:bg-[#09090d]/80 dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)] w-full text-left"
        >
          <h2 className="text-xl font-bold mb-6 text-themeText dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            Practice Settings
          </h2>

          {/* Difficulty Level Setting */}
          <div className="mb-6">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-3">
              Practice Difficulty
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["Beginner", "Intermediate", "Advanced"].map((level) => {
                const isActive = difficultyLevel === level;
                return (
                  <button
                    key={level}
                    onClick={() => handleUpdateDifficulty(level)}
                    disabled={isUpdatingLevel}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center cursor-pointer ${
                      isActive
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                        : "bg-slate-100/80 border-slate-200/60 text-slate-600 hover:bg-slate-250 dark:bg-white/5 dark:border-white/5 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
                    }`}
                  >
                    {isUpdatingLevel && isActive ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      level
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-zinc-500 font-light mt-2 leading-relaxed">
              {difficultyLevel === "Beginner" && "Generates simple, relatable everyday topics to build confidence and fluency."}
              {difficultyLevel === "Intermediate" && "Generates professional or abstract topics to practice structuring arguments."}
              {difficultyLevel === "Advanced" && "Generates complex, philosophical, or technical topics to test deep spontaneous delivery."}
            </p>
          </div>

          {/* Default Beautify Filter Setting */}
          <div className="mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-3">
              Default Beautify Filter
            </label>
            <select
              value={activeFilter}
              onChange={(e) => {
                const val = e.target.value;
                setActiveFilter(val);
                localStorage.setItem("speak_mirror_beautify_filter", val);
              }}
              className="w-full p-2.5 rounded-xl bg-white/80 border border-slate-200/60 text-xs text-slate-800 dark:bg-white/5 dark:border-white/10 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm dark:shadow-none"
            >
              <option value="none" className="bg-white text-slate-800 dark:bg-[#09090d] dark:text-white">Original (No filter)</option>
              <option value="studio" className="bg-white text-slate-800 dark:bg-[#09090d] dark:text-white">Studio Glow ✨</option>
              <option value="warm" className="bg-white text-slate-800 dark:bg-[#09090d] dark:text-white">Warm Golden ☀️</option>
              <option value="cool" className="bg-white text-slate-800 dark:bg-[#09090d] dark:text-white">Nordic Cool ❄️</option>
              <option value="smooth" className="bg-white text-slate-800 dark:bg-[#09090d] dark:text-white">Soft Focus 🌸</option>
            </select>
            <p className="text-[10px] text-slate-550 dark:text-zinc-500 font-light mt-2 leading-relaxed">
              Your chosen video filter will be applied automatically when starting new practice sessions.
            </p>
          </div>
        </motion.div>
      </div>

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
              className="relative max-w-lg w-full glass-panel p-6 rounded-[2rem] dark:border-white/10 dark:bg-[#09090d]/95 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-left flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setWatchRecording(null)}
                className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200/50 text-slate-500 hover:text-slate-800 dark:bg-white/5 dark:border-white/5 dark:hover:bg-white/10 dark:text-zinc-400 dark:hover:text-white transition-all z-10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <h3 className="text-xl font-extrabold text-themeText dark:text-white line-clamp-1 pr-12">
                  {watchRecording.topic || "Free Practice"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-light mt-1">
                  Recorded on {new Date(watchRecording.created_at).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {/* Video Player Container */}
              <div className="glass-panel rounded-2xl overflow-hidden aspect-[9/16] max-h-[45vh] shadow-2xl dark:border-white/5 relative bg-black flex items-center justify-center">
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
              <div className="glass-panel px-4 py-2.5 rounded-xl dark:border-white/5 dark:bg-white/[0.01] flex items-center justify-between text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Beautify Filter:</span>
                <select
                  value={activeFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setActiveFilter(val);
                    localStorage.setItem("speak_mirror_beautify_filter", val);
                  }}
                  className="p-1 px-2 rounded-lg bg-white border border-slate-200 text-[10px] text-slate-800 dark:bg-white/5 dark:border-white/10 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="none" className="bg-white text-slate-800 dark:bg-[#09090d] dark:text-white">Original</option>
                  <option value="studio" className="bg-white text-slate-800 dark:bg-[#09090d] dark:text-white">Studio Glow ✨</option>
                  <option value="warm" className="bg-white text-slate-800 dark:bg-[#09090d] dark:text-white">Warm Golden ☀️</option>
                  <option value="cool" className="bg-white text-slate-800 dark:bg-[#09090d] dark:text-white">Nordic Cool ❄️</option>
                  <option value="smooth" className="bg-white text-slate-800 dark:bg-[#09090d] dark:text-white">Soft Focus 🌸</option>
                </select>
              </div>

              {/* Score Badges */}
              <div className="flex gap-4">
                <div className="flex-1 p-3 rounded-xl bg-sky-500/5 dark:bg-white/[0.02] border border-sky-500/10 dark:border-white/5 text-center">
                  <div className="text-2xl font-black text-themeText dark:text-white">{watchRecording.confidence}%</div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-widest font-semibold mt-0.5">Confidence</div>
                </div>
                <div className="flex-1 p-3 rounded-xl bg-sky-500/5 dark:bg-white/[0.02] border border-sky-500/10 dark:border-white/5 text-center">
                  <div className="text-2xl font-black text-themeText dark:text-white">{watchRecording.clarity}%</div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-widest font-semibold mt-0.5">Clarity</div>
                </div>
              </div>

              {/* Transcript */}
              {watchRecording.transcript && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-slate-550 dark:text-zinc-400 uppercase tracking-widest font-semibold">Transcript</span>
                  <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-white/[0.01] border border-slate-200/50 dark:border-white/5 text-xs text-slate-700 dark:text-zinc-300 leading-relaxed max-h-[120px] overflow-y-auto font-light">
                    {watchRecording.transcript}
                  </div>
                </div>
              )}

              {/* Save Video Action */}
              <a
                href={watchRecording.video_url}
                download={`speakmirror-recording-${watchRecording.id}.webm`}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white transition-all rounded-xl font-bold text-xs shadow-[0_4px_15px_rgba(14,165,233,0.15)] hover:shadow-[0_4px_20px_rgba(14,165,233,0.25)] active:scale-98 mt-2 cursor-pointer"
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
