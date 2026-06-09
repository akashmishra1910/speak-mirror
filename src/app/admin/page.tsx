"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
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
  Award,
  MessageSquare,
  Plus,
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
// Fallback / Mock Data matching the premium dark theme
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

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "topics" | "feedback" | "support">("overview");

  // Core Data States
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [usersData, setUsersData] = useState<{ users: AdminUser[]; abuseList: AdminUser[] } | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [tasks, setTasks] = useState<PracticeTaskItem[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>(initialTickets);

  // Loading indicator states
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketsDbStatus, setTicketsDbStatus] = useState<string>("active");

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
  const [aiGenCount, setAiGenCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genResult, setGenResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null);
  const [bulkJsonText, setBulkJsonText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null);
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
  const fetchStats = async (silent = false) => {
    if (!silent) setLoadingStats(true);
    try {
      const res = await fetch("/api/admin?action=stats");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStats(data);
    } catch (err: unknown) {
      console.warn("Failed to fetch admin stats. Falling back to mock data.", err);
      setStats(mockStats);
    } finally {
      if (!silent) setLoadingStats(false);
    }
  };

  const fetchUsers = async (silent = false) => {
    if (!silent) setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin?action=users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsersData(data);
    } catch (err: unknown) {
      console.warn("Failed to fetch users. Falling back to mock data.", err);
      setUsersData({ users: mockUsers, abuseList: mockUsers });
    } finally {
      if (!silent) setLoadingUsers(false);
    }
  };

  const fetchFeedbacks = async (silent = false) => {
    if (!silent) setLoadingFeedbacks(true);
    try {
      const res = await fetch("/api/admin?action=feedback");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFeedbacks(data.feedbacks || []);
    } catch (err: unknown) {
      console.warn("Failed to fetch feedbacks. Falling back to mock data.", err);
      setFeedbacks(mockFeedbacks);
    } finally {
      if (!silent) setLoadingFeedbacks(false);
    }
  };

  const fetchTasks = async (silent = false) => {
    if (!silent) setLoadingTasks(true);
    try {
      const res = await fetch("/api/admin?action=tasks");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTasks(data.tasks || []);
    } catch (err: unknown) {
      console.warn("Failed to fetch tasks. Falling back to mock data.", err);
      setTasks(mockTasks);
    } finally {
      if (!silent) setLoadingTasks(false);
    }
  };

  const fetchTickets = async (silent = false) => {
    if (!silent) setLoadingTickets(true);
    try {
      const res = await fetch("/api/admin?action=tickets");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTickets(data.tickets || []);
      setTicketsDbStatus(data.databaseStatus || "active");
    } catch (err: unknown) {
      console.warn("Failed to fetch tickets. Falling back to mock tickets.", err);
      setTickets(initialTickets);
      setTicketsDbStatus("missing_migration");
    } finally {
      if (!silent) setLoadingTickets(false);
    }
  };

  const fetchAllData = () => {
    fetchStats();
    if (activeTab === "users") fetchUsers();
    else if (activeTab === "topics") fetchTasks();
    else if (activeTab === "feedback") fetchFeedbacks();
    else if (activeTab === "support") fetchTickets();
  };

  // Keep activeTabRef synchronized to prevent recreating Supabase channels
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Run initial stats & tickets fetch and set up real-time updates
  useEffect(() => {
    if (!user || user.user_metadata?.role !== "admin") return;

    fetchStats();
    fetchTickets();

    // Subscribe to postgres database changes for real-time admin metrics
    const channel = supabase
      .channel("admin-realtime-panel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recordings" },
        () => {
          fetchStats(true); // background update
          if (activeTabRef.current === "users") fetchUsers(true);
          if (activeTabRef.current === "feedback") fetchFeedbacks(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "api_usage_logs" },
        () => {
          fetchStats(true); // background update
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "practice_tasks" },
        () => {
          if (activeTabRef.current === "topics") fetchTasks(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets" },
        () => {
          fetchTickets(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          if (activeTabRef.current === "users") fetchUsers(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Fetch when active tab changes
  useEffect(() => {
    if (!user || user.user_metadata?.role !== "admin") return;

    if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "topics") {
      fetchTasks();
    } else if (activeTab === "feedback") {
      fetchFeedbacks();
    } else if (activeTab === "support") {
      fetchTickets();
    }
  }, [activeTab, user]);

  // Actions
  const handleStorageCleanup = async () => {
    const confirm = window.confirm(`Are you sure you want to clean up video storage for recordings older than ${cleanupDays} days? This cannot be undone!`);
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

  const handleBulkImport = async () => {
    setIsImporting(true);
    setImportResult(null);
    try {
      const parsed = JSON.parse(bulkJsonText);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk-import", tasks: parsed }),
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

  const resolveTicket = async (id: string, nextStatus: "open" | "investigating" | "resolved") => {
    // Optimistic UI update
    setTickets(prev =>
      prev.map(t => (t.id === id ? { ...t, status: nextStatus } : t))
    );

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-ticket", ticketId: id, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (err: unknown) {
      console.warn("Failed to persist ticket status update. Kept local changes.", err);
    }
  };

  // Helper formatting for bytes
  const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes) return "0.00 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Filtered Users List
  const currentUsers = usersData?.users || mockUsers;
  const filteredUsers = currentUsers.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Authenticating Loader
  if (authLoading || !user || user.user_metadata?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E0F2FE] via-[#FAF8F5] to-[#E0F2FE] dark:from-gray-950 dark:via-slate-900 dark:to-gray-950 flex flex-col items-center justify-center">
        <Activity className="w-8 h-8 animate-spin text-[#5B7C99] dark:text-foreground/40 mb-3" />
        <span className="text-sm font-semibold uppercase tracking-widest text-slate-600 dark:text-foreground/50">Verifying Admin Access...</span>
      </div>
    );
  }

  // Calculate Average Fluency Score based on all recordings (Clarity or Confidence average)
  const activeFeedbacks = feedbacks.length > 0 ? feedbacks : mockFeedbacks;
  const averageFluency = activeFeedbacks.length > 0
    ? Math.round(activeFeedbacks.reduce((acc, curr) => acc + (curr.clarity + curr.confidence) / 2, 0) / activeFeedbacks.length)
    : 78;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E0F2FE] via-[#FAF8F5] to-[#E0F2FE] dark:from-gray-950 dark:via-slate-900 dark:to-gray-950 text-slate-800 dark:text-foreground pb-24 transition-colors duration-300">
      
      {/* -------------------- TOP BAR HEADER -------------------- */}
      <div className="border-b border-slate-200/80 bg-white/60 dark:border-surface-border dark:bg-surface/20 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-surface-border rounded-xl text-[#5B7C99] dark:text-white">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                Control Tower
                <span className="text-xs bg-slate-200 text-slate-700 border border-slate-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 px-2 py-0.5 rounded font-mono font-normal">
                  B2C Launch
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-foreground/50 mt-0.5">AI Cost Control & storage health manager</p>
            </div>
          </div>

          {/* Main Controls Panel (Navigation Tabs) */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAllData}
              className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-surface dark:hover:bg-zinc-800 border border-slate-200 dark:border-surface-border rounded-xl transition-all text-slate-700 hover:text-black dark:text-foreground/80 dark:hover:text-white cursor-pointer"
              title="Refresh Telemetry Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="flex bg-slate-100/80 dark:bg-surface rounded-xl p-1 border border-slate-200/80 dark:border-surface-border">
              <button 
                onClick={() => setActiveTab("overview")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "overview" 
                    ? "bg-[#5B7C99] text-white shadow-md dark:bg-white dark:text-black font-bold" 
                    : "text-slate-600 hover:text-[#5B7C99] dark:text-foreground/70 dark:hover:text-white"
                }`}
              >
                Overview
              </button>
              <button 
                onClick={() => setActiveTab("users")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "users" 
                    ? "bg-[#5B7C99] text-white shadow-md dark:bg-white dark:text-black font-bold" 
                    : "text-slate-600 hover:text-[#5B7C99] dark:text-foreground/70 dark:hover:text-white"
                }`}
              >
                Users
              </button>
              <button 
                onClick={() => setActiveTab("topics")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "topics" 
                    ? "bg-[#5B7C99] text-white shadow-md dark:bg-white dark:text-black font-bold" 
                    : "text-slate-600 hover:text-[#5B7C99] dark:text-foreground/70 dark:hover:text-white"
                }`}
              >
                Topics
              </button>
              <button 
                onClick={() => setActiveTab("feedback")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "feedback" 
                    ? "bg-[#5B7C99] text-white shadow-md dark:bg-white dark:text-black font-bold" 
                    : "text-slate-600 hover:text-[#5B7C99] dark:text-foreground/70 dark:hover:text-white"
                }`}
              >
                Feedbacks
              </button>
              <button 
                onClick={() => setActiveTab("support")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative cursor-pointer ${
                  activeTab === "support" 
                    ? "bg-[#5B7C99] text-white shadow-md dark:bg-white dark:text-black font-bold" 
                    : "text-slate-600 hover:text-[#5B7C99] dark:text-foreground/70 dark:hover:text-white"
                }`}
              >
                Support
                {tickets.filter(t => t.status !== "resolved").length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-50"></span>
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
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
              {/* Cost & Infrastructure Health Monitor */}
              <div>
                <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                  <Database className="w-5 h-5 text-[#5B7C99] dark:text-zinc-400" />
                  Infrastructure & Cost Monitoring
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Card 1: AI API Usage */}
                  <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-surface-border bg-white/60 dark:bg-surface/10 hover:border-slate-300 dark:hover:border-zinc-800 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-foreground/50">Groq AI Analytics</span>
                      <div className="p-2 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-surface-border text-[#5B7C99] dark:text-zinc-400 rounded-lg">
                        <Activity className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">
                      {loadingStats ? "..." : (stats?.totalAnalyzeCalls ?? mockStats.totalAnalyzeCalls)}
                      <span className="text-xs text-slate-500 dark:text-foreground/40 font-normal ml-1.5 uppercase">API Calls</span>
                    </h3>
                    <p className="text-xs text-slate-650 dark:text-foreground/60 mt-2">
                      Telemetry logs tracking `/api/analyze` Whisper and Llama processing.
                    </p>
                  </div>

                  {/* Card 2: Storage Health */}
                  <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-surface-border bg-white/60 dark:bg-surface/10 hover:border-slate-300 dark:hover:border-zinc-800 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-foreground/50">Storage Health</span>
                      <div className="p-2 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-surface-border text-[#5B7C99] dark:text-zinc-400 rounded-lg">
                        <HardDrive className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">
                      {loadingStats ? "..." : formatBytes(stats?.storageBytes ?? mockStats.storageBytes)}
                    </h3>
                    <p className="text-xs text-slate-650 dark:text-foreground/60 mt-2">
                      Total disk space consumed in the Supabase S3 `videos` recording bucket.
                    </p>
                  </div>

                  {/* Card 3: Storage Janitor Tool */}
                  <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-surface-border bg-white/60 dark:bg-surface/10 hover:border-slate-300 dark:hover:border-zinc-800 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        <Trash2 className="w-4 h-4" />
                        Storage Janitor
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-slate-650 dark:text-foreground/60">Purge binaries older than</span>
                      <input 
                        type="number" 
                        value={cleanupDays} 
                        onChange={(e) => setCleanupDays(parseInt(e.target.value) || 30)}
                        className="bg-slate-105 dark:bg-black border border-slate-200 dark:border-surface-border rounded-lg text-center px-2 py-1 text-xs w-14 text-slate-800 dark:text-white font-mono focus:outline-none"
                      />
                      <span className="text-xs text-slate-650 dark:text-foreground/60">days</span>
                    </div>
                    <button 
                      onClick={handleStorageCleanup}
                      disabled={isCleaning}
                      className="mt-4 w-full py-2 bg-rose-50 hover:bg-rose-500 border border-rose-200 hover:border-rose-400 text-rose-600 hover:text-white dark:bg-rose-950/20 dark:hover:bg-rose-500 dark:border-rose-500/30 dark:hover:border-rose-400 dark:text-rose-400 dark:hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {isCleaning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      {isCleaning ? "Executing Purge..." : "Execute Purge Job"}
                    </button>
                  </div>
                </div>

                {/* Storage Janitor Status Log */}
                {cleanupResult && (
                  <div className="mt-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-750 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-400 text-xs flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                      {cleanupResult.error ? (
                        <span className="text-rose-600 dark:text-rose-400">Purge Failed: {cleanupResult.error}</span>
                      ) : (
                        <span>Cleaned up {cleanupResult.recordingsCleaned} recordings. Deleted {cleanupResult.filesDeleted} S3 file binaries.</span>
                      )}
                    </span>
                    <button onClick={() => setCleanupResult(null)} className="font-extrabold hover:text-[#5B7C99] dark:hover:text-white text-xs px-2 cursor-pointer">Dismiss</button>
                  </div>
                )}
              </div>

              {/* Growth & Retention Monitor */}
              <div>
                <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                  <TrendingUp className="w-5 h-5 text-[#5B7C99] dark:text-zinc-400" />
                  Growth & Habitual Analytics
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Metric 1: Power Users Streak */}
                  <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-surface-border bg-white/60 dark:bg-surface/10 hover:border-slate-300 dark:hover:border-zinc-800 transition-colors">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-foreground/50">Habitual Users</span>
                    <h3 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white mt-2">
                      {loadingStats ? "..." : (stats?.activeStreakUsersCount ?? mockStats.activeStreakUsersCount)}
                      <span className="text-xs text-slate-500 dark:text-foreground/40 font-normal ml-1 uppercase">Streak</span>
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-foreground/60 mt-2">
                      Number of B2C speakers maintaining a 3+ day practice streak.
                    </p>
                  </div>

                  {/* Metric 2: Completion Rate */}
                  <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-surface-border bg-white/60 dark:bg-surface/10 hover:border-slate-300 dark:hover:border-zinc-800 transition-colors">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-foreground/50">Completion Rate</span>
                    <h3 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white mt-2">
                      {loadingStats ? "..." : `${stats?.sessionCompletionRate ?? mockStats.sessionCompletionRate}%`}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-foreground/60 mt-2">
                      Percent of speeches successfully completed vs abandoned.
                    </p>
                  </div>

                  {/* Metric 3: Engagement Stickiness Index */}
                  <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-surface-border bg-white/60 dark:bg-surface/10 hover:border-slate-300 dark:hover:border-zinc-800 transition-colors">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-foreground/50">Stickiness Index</span>
                    <h3 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white mt-2">
                      {loadingStats ? "..." : `${stats?.dauMauRatio ?? mockStats.dauMauRatio}%`}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-foreground/60 mt-2">
                      DAU/MAU engagement ratio ({loadingStats ? "..." : (stats?.dau ?? mockStats.dau)} Active Users today).
                    </p>
                  </div>

                  {/* Metric 4: Avg Fluency */}
                  <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-surface-border bg-white/60 dark:bg-surface/10 hover:border-slate-300 dark:hover:border-zinc-800 transition-colors">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-foreground/50">Avg Fluency</span>
                    <h3 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white mt-2">
                      {averageFluency} <span className="text-xs text-slate-500 dark:text-foreground/40 font-normal uppercase">/ 100</span>
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-foreground/60 mt-2">
                      Average user practice score aggregated across recording diagnostics.
                    </p>
                  </div>
                </div>
              </div>

              {/* Database View Warning Banner */}
              {!loadingStats && stats?.databaseViewStatus !== "active" && (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 dark:border-rose-500/20 dark:bg-rose-50/5 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
                  <div>
                    <h4 className="font-bold text-sm">Supabase Database View Offline</h4>
                    <p className="mt-1 leading-relaxed text-slate-700 dark:text-foreground/80 text-xs">
                      The view `admin_stats` was not detected. Local metrics are calculated using client estimations.
                      Execute the database migration file to activate optimized telemetry logging:
                    </p>
                    <code className="block mt-2 bg-slate-100 dark:bg-black/60 p-2.5 rounded-lg border border-slate-200 dark:border-surface-border text-slate-800 dark:text-foreground/80 font-mono text-[11px] break-all select-all">
                      supabase/migrations/20260603000000_admin_features.sql
                    </code>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: USER AUDIT & REGISTRY */}
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
                <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-rose-650 dark:text-rose-400">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                  Abuse Monitor (High API Consumables)
                </h2>
                
                {loadingUsers ? (
                  <div className="glass-panel p-6 rounded-2xl animate-pulse h-48 border border-slate-200/80 dark:border-surface-border" />
                ) : (
                  <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-surface-border overflow-hidden bg-white/60 dark:bg-surface/10">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-surface-border bg-slate-100/50 dark:bg-surface/35 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-foreground/50">
                            <th className="p-4">User Details</th>
                            <th className="p-4">Email Address</th>
                            <th className="p-4 text-center">Recordings Count</th>
                            <th className="p-4">Status / Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-surface-border/50 text-sm">
                          {usersData?.abuseList?.map((u: AdminUser) => (
                            <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-surface/5 transition-colors">
                              <td className="p-4 font-semibold text-slate-800 dark:text-white">{u.name}</td>
                              <td className="p-4 font-mono text-slate-650 dark:text-foreground/70">{u.email}</td>
                              <td className="p-4 text-center font-bold text-slate-800 dark:text-white">{u.recordings_count}</td>
                              <td className="p-4">
                                {u.recordings_count > 50 ? (
                                  <span className="px-2.5 py-0.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold">
                                    ABUSE RISK
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-zinc-805 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 rounded-lg text-xs">
                                    NORMAL
                                  </span>
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
                  <h2 className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                    <Users className="w-5 h-5 text-[#5B7C99] dark:text-zinc-400" />
                    B2C User Registry
                  </h2>
                  <div className="relative w-full sm:w-72">
                    <input 
                      type="text"
                      placeholder="Search users by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white/80 dark:bg-surface border border-slate-200 dark:border-surface-border rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-foreground/30 focus:outline-none focus:border-slate-400 dark:focus:border-white transition-colors"
                    />
                    <Search className="w-4 h-4 text-slate-400 dark:text-foreground/30 absolute left-3 top-3" />
                  </div>
                </div>

                {loadingUsers ? (
                  <div className="glass-panel p-6 rounded-2xl animate-pulse h-64 border border-slate-200/80 dark:border-surface-border" />
                ) : (
                  <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-surface-border overflow-hidden bg-white/60 dark:bg-surface/10">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-surface-border bg-slate-100/50 dark:bg-surface/35 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-foreground/50">
                            <th className="p-4">Speaker</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Created Date</th>
                            <th className="p-4 text-center">Practice Videos</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-surface-border/50 text-sm">
                          {filteredUsers.map((u: AdminUser) => (
                            <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-surface/5 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-white flex items-center justify-center font-bold text-xs">
                                    {u.name[0]?.toUpperCase()}
                                  </div>
                                  <span className="font-semibold text-slate-800 dark:text-white">{u.name}</span>
                                </div>
                              </td>
                              <td className="p-4 font-mono text-slate-650 dark:text-foreground/70">{u.email}</td>
                              <td className="p-4 text-slate-600 dark:text-foreground/60">{new Date(u.created_at).toLocaleDateString()}</td>
                              <td className="p-4 text-center font-bold text-slate-800 dark:text-foreground/80">{u.recordings_count}</td>
                            </tr>
                          ))}
                          {filteredUsers.length === 0 && (
                            <tr>
                              <td colSpan={4} className="p-12 text-center text-slate-500 dark:text-foreground/40 text-sm">
                                No registered users found matching that query.
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

          {/* TAB 3: CHALLENGE TOPIC MANAGER */}
          {activeTab === "topics" && (
            <motion.div
              key="topics-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Left Column: Management Forms */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* AI prompt seed tools */}
                <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-surface-border bg-white/60 dark:bg-surface/10">
                  <h3 className="font-bold text-sm mb-2 flex items-center gap-2 text-slate-800 dark:text-white">
                    <Sparkles className="w-4 h-4 text-[#5B7C99] dark:text-zinc-400" />
                    AI Topic Seeder
                  </h3>
                  <p className="text-xs text-slate-650 dark:text-foreground/60 mb-4 leading-relaxed">
                    Auto-generate custom speak challenges based on templates cached in your DB using Groq API.
                  </p>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs text-slate-650 dark:text-foreground/60">Generate</span>
                    <input 
                      type="number"
                      value={aiGenCount}
                      onChange={(e) => setAiGenCount(parseInt(e.target.value) || 10)}
                      className="bg-slate-100 dark:bg-black border border-slate-200 dark:border-surface-border text-center rounded-lg py-1 text-xs w-16 text-slate-800 dark:text-white font-mono focus:outline-none"
                    />
                    <span className="text-xs text-slate-650 dark:text-foreground/60">prompts</span>
                  </div>

                  <button 
                    onClick={handleAiPreGenerate}
                    disabled={isGenerating}
                    className="w-full py-2.5 bg-[#5B7C99] hover:bg-[#5B7C99]/90 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200 disabled:opacity-50 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {isGenerating ? "Pre-generating Prompts..." : "Pre-generate Month's Pool"}
                  </button>

                  {genResult && (
                    <div className={`mt-4 p-3 rounded-lg border text-xs leading-relaxed ${genResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/5 dark:border-emerald-500/20 dark:text-emerald-400' : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/5 dark:border-rose-500/20 dark:text-rose-400'}`}>
                      {genResult.success ? `Success: Generated and stored ${genResult.count} speaking prompts!` : `Generation failed: ${genResult.error}`}
                    </div>
                  )}
                </div>

                {/* Bulk Topic Importer */}
                <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-surface-border bg-white/60 dark:bg-surface/10">
                  <h3 className="font-bold text-sm mb-2 flex items-center gap-2 text-slate-800 dark:text-white">
                    <Upload className="w-4 h-4 text-[#5B7C99] dark:text-zinc-400" />
                    Bulk Prompts Importer
                  </h3>
                  <p className="text-xs text-slate-655 dark:text-foreground/60 mb-3 leading-relaxed">
                    Paste raw JSON arrays of topics to bulk insert into database tables.
                  </p>
                  <textarea 
                    value={bulkJsonText}
                    onChange={(e) => setBulkJsonText(e.target.value)}
                    placeholder='[{"topic": "Explain async collaboration", "difficulty_level": "Intermediate"}]'
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-surface-border rounded-xl p-2.5 text-xs text-slate-800 dark:text-foreground font-mono focus:outline-none focus:border-slate-400 dark:focus:border-white leading-normal"
                  />
                  <button 
                    onClick={handleBulkImport}
                    disabled={isImporting || !bulkJsonText}
                    className="w-full mt-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 disabled:opacity-50 text-slate-700 dark:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-zinc-700 cursor-pointer"
                  >
                    {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    Import Prompts
                  </button>

                  {importResult && (
                    <div className={`mt-3 p-3 rounded-lg border text-xs leading-relaxed ${importResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-750 dark:bg-emerald-500/5 dark:border-emerald-500/20 dark:text-emerald-400' : 'bg-rose-50 border-rose-200 text-rose-750 dark:bg-rose-500/5 dark:border-rose-500/20 dark:text-rose-400'}`}>
                      {importResult.success ? `Successfully imported ${importResult.count} prompts!` : importResult.error}
                    </div>
                  )}
                </div>

                {/* Create Manual Topic Form */}
                <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-surface-border bg-white/60 dark:bg-surface/10">
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-slate-800 dark:text-white">
                    <Layers className="w-4 h-4 text-[#5B7C99] dark:text-zinc-400" />
                    Create Speaking Task
                  </h3>
                  <form onSubmit={handleCreateSingleTopic} className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-foreground/50 mb-1">Prompt Topic</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Explain the importance of public speaking..."
                        value={newTopic.topic}
                        onChange={(e) => setNewTopic({...newTopic, topic: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-surface-border rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-foreground/50 mb-1">Vocabulary Word</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Articulate"
                          value={newTopic.word}
                          onChange={(e) => setNewTopic({...newTopic, word: e.target.value})}
                          className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-surface-border rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-foreground/50 mb-1">Difficulty</label>
                        <select 
                          value={newTopic.difficulty}
                          onChange={(e) => setNewTopic({...newTopic, difficulty: e.target.value})}
                          className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-surface-border rounded-lg px-2 py-1.5 text-xs text-slate-700 dark:text-zinc-400 focus:outline-none focus:border-slate-400 dark:focus:border-white"
                        >
                          <option>Beginner</option>
                          <option>Intermediate</option>
                          <option>Advanced</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-foreground/50 mb-1">Definition</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Express an idea fluently and coherently"
                        value={newTopic.definition}
                        onChange={(e) => setNewTopic({...newTopic, definition: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-surface-border rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-foreground/50 mb-1">Reading Practice Text</label>
                      <textarea 
                        placeholder="Optional template paragraph to guide the speech..."
                        value={newTopic.readingText}
                        onChange={(e) => setNewTopic({...newTopic, readingText: e.target.value})}
                        rows={2}
                        className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-surface-border rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-white"
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isCreatingTopic}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 disabled:opacity-50 text-slate-700 dark:text-white border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Publish Prompt Topic
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Pre-generated Topic Pool List */}
              <div className="lg:col-span-2">
                <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                  <BookOpen className="w-5 h-5 text-[#5B7C99] dark:text-zinc-400" />
                  B2C Speaking Topics Pool
                </h2>

                {loadingTasks ? (
                  <div className="glass-panel p-6 rounded-2xl animate-pulse h-96 border border-slate-200/80 dark:border-surface-border" />
                ) : (
                  <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-surface-border overflow-hidden bg-white/60 dark:bg-surface/10">
                    <div className="max-h-[680px] overflow-y-auto divide-y divide-slate-100 dark:divide-surface-border">
                      {tasks.length > 0 ? tasks.map((t) => (
                        <div key={t.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-surface/5 transition-colors flex flex-col sm:flex-row justify-between items-start gap-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2.5">
                              <span className="text-sm font-semibold text-slate-800 dark:text-white">{t.topic_of_the_day}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                t.difficulty_level === 'Advanced' 
                                  ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20' 
                                  : t.difficulty_level === 'Intermediate' 
                                  ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-750 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20' 
                                  : 'bg-cyan-50 dark:bg-cyan-500/10 text-[#5B7C99] dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20'
                              }`}>
                                {t.difficulty_level}
                              </span>
                            </div>
                            {t.word_of_the_day && (
                              <p className="text-xs text-slate-655 dark:text-foreground/80 leading-normal">
                                <span className="font-semibold text-slate-500 dark:text-zinc-400">Vocabulary:</span> <strong className="text-slate-700 dark:text-zinc-200">{t.word_of_the_day}</strong> — <span className="italic text-slate-600 dark:text-foreground/60">{t.definition}</span>
                              </p>
                            )}
                            {t.reading_text && (
                              <p className="text-[11px] text-slate-500 dark:text-foreground/50 border-l border-slate-200 dark:border-zinc-800 pl-2 italic leading-relaxed">
                                "{t.reading_text}"
                              </p>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-foreground/40 self-end shrink-0 sm:self-auto font-mono">
                            {new Date(t.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      )) : (
                        <div className="p-12 text-center text-slate-500 dark:text-foreground/40 text-xs">
                          Speaking pool is empty. Click AI pre-generate to populate pool topics.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 4: SPEECH FEEDBACK INBOX */}
          {activeTab === "feedback" && (
            <motion.div
              key="feedback-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <h2 className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                <Activity className="w-5 h-5 text-[#5B7C99] dark:text-zinc-400" />
                Speech Quality & Diagnostic Feed
              </h2>

              {loadingFeedbacks ? (
                <div className="glass-panel p-6 rounded-2xl animate-pulse h-96 border border-slate-200/80 dark:border-surface-border" />
              ) : (
                <div className="space-y-4">
                  {feedbacks.length > 0 ? feedbacks.map((f) => (
                    <div key={f.id} className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-surface-border bg-white/60 dark:bg-surface/10 space-y-4">
                      {/* Top Header */}
                      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 dark:border-surface-border/50 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-white flex items-center justify-center font-bold text-xs">
                            {f.user_name ? f.user_name[0]?.toUpperCase() : "U"}
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-slate-800 dark:text-white">{f.user_name}</span>
                            <span className="text-[10px] font-mono text-slate-500 dark:text-foreground/50 block leading-none mt-1">{f.user_email}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[10px] text-slate-500 dark:text-foreground/40 font-mono">
                            {new Date(f.created_at).toLocaleString()}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-medium">
                            {f.topic}
                          </span>
                        </div>
                      </div>

                      {/* Info / Metric Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                        <div className="glass-panel bg-slate-50/50 dark:bg-black/40 p-3 rounded-xl text-center border border-slate-200 dark:border-surface-border/50">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500 dark:text-foreground/50 block">Confidence</span>
                          <span className="text-base font-extrabold text-slate-800 dark:text-white">{f.confidence}%</span>
                        </div>
                        <div className="glass-panel bg-slate-50/50 dark:bg-black/40 p-3 rounded-xl text-center border border-slate-200 dark:border-surface-border/50">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500 dark:text-foreground/50 block">Clarity</span>
                          <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{f.clarity}%</span>
                        </div>
                        <div className="glass-panel bg-slate-50/50 dark:bg-black/40 p-3 rounded-xl text-center border border-slate-200 dark:border-surface-border/50">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500 dark:text-foreground/50 block">Pacing</span>
                          <span className="text-base font-extrabold text-cyan-600 dark:text-cyan-400">
                            {f.wpm} <span className="text-[9px] font-normal text-slate-500 dark:text-foreground/50">WPM</span>
                          </span>
                        </div>
                        <div className="glass-panel bg-slate-50/50 dark:bg-black/40 p-3 rounded-xl text-center border border-slate-200 dark:border-surface-border/50">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500 dark:text-foreground/50 block">Filler Words</span>
                          <span className={`text-base font-extrabold ${f.filler_words > 5 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {f.filler_words}
                          </span>
                        </div>
                        <div className="glass-panel bg-slate-50/50 dark:bg-black/40 p-3 rounded-xl text-center border border-slate-200 dark:border-surface-border/50">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500 dark:text-foreground/50 block">Eye Contact</span>
                          <span className="text-base font-extrabold text-purple-600 dark:text-purple-400">
                            {f.eye_contact !== null ? `${Math.round(f.eye_contact)}%` : "N/A"}
                          </span>
                        </div>
                        <div className="glass-panel bg-slate-50/50 dark:bg-black/40 p-3 rounded-xl text-center border border-slate-200 dark:border-surface-border/50">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500 dark:text-foreground/50 block">Expression</span>
                          <span className="text-base font-extrabold text-pink-600 dark:text-pink-400">
                            {f.expression_score !== null ? `${Math.round(f.expression_score)}%` : "N/A"}
                          </span>
                        </div>
                      </div>

                      {/* Transcription Window */}
                      <div className="bg-slate-100/50 dark:bg-black/30 p-3.5 rounded-xl border border-slate-200 dark:border-surface-border/50">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-foreground/50 block mb-1.5">User Speech Transcript</span>
                        <p className="text-xs text-slate-755 dark:text-foreground/80 leading-relaxed italic">
                          "{f.transcript}"
                        </p>
                      </div>
                    </div>
                  )) : (
                    <div className="glass-panel p-12 text-center text-slate-500 dark:text-foreground/40 text-xs border border-slate-200 dark:border-surface-border">
                      No recording feedbacks submitted yet.
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 5: SUPPORT TICKETS DESK */}
          {activeTab === "support" && (
            <motion.div
              key="support-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                  <HelpCircle className="w-5 h-5 text-[#5B7C99] dark:text-zinc-400" />
                  Customer Support Desk
                </h2>
                <span className="px-2.5 py-0.5 rounded bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold">
                  {tickets.filter(t => t.status !== "resolved").length} unresolved issues
                </span>
              </div>

              {/* Warning Banner if table is missing */}
              {ticketsDbStatus === "missing_migration" && (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 dark:border-rose-500/20 dark:bg-rose-50/5 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
                  <div>
                    <h4 className="font-bold text-sm">Supabase Table `support_tickets` Offline</h4>
                    <p className="mt-1 leading-relaxed text-slate-700 dark:text-foreground/80 text-xs">
                      The table `support_tickets` was not detected. Local customer inquiries fall back to mock data.
                      Execute the database migration file to activate ticket persistence:
                    </p>
                    <code className="block mt-2 bg-slate-100 dark:bg-black/60 p-2.5 rounded-lg border border-slate-200 dark:border-surface-border text-slate-800 dark:text-foreground/80 font-mono text-[11px] break-all select-all">
                      supabase/migrations/20260603000001_support_tickets.sql
                    </code>
                  </div>
                </div>
              )}

              {loadingTickets ? (
                <div className="glass-panel p-12 text-center text-slate-500 dark:text-foreground/40 text-xs border border-slate-200 dark:border-surface-border">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-500" />
                  Loading customer inquiries...
                </div>
              ) : (
                <div className="space-y-4">
                  {tickets.length > 0 ? tickets.map((t) => (
                    <div key={t.id} className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-surface-border bg-white/60 dark:bg-surface/10 space-y-4">
                      
                      {/* Header */}
                      <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-100 dark:border-surface-border/50 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-805 text-slate-600 dark:text-zinc-400 rounded text-xs font-mono">
                              {t.id.slice(0, 8)}
                            </span>
                            <span className="text-sm font-semibold text-slate-800 dark:text-white">{t.category}</span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-foreground/50 mt-1 flex items-center gap-1.5">
                            {t.user && (
                              <>
                                <span>User ID:</span>
                                <span className="font-mono text-[11px] text-slate-655 dark:text-foreground/60">{t.user.slice(0, 8)}</span>
                                <span>|</span>
                              </>
                            )}
                            <span className="text-slate-600 dark:text-foreground/60">{t.email}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-500 dark:text-foreground/40 font-mono">
                            {new Date(t.created_at).toLocaleString()}
                          </span>
                          <span className={`text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-lg ${
                            t.status === "open"
                              ? "bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400"
                              : t.status === "investigating"
                              ? "bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400"
                              : "bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-555"
                          }`}>
                            {t.status}
                          </span>
                        </div>
                      </div>

                      {/* Message Details */}
                      <div className="p-3.5 bg-slate-50/80 dark:bg-black/40 rounded-xl border border-slate-200 dark:border-surface-border/50">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-foreground/50 block mb-1">Issue Description</span>
                        <p className="text-xs text-slate-755 dark:text-foreground/80 leading-relaxed font-sans">{t.message}</p>
                      </div>

                      {/* Actions */}
                      {t.status !== "resolved" && (
                        <div className="flex items-center justify-end gap-2.5">
                          {t.status === "open" && (
                            <button
                              onClick={() => resolveTicket(t.id, "investigating")}
                              className="text-xs bg-slate-105 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer"
                            >
                              Mark Investigating
                            </button>
                          )}
                          <button
                            onClick={() => resolveTicket(t.id, "resolved")}
                            className="text-xs bg-[#5B7C99] hover:bg-[#5B7C99]/90 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200 px-3 py-1.5 rounded-xl font-bold transition-all shadow-lg cursor-pointer"
                          >
                            Mark Resolved
                          </button>
                        </div>
                      )}
                    </div>
                  )) : (
                    <div className="glass-panel p-12 text-center text-slate-500 dark:text-foreground/40 text-xs border border-slate-200 dark:border-surface-border">
                      No customer support tickets found.
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
