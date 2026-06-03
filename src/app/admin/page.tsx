"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { 
  Shield, 
  Database, 
  Activity, 
  Users, 
  BookOpen, 
  Trash2, 
  Sparkles, 
  Upload, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  TrendingUp, 
  RefreshCw, 
  Layers,
  HardDrive
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  recordings_count: number;
}

interface DailyStatItem {
  stat_date: string;
  recordings_count: number;
  analyze_calls_count: number;
  video_calls_count: number;
  active_users_count: number;
  current_total_storage_bytes?: number;
}

interface AdminStats {
  totalRecordings: number;
  totalAnalyzeCalls: number;
  sessionCompletionRate: number;
  dau: number;
  mau: number;
  dauMauRatio: number;
  activeStreakUsersCount: number;
  storageBytes: number;
  dailyStats: DailyStatItem[];
  databaseViewStatus: string;
}

interface FeedbackItem {
  id: string;
  user_id: string;
  created_at: string;
  confidence: number;
  clarity: number;
  filler_words: number;
  transcript: string;
  topic: string;
  wpm: number;
  eye_contact: number | null;
  expression_score: number | null;
  user_email: string;
  user_name: string;
}

interface PracticeTaskItem {
  id: string;
  topic_of_the_day: string;
  word_of_the_day: string | null;
  definition: string | null;
  reading_text: string | null;
  bullets: Array<{ label: string; text: string }> | null;
  difficulty_level: string;
  created_at: string;
}

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "topics" | "feedback">("overview");

  // State for metrics and lists
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [usersData, setUsersData] = useState<{ users: AdminUser[]; abuseList: AdminUser[] } | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [tasks, setTasks] = useState<PracticeTaskItem[]>([]);
  
  // Loading states
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // User list filters
  const [searchTerm, setSearchTerm] = useState("");

  // Storage cleanup utility inputs
  const [cleanupDays, setCleanupDays] = useState(30);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{
    recordingsCleaned?: number;
    filesDeleted?: number;
    dbUpdateSuccess?: boolean;
    error?: string;
  } | null>(null);

  // AI Pre-generator inputs
  const [aiGenCount, setAiGenCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genResult, setGenResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null);

  // Bulk Topic Importer inputs
  const [bulkJsonText, setBulkJsonText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null);

  // Single Topic Creator inputs
  const [newTopic, setNewTopic] = useState({
    topic: "",
    word: "",
    definition: "",
    readingText: "",
    difficulty: "Beginner",
  });
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || user.user_metadata?.role !== "admin")) {
      router.push("/practice");
    }
  }, [user, authLoading, router]);

  // Fetch admin stats overview
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/admin?action=stats");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStats(data);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch user search & abuse data
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin?action=users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsersData(data);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Failed to fetch users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch feedback inbox
  const fetchFeedbacks = async () => {
    setLoadingFeedbacks(true);
    try {
      const res = await fetch("/api/admin?action=feedback");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFeedbacks(data.feedbacks || []);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Failed to fetch feedbacks:", error);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  // Fetch current pre-generated tasks
  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await fetch("/api/admin?action=tasks");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTasks(data.tasks || []);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Run initial fetch on mount
  useEffect(() => {
    if (user && user.user_metadata?.role === "admin") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchStats();
    }
  }, [user]);

  // Fetch tab data when active tab changes
  useEffect(() => {
    if (!user || user.user_metadata?.role !== "admin") return;

    if (activeTab === "users") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchUsers();
    } else if (activeTab === "topics") {
      fetchTasks();
    } else if (activeTab === "feedback") {
      fetchFeedbacks();
    }
  }, [activeTab, user]);

  // Action: AI pre-generate topics
  const handleAiPreGenerate = async () => {
    setIsGenerating(true);
    setGenResult(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-topics", count: aiGenCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGenResult({ success: true, count: data.count });
      fetchTasks();
      fetchStats();
    } catch (err: unknown) {
      const error = err as Error;
      setGenResult({ success: false, error: error.message });
    } finally {
      setIsGenerating(false);
    }
  };

  // Action: Bulk Import Topics
  const handleBulkImport = async () => {
    setIsImporting(true);
    setImportResult(null);
    try {
      const parsedTasks = JSON.parse(bulkJsonText);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk-import", tasks: parsedTasks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImportResult({ success: true, count: data.count });
      setBulkJsonText("");
      fetchTasks();
    } catch (err: unknown) {
      const error = err as Error;
      setImportResult({ success: false, error: "Invalid JSON format or API error: " + error.message });
    } finally {
      setIsImporting(false);
    }
  };

  // Action: Single topic creator
  const handleCreateSingleTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingTopic(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-task", ...newTopic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewTopic({
        topic: "",
        word: "",
        definition: "",
        readingText: "",
        difficulty: "Beginner",
      });
      fetchTasks();
      alert("Topic created successfully!");
    } catch (err: unknown) {
      const error = err as Error;
      alert("Error: " + error.message);
    } finally {
      setIsCreatingTopic(false);
    }
  };

  // Action: Storage cleanup
  const handleStorageCleanup = async () => {
    const confirmCleanup = window.confirm(`Are you sure you want to clean up video storage for recordings older than ${cleanupDays} days? This cannot be undone!`);
    if (!confirmCleanup) return;

    setIsCleaning(true);
    setCleanupResult(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cleanup-storage", olderThanDays: cleanupDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCleanupResult(data);
      fetchStats();
    } catch (err: unknown) {
      const error = err as Error;
      setCleanupResult({ error: error.message });
    } finally {
      setIsCleaning(false);
    }
  };

  // Format bytes helper
  const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  if (authLoading || !user || user.user_metadata?.role !== "admin") {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <Activity className="w-8 h-8 animate-spin text-brand-500 mb-2" />
        <span className="text-xs uppercase tracking-widest text-foreground/50">Verifying Admin Access Tower...</span>
      </div>
    );
  }

  // Filter users based on search query
  const filteredUsers = (usersData?.users as AdminUser[] | undefined)?.filter((u: AdminUser) => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-black text-foreground pb-24">
      {/* Top Banner Control Tower */}
      <div className="border-b border-surface-border bg-surface/10 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-xl">
              <Shield className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                Control Tower <span className="text-xs bg-brand-500/20 text-brand-400 border border-brand-500/30 px-2 py-0.5 rounded font-mono">B2C Scaling</span>
              </h1>
              <p className="text-xs text-foreground/50 leading-none mt-1">Cost Control & Cloud Resources Portal</p>
            </div>
          </div>
          
          {/* Main Controls Panel */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { fetchStats(); if (activeTab === 'users') fetchUsers(); if (activeTab === 'topics') fetchTasks(); if (activeTab === 'feedback') fetchFeedbacks(); }}
              className="p-2 bg-surface hover:bg-surface-border border border-surface-border rounded-xl transition-all text-foreground/80 hover:text-white"
              title="Refresh Control Tower"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="flex bg-surface rounded-xl p-1 border border-surface-border">
              <button 
                onClick={() => setActiveTab("overview")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "overview" ? "bg-brand-600 text-white shadow-lg" : "text-foreground/70 hover:text-white"}`}
              >
                Overview
              </button>
              <button 
                onClick={() => setActiveTab("users")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "users" ? "bg-brand-600 text-white shadow-lg" : "text-foreground/70 hover:text-white"}`}
              >
                Users
              </button>
              <button 
                onClick={() => setActiveTab("topics")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "topics" ? "bg-brand-600 text-white shadow-lg" : "text-foreground/70 hover:text-white"}`}
              >
                Topics
              </button>
              <button 
                onClick={() => setActiveTab("feedback")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "feedback" ? "bg-brand-600 text-white shadow-lg" : "text-foreground/70 hover:text-white"}`}
              >
                Feedbacks
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <AnimatePresence mode="wait">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <motion.div
              key="overview-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Cost & Health Monitor Section */}
              <div>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5 text-brand-500" />
                  Infrastructure Monitoring (Cost Control)
                </h2>
                
                {loadingStats ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="glass-panel p-6 rounded-2xl animate-pulse h-32 border border-surface-border" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1: AI API Calls */}
                    <div className="glass-panel p-6 rounded-2xl border border-surface-border relative overflow-hidden bg-surface/20">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground/50">Groq / AI Usage</span>
                        <div className="p-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg">
                          <Activity className="w-4 h-4" />
                        </div>
                      </div>
                      <h3 className="text-3xl font-extrabold tracking-tight">
                        {stats?.totalAnalyzeCalls} <span className="text-xs text-foreground/40 font-normal">calls</span>
                      </h3>
                      <p className="text-xs text-foreground/60 leading-none mt-2">
                        Total `/api/analyze` request telemetry logs.
                      </p>
                    </div>

                    {/* Card 2: Storage Health */}
                    <div className="glass-panel p-6 rounded-2xl border border-surface-border relative overflow-hidden bg-surface/20">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground/50">Storage Health</span>
                        <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
                          <HardDrive className="w-4 h-4" />
                        </div>
                      </div>
                      <h3 className="text-3xl font-extrabold tracking-tight">
                        {formatBytes(stats?.storageBytes ?? 0)}
                      </h3>
                      <p className="text-xs text-foreground/60 leading-none mt-2">
                        Total raw space occupied in Supabase `videos` bucket.
                      </p>
                    </div>

                    {/* Card 3: Storage Cleanup Utility */}
                    <div className="glass-panel p-6 rounded-2xl border border-surface-border relative overflow-hidden bg-surface/20">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Storage Janitor
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-foreground/60">Older than</span>
                        <input 
                          type="number" 
                          value={cleanupDays} 
                          onChange={(e) => setCleanupDays(parseInt(e.target.value) || 30)}
                          className="bg-black border border-surface-border rounded-lg text-center px-1.5 py-1 text-xs w-12 text-white font-mono"
                        />
                        <span className="text-xs text-foreground/60">days</span>
                      </div>
                      <button 
                        onClick={handleStorageCleanup}
                        disabled={isCleaning}
                        className="mt-3 w-full py-1.5 bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {isCleaning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        {isCleaning ? "Purging Storage..." : "Run Cleanup Job"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Cleanup Success Banner */}
                {cleanupResult && (
                  <div className="mt-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Cleaned up {cleanupResult.recordingsCleaned} recordings. Deleted {cleanupResult.filesDeleted} files from the Supabase bucket.
                    </span>
                    <button onClick={() => setCleanupResult(null)} className="font-extrabold hover:text-white text-[10px]">DISMISS</button>
                  </div>
                )}
              </div>

              {/* Growth & Retention Metrics Section */}
              <div>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-brand-500" />
                  Growth & Retention Metrics
                </h2>

                {loadingStats ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="glass-panel p-6 rounded-2xl animate-pulse h-32 border border-surface-border" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Metric 1: Power Users Streak */}
                    <div className="glass-panel p-6 rounded-2xl border border-surface-border bg-surface/20">
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground/50">Active Streaks</span>
                      <h3 className="text-3xl font-extrabold tracking-tight text-brand-400 mt-2">
                        {stats?.activeStreakUsersCount} <span className="text-xs text-foreground/40 font-normal">users</span>
                      </h3>
                      <p className="text-xs text-foreground/60 leading-tight mt-2">
                        Users with 3+ days active. Crucial cohort for prospective premium offerings.
                      </p>
                    </div>

                    {/* Metric 2: Completion Rate */}
                    <div className="glass-panel p-6 rounded-2xl border border-surface-border bg-surface/20">
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground/50">Session Completion Rate</span>
                      <h3 className="text-3xl font-extrabold tracking-tight text-emerald-400 mt-2">
                        {stats?.sessionCompletionRate}%
                      </h3>
                      <p className="text-xs text-foreground/60 leading-tight mt-2">
                        % of started speech analytics saved successfully. Confirms API / route reliability.
                      </p>
                    </div>

                    {/* Metric 3: Sticky DAU/MAU */}
                    <div className="glass-panel p-6 rounded-2xl border border-surface-border bg-surface/20">
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground/50">DAU/MAU Ratio</span>
                      <h3 className="text-3xl font-extrabold tracking-tight text-cyan-400 mt-2">
                        {stats?.dauMauRatio}%
                      </h3>
                      <p className="text-xs text-foreground/60 leading-tight mt-2">
                        {stats?.dau} DAU / {stats?.mau} MAU. Measures application stickiness and habitual usage.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Database Status Alert */}
              {!loadingStats && stats?.databaseViewStatus !== "active" && (
                <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-xs flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold">Missing Migration Views!</h4>
                    <p className="mt-1 leading-relaxed text-foreground/80">
                      The Supabase view `admin_stats` is not configured. Realtime growth tracking falls back to client estimations. 
                      Please execute the generated SQL migration in your Supabase SQL Editor:
                    </p>
                    <code className="block mt-2 bg-black/50 p-2.5 rounded-lg border border-surface-border text-foreground/70 font-mono text-[10px] break-all select-all">
                      supabase/migrations/20260603000000_admin_features.sql
                    </code>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: USER SEARCH & ABUSE MONITOR */}
          {activeTab === "users" && (
            <motion.div
              key="users-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Abuse Monitor */}
              <div>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                  Abuse Monitor (High API Usage)
                </h2>
                
                {loadingUsers ? (
                  <div className="glass-panel p-6 rounded-2xl animate-pulse h-48 border border-surface-border" />
                ) : (
                  <div className="glass-panel rounded-2xl border border-surface-border overflow-hidden bg-surface/10">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-surface-border bg-surface/35 text-[10px] uppercase font-bold tracking-widest text-foreground/50">
                            <th className="p-4">Speaker</th>
                            <th className="p-4">Email</th>
                            <th className="p-4 text-center">Recordings Submitted</th>
                            <th className="p-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-border/50 text-xs">
                          {usersData?.abuseList?.map((u: AdminUser) => (
                            <tr key={u.id} className="hover:bg-surface/10 transition-colors">
                              <td className="p-4 font-semibold text-white">{u.name}</td>
                              <td className="p-4 font-mono text-foreground/70">{u.email}</td>
                              <td className="p-4 text-center font-bold text-brand-400">{u.recordings_count}</td>
                              <td className="p-4">
                                {u.recordings_count > 50 ? (
                                  <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded text-[10px] font-bold">ABUSE RISK</span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold">NORMAL</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* User Search Table */}
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-500" />
                    B2C User Registry
                  </h2>
                  <div className="relative w-full sm:w-72">
                    <input 
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-surface border border-surface-border rounded-xl pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                    <Search className="w-3.5 h-3.5 text-foreground/40 absolute left-3 top-2.5" />
                  </div>
                </div>

                {loadingUsers ? (
                  <div className="glass-panel p-6 rounded-2xl animate-pulse h-64 border border-surface-border" />
                ) : (
                  <div className="glass-panel rounded-2xl border border-surface-border overflow-hidden bg-surface/10">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-surface-border bg-surface/35 text-[10px] uppercase font-bold tracking-widest text-foreground/50">
                            <th className="p-4">User</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Signed Up</th>
                            <th className="p-4 text-center">Recordings</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-border/50 text-xs">
                          {filteredUsers.map((u: AdminUser) => (
                            <tr key={u.id} className="hover:bg-surface/10 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-brand-600/10 border border-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-xs">
                                    {u.name[0]?.toUpperCase()}
                                  </div>
                                  <span className="font-semibold text-white">{u.name}</span>
                                </div>
                              </td>
                              <td className="p-4 font-mono text-foreground/70">{u.email}</td>
                              <td className="p-4 text-foreground/60">{new Date(u.created_at).toLocaleDateString()}</td>
                              <td className="p-4 text-center font-bold text-foreground/70">{u.recordings_count}</td>
                            </tr>
                          ))}
                          {filteredUsers.length === 0 && (
                            <tr>
                              <td colSpan={4} className="p-8 text-center text-foreground/40 text-xs">
                                No registered users found matching the query.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 3: TOPIC ENGINE */}
          {activeTab === "topics" && (
            <motion.div
              key="topics-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Left Column: Management Tools */}
              <div className="lg:col-span-1 space-y-6">
                {/* Tool 1: AI generator */}
                <div className="glass-panel p-6 rounded-2xl border border-surface-border bg-surface/20">
                  <h3 className="font-bold mb-2 flex items-center gap-2 text-brand-400">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    AI Topic Generator
                  </h3>
                  <p className="text-xs text-foreground/60 mb-4 leading-relaxed">
                    Automatically pre-generate speech prompts based on 4W+1H templates using Llama 3 on Groq.
                  </p>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs text-foreground/60">Generate</span>
                    <input 
                      type="number"
                      value={aiGenCount}
                      onChange={(e) => setAiGenCount(parseInt(e.target.value) || 10)}
                      className="bg-black border border-surface-border text-center rounded-lg py-1 text-xs w-16 text-white font-mono"
                    />
                    <span className="text-xs text-foreground/60">topics</span>
                  </div>

                  <button 
                    onClick={handleAiPreGenerate}
                    disabled={isGenerating}
                    className="w-full py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {isGenerating ? "Pre-generating..." : "Pre-generate Month's Pool"}
                  </button>

                  {genResult && (
                    <div className={`mt-4 p-3 rounded-lg border text-xs leading-relaxed ${genResult.success ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-400'}`}>
                      {genResult.success ? `Successfully pre-generated and stored ${genResult.count} speech prompts in DB!` : `Generation failed: ${genResult.error}`}
                    </div>
                  )}
                </div>

                {/* Tool 2: Bulk Prompts Importer */}
                <div className="glass-panel p-6 rounded-2xl border border-surface-border bg-surface/20">
                  <h3 className="font-bold mb-2 flex items-center gap-2 text-emerald-400">
                    <Upload className="w-4 h-4" />
                    Bulk Prompts Importer
                  </h3>
                  <p className="text-xs text-foreground/60 mb-3 leading-relaxed">
                    Paste a JSON array of prompts to import in bulk:
                  </p>
                  <textarea 
                    value={bulkJsonText}
                    onChange={(e) => setBulkJsonText(e.target.value)}
                    placeholder='[{"topic": "Favorite Hobby", "difficulty_level": "Beginner"}]'
                    rows={4}
                    className="w-full bg-black border border-surface-border rounded-xl p-2.5 text-[10px] text-foreground font-mono focus:outline-none focus:border-brand-500 leading-normal"
                  />
                  <button 
                    onClick={handleBulkImport}
                    disabled={isImporting || !bulkJsonText}
                    className="w-full mt-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    Import Prompts
                  </button>

                  {importResult && (
                    <div className={`mt-3 p-3 rounded-lg border text-xs leading-relaxed ${importResult.success ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-400'}`}>
                      {importResult.success ? `Successfully imported ${importResult.count} speaking prompts!` : importResult.error}
                    </div>
                  )}
                </div>

                {/* Tool 3: Manual Task Form */}
                <div className="glass-panel p-6 rounded-2xl border border-surface-border bg-surface/20">
                  <h3 className="font-bold mb-3 flex items-center gap-2 text-white">
                    <Layers className="w-4 h-4" />
                    Create Speaking Task
                  </h3>
                  <form onSubmit={handleCreateSingleTopic} className="space-y-3.5">
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-widest text-foreground/50 mb-1">Prompt Topic</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="What is your long-term goal?"
                        value={newTopic.topic}
                        onChange={(e) => setNewTopic({...newTopic, topic: e.target.value})}
                        className="w-full bg-black border border-surface-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-widest text-foreground/50 mb-1">Vocabulary Word</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Aspirations"
                          value={newTopic.word}
                          onChange={(e) => setNewTopic({...newTopic, word: e.target.value})}
                          className="w-full bg-black border border-surface-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-widest text-foreground/50 mb-1">Difficulty</label>
                        <select 
                          value={newTopic.difficulty}
                          onChange={(e) => setNewTopic({...newTopic, difficulty: e.target.value})}
                          className="w-full bg-black border border-surface-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-brand-500"
                        >
                          <option>Beginner</option>
                          <option>Intermediate</option>
                          <option>Advanced</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-widest text-foreground/50 mb-1">Word Definition</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Strong desires or ambitions"
                        value={newTopic.definition}
                        onChange={(e) => setNewTopic({...newTopic, definition: e.target.value})}
                        className="w-full bg-black border border-surface-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-widest text-foreground/50 mb-1">Reading Practice Text</label>
                      <textarea 
                        placeholder="Optional short paragraph to read aloud..."
                        value={newTopic.readingText}
                        onChange={(e) => setNewTopic({...newTopic, readingText: e.target.value})}
                        rows={2}
                        className="w-full bg-black border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isCreatingTopic}
                      className="w-full py-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      Publish Prompt
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Pre-generated Topic Pool List */}
              <div className="lg:col-span-2">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-brand-500" />
                  B2C Speaking Topics Pool
                </h2>

                {loadingTasks ? (
                  <div className="glass-panel p-6 rounded-2xl animate-pulse h-96 border border-surface-border" />
                ) : (
                  <div className="glass-panel rounded-2xl border border-surface-border overflow-hidden bg-surface/10">
                    <div className="max-h-[600px] overflow-y-auto divide-y divide-surface-border">
                      {tasks.map((t) => (
                        <div key={t.id} className="p-4 hover:bg-surface/5 transition-colors flex flex-col sm:flex-row justify-between items-start gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white">{t.topic_of_the_day}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${t.difficulty_level === 'Advanced' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : t.difficulty_level === 'Intermediate' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'}`}>
                                {t.difficulty_level}
                              </span>
                            </div>
                            {t.word_of_the_day && (
                              <p className="text-xs text-foreground/75 leading-tight">
                                <span className="font-bold text-brand-400">Word:</span> {t.word_of_the_day} — <span className="italic text-foreground/60">{t.definition}</span>
                              </p>
                            )}
                            {t.reading_text && (
                              <p className="text-[11px] text-foreground/50 border-l border-surface-border pl-2 italic leading-relaxed">
                                {"\"" + t.reading_text + "\""}
                              </p>
                            )}
                          </div>
                          <div className="text-[10px] text-foreground/40 self-end shrink-0 sm:self-auto font-mono">
                            {new Date(t.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                      {tasks.length === 0 && (
                        <div className="p-12 text-center text-foreground/40 text-xs">
                          No speaking prompts in B2C pool yet. Pre-generate or import to begin.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 4: FEEDBACK INBOX */}
          {activeTab === "feedback" && (
            <motion.div
              key="feedback-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-brand-500" />
                Feedback Quality & Diagnostic Inbox
              </h2>

              {loadingFeedbacks ? (
                <div className="glass-panel p-6 rounded-2xl animate-pulse h-96 border border-surface-border" />
              ) : (
                <div className="space-y-4">
                  {feedbacks.map((f) => (
                    <div key={f.id} className="glass-panel p-5 rounded-2xl border border-surface-border bg-surface/10 space-y-4">
                      {/* Top Header */}
                      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-surface-border/50 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-xs">
                            {f.user_name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-white">{f.user_name}</span>
                            <span className="text-[10px] font-mono text-foreground/50 block leading-none mt-1">{f.user_email}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <span className="text-[10px] text-foreground/40 font-mono">
                            {new Date(f.created_at).toLocaleString()}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-surface border border-surface-border text-foreground/80 font-medium">
                            {f.topic}
                          </span>
                        </div>
                      </div>

                      {/* Info / Metadata Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                        <div className="glass-panel bg-black/30 p-2.5 rounded-xl text-center border border-surface-border/50">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-foreground/50 block">Confidence</span>
                          <span className="text-base font-extrabold text-brand-400">{f.confidence}%</span>
                        </div>
                        <div className="glass-panel bg-black/30 p-2.5 rounded-xl text-center border border-surface-border/50">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-foreground/50 block">Clarity</span>
                          <span className="text-base font-extrabold text-emerald-400">{f.clarity}%</span>
                        </div>
                        <div className="glass-panel bg-black/30 p-2.5 rounded-xl text-center border border-surface-border/50">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-foreground/50 block">Pacing</span>
                          <span className="text-base font-extrabold text-cyan-400">{f.wpm} <span className="text-[8px] font-normal text-foreground/50">WPM</span></span>
                        </div>
                        <div className="glass-panel bg-black/30 p-2.5 rounded-xl text-center border border-surface-border/50">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-foreground/50 block">Fillers</span>
                          <span className={`text-base font-extrabold ${f.filler_words > 5 ? 'text-amber-400' : 'text-emerald-400'}`}>{f.filler_words}</span>
                        </div>
                        <div className="glass-panel bg-black/30 p-2.5 rounded-xl text-center border border-surface-border/50">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-foreground/50 block">Eye Contact</span>
                          <span className="text-base font-extrabold text-purple-400">
                            {f.eye_contact !== null ? `${Math.round(f.eye_contact)}%` : "N/A"}
                          </span>
                        </div>
                        <div className="glass-panel bg-black/30 p-2.5 rounded-xl text-center border border-surface-border/50">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-foreground/50 block">Expression</span>
                          <span className="text-base font-extrabold text-pink-400">
                            {f.expression_score !== null ? `${Math.round(f.expression_score)}%` : "N/A"}
                          </span>
                        </div>
                      </div>

                      {/* Speech Transcript */}
                      <div className="bg-black/30 p-3 rounded-xl border border-surface-border/50">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-foreground/50 block mb-1.5">User Speech Transcript</span>
                        <p className="text-xs text-foreground/80 leading-relaxed italic">
                          {"\"" + f.transcript + "\""}
                        </p>
                      </div>
                    </div>
                  ))}
                  {feedbacks.length === 0 && (
                    <div className="glass-panel p-12 text-center text-foreground/40 text-xs border border-surface-border">
                      No recording feedbacks submitted yet.
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
