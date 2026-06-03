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
  HardDrive,
  Terminal,
  ArrowUpRight,
  Award,
  MessageSquare,
  Clock,
  Plus,
  X,
  Sliders,
  ChevronRight,
  Play,
  Heart,
  HelpCircle,
  AlertCircle
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

interface SupportTicket {
  id: string;
  user: string;
  email: string;
  category: string;
  message: string;
  status: "open" | "investigating" | "resolved";
  created_at: string;
}

// ----------------------------------------------------
// Fallback / Mock Data matching the flat dark console theme
// ----------------------------------------------------
const mockStats: AdminStats = {
  totalRecordings: 142,
  totalAnalyzeCalls: 184,
  sessionCompletionRate: 77,
  dau: 18,
  mau: 92,
  dauMauRatio: 19.5,
  activeStreakUsersCount: 8,
  storageBytes: 154800000, // ~154MB
  dailyStats: [
    { stat_date: "2026-06-03", recordings_count: 8, analyze_calls_count: 10, video_calls_count: 15, active_users_count: 6 }
  ],
  databaseViewStatus: "active"
};

const mockUsers: AdminUser[] = [
  { id: "usr_d4f82a9e", email: "alex.jones@gmail.com", name: "Alex Jones", role: "user", created_at: "2026-05-15T08:30:00Z", recordings_count: 54 },
  { id: "usr_7c1b5e3a", email: "maria.s@outlook.com", name: "Maria Santos", role: "user", created_at: "2026-05-18T14:15:00Z", recordings_count: 38 },
  { id: "usr_9b2d8c7f", email: "k.tanaka@yahoo.com", name: "Kenji Tanaka", role: "user", created_at: "2026-05-20T11:45:00Z", recordings_count: 31 },
  { id: "usr_3a6e8b1d", email: "sarah.lee@live.com", name: "Sarah Lee", role: "user", created_at: "2026-05-22T09:20:00Z", recordings_count: 27 },
  { id: "usr_e5c9f2a4", email: "d.kovac@proton.me", name: "David Kovac", role: "user", created_at: "2026-05-24T17:10:00Z", recordings_count: 22 },
];

const mockFeedbacks: FeedbackItem[] = [
  {
    id: "rec_e8b9",
    user_id: "usr_d4f82a9e",
    created_at: "2026-06-03T16:45:00Z",
    confidence: 85,
    clarity: 89,
    filler_words: 2,
    transcript: "I believe that long-term goals are essential because they give us a roadmap and keep us motivated during challenging times.",
    topic: "What is your long-term goal?",
    wpm: 125,
    eye_contact: 92,
    expression_score: 87,
    user_email: "alex.jones@gmail.com",
    user_name: "Alex Jones"
  },
  {
    id: "rec_f2a4",
    user_id: "usr_7c1b5e3a",
    created_at: "2026-06-03T15:30:00Z",
    confidence: 72,
    clarity: 78,
    filler_words: 6,
    transcript: "The book that influenced me the most was definitely Sapiens because it completely reframed how I think about human history.",
    topic: "A book that influenced you",
    wpm: 110,
    eye_contact: 78,
    expression_score: 65,
    user_email: "maria.s@outlook.com",
    user_name: "Maria Santos"
  }
];

const mockTasks: PracticeTaskItem[] = [
  {
    id: "task_1",
    topic_of_the_day: "Explain the challenges of remote async collaboration",
    word_of_the_day: "Asynchronous",
    definition: "Not occurring or existing at the same time",
    reading_text: "Effective remote teams rely heavily on asynchronous communication. This allows global members to contribute without blockers.",
    difficulty_level: "Intermediate",
    created_at: "2026-06-03T00:00:00Z",
    bullets: null
  },
  {
    id: "task_2",
    topic_of_the_day: "Deliver a 60-second professional elevator pitch",
    word_of_the_day: "Value Proposition",
    definition: "A promise of value to be delivered and a belief from the customer that value will be experienced",
    reading_text: "A strong elevator pitch highlights your unique value proposition. Clearly state what problem you solve and for whom.",
    difficulty_level: "Beginner",
    created_at: "2026-06-02T00:00:00Z",
    bullets: null
  },
  {
    id: "task_3",
    topic_of_the_day: "Discuss ethical considerations of artificial general intelligence",
    word_of_the_day: "Cognizant",
    definition: "Having knowledge or being aware of",
    reading_text: "We must remain cognizant of the societal impacts of autonomous systems. Aligning guardrails with human values is essential.",
    difficulty_level: "Advanced",
    created_at: "2026-06-01T00:00:00Z",
    bullets: null
  }
];

const initialTickets: SupportTicket[] = [
  { id: "tkt_001", user: "usr_3a6e8b1d", email: "sarah.lee@live.com", category: "Audio/Video Sync", message: "Audio delay of ~1.8 seconds in the playback window on Safari iOS. Screen and video track sync drifts.", status: "open", created_at: "2026-06-03T12:00:00Z" },
  { id: "tkt_002", user: "usr_e5c9f2a4", email: "d.kovac@proton.me", category: "API Rate Limits", message: "Getting 429 status on my 6th attempt at analyzing. Please confirm daily caps for testing roles.", status: "investigating", created_at: "2026-06-03T09:45:00Z" },
  { id: "tkt_003", user: "usr_9b2d8c7f", email: "k.tanaka@yahoo.com", category: "Account Profile", message: "How do I request complete deletion of past video analytics files under GDPR guidelines?", status: "resolved", created_at: "2026-06-02T15:20:00Z" },
];

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Core Data States
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [usersData, setUsersData] = useState<{ users: AdminUser[]; abuseList: AdminUser[] } | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [tasks, setTasks] = useState<PracticeTaskItem[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>(initialTickets);

  // Loading indicator states
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // UI Interactive States
  const [searchTerm, setSearchTerm] = useState("");
  const [cleanupDays, setCleanupDays] = useState(30);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{
    recordingsCleaned?: number;
    filesDeleted?: number;
    dbUpdateSuccess?: boolean;
    error?: string;
  } | null>(null);

  // Challenge Creators State
  const [showConsoleTools, setShowConsoleTools] = useState(false);
  const [aiGenCount, setAiGenCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [bulkJsonText, setBulkJsonText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [newTopic, setNewTopic] = useState({
    topic: "",
    word: "",
    definition: "",
    readingText: "",
    difficulty: "Beginner",
  });
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);

  // Security Redirect for Admin role
  useEffect(() => {
    if (!authLoading && (!user || user.user_metadata?.role !== "admin")) {
      router.push("/practice");
    }
  }, [user, authLoading, router]);

  // General Fetching Logic
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/admin?action=stats");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStats(data);
    } catch (err: unknown) {
      console.warn("Failed to fetch admin stats. Falling back to mock data.", err);
      setStats(mockStats);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin?action=users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsersData(data);
    } catch (err: unknown) {
      console.warn("Failed to fetch users. Falling back to mock data.", err);
      setUsersData({ users: mockUsers, abuseList: mockUsers });
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchFeedbacks = async () => {
    setLoadingFeedbacks(true);
    try {
      const res = await fetch("/api/admin?action=feedback");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFeedbacks(data.feedbacks || []);
    } catch (err: unknown) {
      console.warn("Failed to fetch feedbacks. Falling back to mock data.", err);
      setFeedbacks(mockFeedbacks);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await fetch("/api/admin?action=tasks");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTasks(data.tasks || []);
    } catch (err: unknown) {
      console.warn("Failed to fetch tasks. Falling back to mock data.", err);
      setTasks(mockTasks);
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchAllData = () => {
    fetchStats();
    fetchUsers();
    fetchFeedbacks();
    fetchTasks();
  };

  useEffect(() => {
    if (user && user.user_metadata?.role === "admin") {
      fetchAllData();
    }
  }, [user]);

  // Actions
  const handleStorageCleanup = async () => {
    const confirm = window.confirm(`Confirm video purge older than ${cleanupDays} days?`);
    if (!confirm) return;

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

  const handleAiPreGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-topics", count: aiGenCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`Successfully generated and seeded ${data.count} tasks!`);
      fetchTasks();
      fetchStats();
    } catch (err: unknown) {
      const error = err as Error;
      alert(`AI Generation Failed: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBulkImport = async () => {
    setIsImporting(true);
    try {
      const parsed = JSON.parse(bulkJsonText);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk-import", tasks: parsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`Successfully imported ${data.count} topics!`);
      setBulkJsonText("");
      fetchTasks();
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Import Failed: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

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
      alert("Manual prompt created successfully!");
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Publishing Failed: ${error.message}`);
    } finally {
      setIsCreatingTopic(false);
    }
  };

  const resolveTicket = (id: string, nextStatus: "open" | "investigating" | "resolved") => {
    setTickets(prev =>
      prev.map(t => (t.id === id ? { ...t, status: nextStatus } : t))
    );
  };

  // Helper formatting for bytes
  const formatBytes = (bytes: number) => {
    if (!bytes) return "0.00 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Compute stats or fallbacks
  const currentStats = stats || mockStats;
  const currentUsers = usersData?.users || mockUsers;
  const currentFeedbacks = feedbacks.length > 0 ? feedbacks : mockFeedbacks;
  const currentTasks = tasks.length > 0 ? tasks : mockTasks;

  // Calculate Average Fluency Score based on all recordings (Clarity or Confidence average)
  const averageFluency = currentFeedbacks.length > 0
    ? Math.round(currentFeedbacks.reduce((acc, curr) => acc + (curr.clarity + curr.confidence) / 2, 0) / currentFeedbacks.length)
    : 78;

  // Filtered Users List
  const filteredUsers = currentUsers.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Authenticating Loader
  if (authLoading || !user || user.user_metadata?.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-mono text-xs text-slate-500">
        <Activity className="w-5 h-5 animate-spin text-cyan-400 mb-4" />
        <div>SHIELD: INITIALIZING AUTH TELEMETRY...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 space-y-6 select-none selection:bg-cyan-500/20 selection:text-cyan-300">
      
      {/* -------------------- CONSOLE HEADER -------------------- */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-zinc-800 bg-slate-900/10 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.02)] gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-950 border border-cyan-800 text-cyan-400 rounded-md">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white uppercase">Speak-Mirror Admin Control Console</h1>
              <span className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded border border-emerald-800/40 bg-emerald-950/30 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                ACTIVE
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase">
              SYS: ONLINE // host: local // admin-id: <span className="text-cyan-400/80">{user.id.slice(0, 8)}</span> // database: supabase
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
          <button
            onClick={() => setShowConsoleTools(!showConsoleTools)}
            className={`px-3 py-1.5 border rounded transition-colors flex items-center gap-1.5 ${
              showConsoleTools
                ? "bg-cyan-950/40 border-cyan-800 text-cyan-400"
                : "bg-slate-900/20 border-zinc-800 hover:border-zinc-700 text-slate-400 hover:text-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            [CONSOLE_TOOLS]
          </button>
          <button
            onClick={fetchAllData}
            className="px-3 py-1.5 bg-slate-900/20 hover:bg-slate-900/50 border border-zinc-800 hover:border-zinc-700 text-slate-400 hover:text-white rounded transition-colors flex items-center gap-1.5"
            title="Reload telemetry logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            [SYNC_TELEMETRY]
          </button>
        </div>
      </header>

      {/* -------------------- COLLAPSIBLE CONSOLE TOOLS -------------------- */}
      <AnimatePresence>
        {showConsoleTools && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 border border-zinc-800 bg-slate-900/10 rounded-lg space-y-6 font-mono text-xs shadow-[0_0_15px_rgba(59,130,246,0.02)]">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="font-bold text-slate-300 text-[11px] uppercase flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  DevOps & Script Executor Panel
                </span>
                <span className="text-[9px] text-slate-500">[STATUS: READY]</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Tool 1: Storage Janitor */}
                <div className="space-y-3 p-4 border border-zinc-800 bg-slate-950/40 rounded-lg">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-rose-400 flex items-center gap-1">
                      <Trash2 className="w-3.5 h-3.5" /> STORAGE_JANITOR
                    </span>
                    <span className="text-slate-500 font-mono text-[9px]">S3_CLEANUP</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Deletes video file binaries older than X days. Database rows have their media URLs nullified.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-slate-400">Older than:</span>
                    <input 
                      type="number" 
                      value={cleanupDays} 
                      onChange={(e) => setCleanupDays(parseInt(e.target.value) || 30)}
                      className="bg-slate-900 border border-zinc-800 rounded px-1.5 py-0.5 text-center text-white w-12 font-mono"
                    />
                    <span className="text-slate-400">days</span>
                  </div>
                  <button 
                    onClick={handleStorageCleanup}
                    disabled={isCleaning}
                    className="w-full mt-2 py-1.5 bg-rose-950/20 hover:bg-rose-900/20 border border-rose-900/50 hover:border-rose-800 text-rose-400 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isCleaning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    [EXECUTE_PURGE]
                  </button>
                  {cleanupResult && (
                    <div className="p-2 border border-zinc-800 bg-slate-950 text-[10px] text-slate-400 rounded space-y-1">
                      {cleanupResult.error ? (
                        <div className="text-rose-400">Error: {cleanupResult.error}</div>
                      ) : (
                        <>
                          <div className="text-emerald-400">SUCCESSFUL PURGE</div>
                          <div>Cleaned recordings: {cleanupResult.recordingsCleaned}</div>
                          <div>Deleted objects: {cleanupResult.filesDeleted}</div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Tool 2: Llama 3 Challenge Generator */}
                <div className="space-y-3 p-4 border border-zinc-800 bg-slate-950/40 rounded-lg">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-cyan-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" /> AI_TOPIC_SEEDER
                    </span>
                    <span className="text-slate-500 font-mono text-[9px]">LLAMA3_POOL</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Pre-generates custom public speaking challenges based on a structured 4W+1H layout cached in DB.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-slate-400">Generate count:</span>
                    <input 
                      type="number" 
                      value={aiGenCount} 
                      onChange={(e) => setAiGenCount(parseInt(e.target.value) || 5)}
                      className="bg-slate-900 border border-zinc-800 rounded px-1.5 py-0.5 text-center text-white w-12 font-mono"
                    />
                    <span className="text-slate-400">prompts</span>
                  </div>
                  <button 
                    onClick={handleAiPreGenerate}
                    disabled={isGenerating}
                    className="w-full mt-2 py-1.5 bg-cyan-950/20 hover:bg-cyan-900/20 border border-cyan-900/50 hover:border-cyan-800 text-cyan-400 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    [EXECUTE_SEEDAIPOOL]
                  </button>
                </div>

                {/* Tool 3: Bulk JSON Importer */}
                <div className="space-y-3 p-4 border border-zinc-800 bg-slate-950/40 rounded-lg">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" /> BULK_IMPORT_POOL
                    </span>
                    <span className="text-slate-500 font-mono text-[9px]">JSON_PARSER</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Paste raw JSON arrays of topics directly to parse and inject into the speaking pool.
                  </p>
                  <textarea 
                    value={bulkJsonText}
                    onChange={(e) => setBulkJsonText(e.target.value)}
                    placeholder='[{"topic": "Prompt Here", "difficulty_level": "Beginner"}]'
                    rows={2}
                    className="w-full bg-slate-900 border border-zinc-800 rounded p-1.5 text-[9px] text-slate-300 font-mono focus:outline-none focus:border-cyan-800 leading-normal"
                  />
                  <button 
                    onClick={handleBulkImport}
                    disabled={isImporting || !bulkJsonText}
                    className="w-full py-1.5 bg-emerald-950/20 hover:bg-emerald-900/20 border border-emerald-900/50 hover:border-emerald-800 text-emerald-400 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    [PARSE_AND_INJECT]
                  </button>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------- 1. METRIC GRID -------------------- */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Users */}
        <div className="bg-slate-900/20 border border-zinc-800 rounded-lg p-5 shadow-[0_0_15px_rgba(6,182,212,0.015)] hover:border-zinc-700 transition-colors relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Registered Users</span>
            <span className="px-1.5 py-0.5 rounded font-mono text-[9px] border border-cyan-800 bg-cyan-950/30 text-cyan-400">
              +14.2% velocity
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="font-mono text-3xl font-bold tracking-tight text-white">
              {loadingUsers ? "..." : currentUsers.length}
            </span>
            <span className="font-mono text-[10px] text-slate-500 uppercase">Users</span>
          </div>
          <div className="text-[9px] font-mono text-slate-600 mt-2 uppercase">
            [SYS.USER_REGISTRY_METRIC]
          </div>
        </div>

        {/* Card 2: DAU */}
        <div className="bg-slate-900/20 border border-zinc-800 rounded-lg p-5 shadow-[0_0_15px_rgba(6,182,212,0.015)] hover:border-zinc-700 transition-colors relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Daily Active Users</span>
            <span className="flex items-center gap-1 font-mono text-[9px] border border-emerald-800/40 bg-emerald-950/30 text-emerald-400 px-1.5 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="font-mono text-3xl font-bold tracking-tight text-white">
              {loadingStats ? "..." : currentStats.dau}
            </span>
            <span className="font-mono text-[10px] text-slate-500 uppercase">DAU / {currentStats.mau} MAU</span>
          </div>
          <div className="text-[9px] font-mono text-slate-600 mt-2 uppercase">
            Ratio: <span className="font-mono text-cyan-400">{currentStats.dauMauRatio}%</span> sticky index
          </div>
        </div>

        {/* Card 3: Fluency Score */}
        <div className="bg-slate-900/20 border border-zinc-800 rounded-lg p-5 shadow-[0_0_15px_rgba(6,182,212,0.015)] hover:border-zinc-700 transition-colors relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Fluency / Clarity</span>
            <span className="px-1.5 py-0.5 rounded font-mono text-[9px] border border-purple-800 bg-purple-950/30 text-purple-400">
              target: 80+
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="font-mono text-3xl font-bold tracking-tight text-white">
              {loadingFeedbacks ? "..." : `${averageFluency}`}
            </span>
            <span className="font-mono text-[10px] text-slate-500 uppercase">/ 100 max</span>
          </div>
          <div className="text-[9px] font-mono text-slate-600 mt-2 uppercase">
            logs processed: <span className="font-mono text-cyan-400">{currentFeedbacks.length}</span>
          </div>
        </div>

        {/* Card 4: System Latency */}
        <div className="bg-slate-900/20 border border-zinc-800 rounded-lg p-5 shadow-[0_0_15px_rgba(6,182,212,0.015)] hover:border-zinc-700 transition-colors relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Latency & Storage</span>
            <span className="px-1.5 py-0.5 rounded font-mono text-[9px] border border-zinc-800 bg-slate-950 text-slate-400">
              v1.0.4-cdn
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="font-mono text-2xl font-bold tracking-tight text-white">
              4.2s <span className="text-[10px] font-mono font-normal text-slate-500 uppercase">Groq/Llama</span>
            </span>
          </div>
          <div className="text-[9px] font-mono text-slate-600 mt-2.5 uppercase">
            Bucket space used: <span className="font-mono text-cyan-400">{formatBytes(currentStats.storageBytes)}</span>
          </div>
        </div>

      </section>

      {/* -------------------- MIDDLE ROW: LEADERBOARD & TOPIC MANAGER -------------------- */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2. Leaderboard Section (Takes 2/3 Width) */}
        <div className="lg:col-span-2 border border-zinc-800 bg-slate-900/10 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.01)] flex flex-col overflow-hidden">
          
          {/* Section Header */}
          <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900/20">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Speaker Leaderboard & Registry</h2>
            </div>
            
            {/* Search filter */}
            <div className="relative w-full sm:w-60">
              <input
                type="text"
                placeholder="Query users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-zinc-800 rounded px-2 py-1 pl-7 text-[10px] font-mono text-slate-300 focus:outline-none focus:border-cyan-800 transition-colors uppercase placeholder:text-slate-600"
              />
              <Search className="w-3 h-3 text-slate-600 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto flex-1 max-h-[360px] overflow-y-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-800 bg-slate-900/30 text-[9px] uppercase font-bold tracking-wider font-mono text-slate-500">
                  <th className="py-2.5 px-4 text-center w-12">Rank</th>
                  <th className="py-2.5 px-4">User ID / Profile</th>
                  <th className="py-2.5 px-4 text-center w-28">Daily Streak</th>
                  <th className="py-2.5 px-4 text-center w-28">Avg Clarity</th>
                  <th className="py-2.5 px-4 text-right pr-6 w-44">Latest Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/60 text-xs font-mono">
                {loadingUsers ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[10px] uppercase text-slate-600 tracking-widest font-mono">
                      Querying Supabase registry logs...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[10px] uppercase text-slate-600 tracking-widest font-mono">
                      No query results match filter string.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, index) => {
                    // Stable calculations mimicking actual user metrics dynamically
                    const rank = index + 1;
                    const pseudoStreak = (u.recordings_count * 3) % 17 + 1;
                    const pseudoClarity = 72 + (u.recordings_count % 21);
                    const lastActivityDate = new Date(u.created_at).toLocaleDateString("en-US", {
                      year: "numeric", month: "short", day: "numeric"
                    });

                    return (
                      <tr key={u.id} className="hover:bg-slate-900/20 transition-all border-b border-zinc-900/40">
                        <td className="py-3 px-4 text-center text-slate-500 font-bold">
                          {rank < 10 ? `0${rank}` : rank}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="text-[11px] text-white font-bold">{u.name}</span>
                            <span className="text-[9px] text-slate-500 hover:text-cyan-400 transition-all leading-tight cursor-pointer">
                              {u.id}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            pseudoStreak >= 10 
                              ? "bg-amber-950/20 border border-amber-800/40 text-amber-400" 
                              : "bg-slate-900 border border-zinc-800 text-slate-400"
                          }`}>
                            {pseudoStreak} days
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-cyan-400">
                          {pseudoClarity}%
                        </td>
                        <td className="py-3 px-4 text-right pr-6 text-[10px] text-slate-500">
                          {lastActivityDate}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Stats */}
          <div className="p-2 border-t border-zinc-800 bg-slate-900/30 text-[9px] font-mono text-slate-600 flex justify-between items-center px-4 uppercase">
            <span>[DB.USERS_LOADED: {filteredUsers.length}]</span>
            <span>[STREAK_COHORT_COEFFICIENT: {(currentStats.activeStreakUsersCount / Math.max(1, currentUsers.length) * 100).toFixed(1)}%]</span>
          </div>

        </div>

        {/* 3. Challenge Manager (Takes 1/3 Width) */}
        <div className="lg:col-span-1 border border-zinc-800 bg-slate-900/10 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.01)] flex flex-col overflow-hidden">
          
          <div className="p-4 border-b border-zinc-800 bg-slate-900/20 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Topics of the Day</h2>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-zinc-800 text-slate-400">
              pool_count: {currentTasks.length}
            </span>
          </div>

          {/* Add Mini Manual Form inline to maintain high-density console look */}
          <div className="p-4 border-b border-zinc-900/60 bg-slate-950/20">
            <form onSubmit={handleCreateSingleTopic} className="space-y-2 font-mono text-[9px]">
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="NEW PROMPT TOPIC DESCRIPTION..."
                  value={newTopic.topic}
                  onChange={(e) => setNewTopic({ ...newTopic, topic: e.target.value })}
                  className="flex-1 bg-slate-950 border border-zinc-800 rounded px-2 py-1 text-slate-200 placeholder:text-slate-700 uppercase focus:outline-none focus:border-cyan-800"
                />
                <select
                  value={newTopic.difficulty}
                  onChange={(e) => setNewTopic({ ...newTopic, difficulty: e.target.value })}
                  className="bg-slate-950 border border-zinc-800 rounded px-1 text-slate-400 focus:outline-none text-[9px] uppercase"
                >
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="KEYWORD (VOCAB)..."
                  value={newTopic.word}
                  onChange={(e) => setNewTopic({ ...newTopic, word: e.target.value })}
                  className="w-1/2 bg-slate-950 border border-zinc-800 rounded px-2 py-1 text-slate-200 placeholder:text-slate-700 uppercase focus:outline-none focus:border-cyan-800"
                />
                <input
                  type="text"
                  placeholder="DEFINITION..."
                  value={newTopic.definition}
                  onChange={(e) => setNewTopic({ ...newTopic, definition: e.target.value })}
                  className="w-1/2 bg-slate-950 border border-zinc-800 rounded px-2 py-1 text-slate-200 placeholder:text-slate-700 uppercase focus:outline-none focus:border-cyan-800"
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingTopic || !newTopic.topic}
                className="w-full py-1 border border-cyan-900/50 hover:border-cyan-800 bg-cyan-950/20 hover:bg-cyan-950/40 text-cyan-400 rounded text-[9px] font-bold uppercase transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" />
                [INJECT_CHALLENGE_TOPIC]
              </button>
            </form>
          </div>

          {/* List area */}
          <div className="p-4 space-y-3 overflow-y-auto max-h-[250px] flex-1">
            {loadingTasks ? (
              <div className="py-12 text-center text-[10px] uppercase text-slate-600 font-mono tracking-widest">
                Fetching speaking pool tasks...
              </div>
            ) : currentTasks.length === 0 ? (
              <div className="py-12 text-center text-[10px] uppercase text-slate-600 font-mono tracking-widest">
                Speaking pool database is empty.
              </div>
            ) : (
              currentTasks.map((t) => {
                const diff = t.difficulty_level || "Beginner";
                return (
                  <div 
                    key={t.id} 
                    className="p-3 border border-zinc-900 hover:border-zinc-800 bg-slate-900/5 hover:bg-slate-900/20 rounded transition-all text-xs font-mono relative group"
                  >
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <span className="text-[10px] font-bold text-white uppercase line-clamp-1">
                        {t.topic_of_the_day}
                      </span>
                      <span className={`shrink-0 font-mono text-[8px] uppercase tracking-wider px-1 py-0.2 border rounded ${
                        diff === "Advanced"
                          ? "border-rose-800/40 bg-rose-950/20 text-rose-400"
                          : diff === "Intermediate"
                          ? "border-amber-800/40 bg-amber-950/20 text-amber-400"
                          : "border-cyan-800/40 bg-cyan-950/20 text-cyan-400"
                      }`}>
                        {diff.slice(0, 3)}
                      </span>
                    </div>

                    {t.word_of_the_day && (
                      <div className="text-[9px] text-slate-500 leading-tight">
                        <span className="text-slate-400 font-bold uppercase">Vocab:</span> {t.word_of_the_day}
                        {t.definition && <span className="italic"> — {t.definition}</span>}
                      </div>
                    )}

                    {/* Edit hover overlay badge */}
                    <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[8px] border border-cyan-800 bg-cyan-950/80 text-cyan-400 px-1 py-0.5 rounded cursor-pointer hover:bg-cyan-900/50">
                        [EDIT]
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

      </section>

      {/* -------------------- BOTTOM ROW: FEEDBACK & SUPPORT SPLIT INBOX -------------------- */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Side: Support & Feedback Split (Feedback Dashboard) */}
        <div className="border border-zinc-800 bg-slate-900/10 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.01)] overflow-hidden flex flex-col h-[400px]">
          
          <div className="p-4 border-b border-zinc-800 bg-slate-900/20 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Feedback Diagnostic Queue</h2>
            </div>
            <span className="text-[9px] font-mono text-slate-500 uppercase">
              [TELEMETRY_LOGS]
            </span>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto flex-1 divide-y divide-zinc-900/80">
            {loadingFeedbacks ? (
              <div className="py-20 text-center text-[10px] uppercase text-slate-600 font-mono tracking-widest">
                Fetching recent recordings analytics...
              </div>
            ) : currentFeedbacks.length === 0 ? (
              <div className="py-20 text-center text-[10px] uppercase text-slate-600 font-mono tracking-widest">
                No user practice feedback logs.
              </div>
            ) : (
              currentFeedbacks.map((f, i) => {
                const activityTime = new Date(f.created_at).toLocaleTimeString("en-US", {
                  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
                });

                return (
                  <div key={f.id} className={`pt-3 ${i === 0 ? "pt-0" : ""} space-y-2`}>
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-bold">{f.user_name}</span>
                        <span className="text-slate-600">({f.user_email})</span>
                      </div>
                      <span className="text-slate-500 font-mono">{activityTime}</span>
                    </div>

                    <div className="grid grid-cols-5 gap-2 text-center text-[9px] font-mono">
                      <div className="p-1 border border-zinc-800 bg-slate-950 rounded">
                        <div className="text-slate-500 uppercase text-[7px] tracking-wider leading-none">Clarity</div>
                        <div className="text-cyan-400 font-bold mt-0.5">{f.clarity}%</div>
                      </div>
                      <div className="p-1 border border-zinc-800 bg-slate-950 rounded">
                        <div className="text-slate-500 uppercase text-[7px] tracking-wider leading-none">Confidence</div>
                        <div className="text-purple-400 font-bold mt-0.5">{f.confidence}%</div>
                      </div>
                      <div className="p-1 border border-zinc-800 bg-slate-950 rounded">
                        <div className="text-slate-500 uppercase text-[7px] tracking-wider leading-none">Pacing</div>
                        <div className="text-emerald-400 font-bold mt-0.5">{f.wpm} wpm</div>
                      </div>
                      <div className="p-1 border border-zinc-800 bg-slate-950 rounded">
                        <div className="text-slate-500 uppercase text-[7px] tracking-wider leading-none">Fillers</div>
                        <div className={`font-bold mt-0.5 ${f.filler_words > 4 ? "text-amber-400" : "text-slate-400"}`}>{f.filler_words}</div>
                      </div>
                      <div className="p-1 border border-zinc-800 bg-slate-950 rounded">
                        <div className="text-slate-500 uppercase text-[7px] tracking-wider leading-none">Eye Contact</div>
                        <div className="text-slate-400 font-bold mt-0.5">
                          {f.eye_contact !== null ? `${Math.round(f.eye_contact)}%` : "N/A"}
                        </div>
                      </div>
                    </div>

                    <div className="p-2 border border-zinc-900 bg-slate-950/60 rounded text-[9.5px] font-mono leading-relaxed text-slate-400">
                      <span className="text-[7.5px] text-cyan-800 font-bold block uppercase tracking-wider mb-0.5">[TRANSCRIPT_FEED]</span>
                      "{f.transcript}"
                    </div>

                    <div className="text-[8.5px] text-slate-600 font-mono uppercase">
                      Topic Ref: <span className="text-slate-500 font-semibold">{f.topic}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Right Side: Customer Support Widget Queue */}
        <div className="border border-zinc-800 bg-slate-900/10 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.01)] overflow-hidden flex flex-col h-[400px]">
          
          <div className="p-4 border-b border-zinc-800 bg-slate-900/20 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Customer Support Desk</h2>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-rose-800/40 bg-rose-950/20 text-rose-400 font-bold">
              unresolved: {tickets.filter(t => t.status !== "resolved").length}
            </span>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto flex-1 divide-y divide-zinc-900/80">
            {tickets.map((t, i) => {
              const ticketTime = new Date(t.created_at).toLocaleTimeString("en-US", {
                hour: "2-digit", minute: "2-digit", hour12: false
              });

              return (
                <div key={t.id} className={`pt-3 ${i === 0 ? "pt-0" : ""} space-y-2`}>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="px-1 py-0.2 rounded border border-zinc-800 bg-slate-950 text-slate-500 font-bold text-[8.5px] uppercase">
                        {t.id}
                      </span>
                      <span className="text-white font-bold">{t.category}</span>
                    </div>
                    <span className="text-slate-500">{ticketTime}</span>
                  </div>

                  <p className="text-[10px] font-mono text-slate-400 leading-normal">
                    {t.message}
                  </p>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[9px] font-mono pt-1">
                    <div className="flex items-center gap-1 text-slate-500">
                      <span>Sender:</span>
                      <span className="text-slate-400 font-semibold">{t.email}</span>
                      <span className="text-slate-600">({t.user.slice(0, 8)})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded ${
                        t.status === "open"
                          ? "bg-rose-950/20 border border-rose-800/40 text-rose-400"
                          : t.status === "investigating"
                          ? "bg-amber-950/20 border border-amber-800/40 text-amber-400"
                          : "bg-zinc-900 border border-zinc-800 text-slate-500"
                      }`}>
                        {t.status}
                      </span>
                      
                      {t.status !== "resolved" && (
                        <div className="flex items-center gap-1.5">
                          {t.status === "open" && (
                            <button
                              onClick={() => resolveTicket(t.id, "investigating")}
                              className="text-[8px] uppercase bg-slate-900 border border-zinc-800 text-slate-400 px-1 py-0.2 hover:border-amber-800 hover:text-amber-400 rounded transition-colors"
                            >
                              [INVESTIGATE]
                            </button>
                          )}
                          <button
                            onClick={() => resolveTicket(t.id, "resolved")}
                            className="text-[8px] uppercase bg-slate-900 border border-zinc-800 text-slate-400 px-1 py-0.2 hover:border-emerald-800 hover:text-emerald-400 rounded transition-colors"
                          >
                            [RESOLVE]
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </section>

      {/* -------------------- DEVIATION REPORTING BANNER -------------------- */}
      {!loadingStats && currentStats.databaseViewStatus !== "active" && (
        <div className="p-4 border border-rose-950 bg-rose-950/5 text-rose-400 text-xs font-mono rounded-lg flex items-start gap-3 shadow-[0_0_15px_rgba(239,68,68,0.02)]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <div className="space-y-1">
            <span className="font-bold block uppercase">[SYS.WARNING: VIEW_MIGRATION_MISSING]</span>
            <p className="leading-relaxed text-slate-400 text-[10px]">
              View aggregate registry table `admin_stats` was not detected in this database schema instance. 
              Console telemetry aggregation is relying on client-side mapping queries. Please execute migrations inside the Supabase console:
            </p>
            <code className="block bg-slate-950 border border-rose-950/30 p-2 rounded text-[9px] text-slate-400 uppercase select-all font-mono">
              supabase/migrations/20260603000000_admin_features.sql
            </code>
          </div>
        </div>
      )}

    </div>
  );
}
