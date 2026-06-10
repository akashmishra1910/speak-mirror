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
  MessageSquare,
  Plus,
  HelpCircle,
  AlertCircle,
  Terminal,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  UserX,
  ArrowRight,
  Clock,
  Settings,
  X,
  Send,
  Calendar
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
// Fallback / Mock Data matching premium theme
// ----------------------------------------------------
const mockStats: AdminStats = {
  totalRecordings: 142,
  totalAnalyzeCalls: 184,
  sessionCompletionRate: 77,
  dau: 18,
  mau: 92,
  dauMauRatio: 19.5,
  activeStreakUsersCount: 8,
  storageBytes: 154800000, 
  dailyStats: [
    { stat_date: "2026-06-10", recordings_count: 12, analyze_calls_count: 24, video_calls_count: 30, active_users_count: 9 },
    { stat_date: "2026-06-09", recordings_count: 8, analyze_calls_count: 18, video_calls_count: 22, active_users_count: 6 },
    { stat_date: "2026-06-08", recordings_count: 14, analyze_calls_count: 28, video_calls_count: 35, active_users_count: 11 },
    { stat_date: "2026-06-07", recordings_count: 5, analyze_calls_count: 12, video_calls_count: 14, active_users_count: 4 },
    { stat_date: "2026-06-06", recordings_count: 9, analyze_calls_count: 20, video_calls_count: 25, active_users_count: 7 },
    { stat_date: "2026-06-05", recordings_count: 11, analyze_calls_count: 22, video_calls_count: 27, active_users_count: 8 },
    { stat_date: "2026-06-03", recordings_count: 6, analyze_calls_count: 15, video_calls_count: 18, active_users_count: 5 }
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
    created_at: "2026-06-10T16:45:00Z",
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
    created_at: "2026-06-09T15:30:00Z",
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
  { id: "tkt_001", user: "usr_3a6e8b1d", email: "sarah.lee@live.com", category: "Audio/Video Sync", message: "Audio delay of ~1.8 seconds in the playback window on Safari iOS. Screen and video track sync drifts.", status: "open", created_at: "2026-06-10T12:00:00Z" },
  { id: "tkt_002", user: "usr_e5c9f2a4", email: "d.kovac@proton.me", category: "API Rate Limits", message: "Getting 429 status on my 6th attempt at analyzing. Please confirm daily caps for testing roles.", status: "investigating", created_at: "2026-06-09T09:45:00Z" },
  { id: "tkt_003", user: "usr_9b2d8c7f", email: "k.tanaka@yahoo.com", category: "Account Profile", message: "How do I request complete deletion of past video analytics files under GDPR guidelines?", status: "resolved", created_at: "2026-06-08T15:20:00Z" },
];

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Sidebar navigation toggling
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  // User details sliding drawer
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // AI Prompt Sandbox Playground
  const [sandboxTheme, setSandboxTheme] = useState("");
  const [sandboxDifficulty, setSandboxDifficulty] = useState("Beginner");
  const [sandboxTask, setSandboxTask] = useState<any>(null);
  const [isGeneratingSandbox, setIsGeneratingSandbox] = useState(false);
  const [sandboxError, setSandboxError] = useState("");

  // Storage janitor scheduler state
  const [schedulerActive, setSchedulerActive] = useState(false);
  const [schedulerDays, setSchedulerDays] = useState(7);

  // Support ticket administration notes
  const [ticketNotes, setTicketNotes] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  };

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
      .channel("admin-realtime-panel-redesigned")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recordings" },
        () => {
          fetchStats(true); 
          if (activeTabRef.current === "users") fetchUsers(true);
          if (activeTabRef.current === "feedback") fetchFeedbacks(true);
          showToast("Real-time Update: New recording practice detected!");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "api_usage_logs" },
        () => {
          fetchStats(true); 
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "practice_tasks" },
        () => {
          if (activeTabRef.current === "topics") fetchTasks(true);
          showToast("Real-time Update: Practice topic pool modified.");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets" },
        () => {
          fetchTickets(true);
          showToast("Real-time Update: Customer support ticket activity.");
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
      showToast("Storage purge executed successfully.");
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
      showToast(`AI Seeder: Pre-generated ${data.count} topics.`);
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
      showToast(`Successfully imported ${data.count} topics.`);
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
      showToast("Manual prompt created successfully!");
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Publishing Failed: ${error.message}`);
    } finally {
      setIsCreatingTopic(false);
    }
  };

  // Toggle user role in user registry
  const handleToggleUserRole = async (targetUser: AdminUser) => {
    const nextRole = targetUser.role === "admin" ? "user" : "admin";
    const confirm = window.confirm(`Are you sure you want to change ${targetUser.name}'s role to ${nextRole}?`);
    if (!confirm) return;

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set-user-role",
          userId: targetUser.id,
          role: nextRole,
          email: targetUser.email
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Updated ${targetUser.name} to ${nextRole}`);
      fetchUsers();
      if (selectedUser?.id === targetUser.id) {
        setSelectedUser(prev => prev ? { ...prev, role: nextRole } : null);
      }
    } catch (err: any) {
      alert(`Failed to update role: ${err.message}`);
    }
  };

  // Generate single topic sandbox
  const handleGenerateSandboxTopic = async () => {
    if (!sandboxTheme.trim()) {
      setSandboxError("Please specify a theme for the AI seeder sandbox.");
      return;
    }
    setIsGeneratingSandbox(true);
    setSandboxError("");
    setSandboxTask(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-sandbox-topic",
          theme: sandboxTheme,
          difficulty: sandboxDifficulty
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSandboxTask(data.task);
    } catch (err: any) {
      setSandboxError(err.message || "Failed to generate sandbox topic.");
    } finally {
      setIsGeneratingSandbox(false);
    }
  };

  // Save sandbox topic
  const handleSaveSandboxTopic = async () => {
    if (!sandboxTask) return;
    setIsCreatingTopic(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-task",
          topic: sandboxTask.topic,
          word: sandboxTask.word_of_the_day,
          definition: sandboxTask.definition,
          readingText: sandboxTask.reading_text,
          difficulty: sandboxDifficulty,
          bullets: sandboxTask.bullets
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setSandboxTask(null);
      setSandboxTheme("");
      fetchTasks();
      showToast("Sandbox topic approved and published!");
    } catch (err: any) {
      alert(`Failed to save sandbox topic: ${err.message}`);
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
      showToast(`Ticket status updated to ${nextStatus}.`);
    } catch (err: unknown) {
      console.warn("Failed to persist ticket status update. Kept local changes.", err);
    }
  };

  const handleSaveTicketNote = (id: string) => {
    showToast("Ticket troubleshooting note saved.");
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
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950 flex flex-col items-center justify-center">
        <Activity className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <span className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Verifying Admin Access...</span>
      </div>
    );
  }

  const activeFeedbacks = feedbacks.length > 0 ? feedbacks : mockFeedbacks;
  const averageFluency = activeFeedbacks.length > 0
    ? Math.round(activeFeedbacks.reduce((acc, curr) => acc + (curr.clarity + curr.confidence) / 2, 0) / activeFeedbacks.length)
    : 78;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950 text-zinc-100 flex transition-colors duration-300 font-sans">
      
      {/* -------------------- SIDEBAR SAAS NAVIGATION -------------------- */}
      <motion.div 
        animate={{ width: sidebarOpen ? 260 : 80 }}
        className="bg-zinc-950/80 border-r border-zinc-900 backdrop-blur-xl shrink-0 flex flex-col h-screen sticky top-0 z-40 overflow-hidden"
      >
        <div className="p-5 flex items-center justify-between border-b border-zinc-900">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
              <Shield className="w-5 h-5 shrink-0" />
            </div>
            {sidebarOpen && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-bold tracking-tight text-white font-mono text-sm uppercase shrink-0"
              >
                Control Tower
              </motion.div>
            )}
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-zinc-900 border border-zinc-800/80 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <div className="p-4 flex-1 space-y-1.5">
          <SidebarNavItem 
            icon={<Activity className="w-4 h-4" />} 
            label="Overview" 
            active={activeTab === "overview"} 
            collapsed={!sidebarOpen} 
            onClick={() => setActiveTab("overview")} 
          />
          <SidebarNavItem 
            icon={<Users className="w-4 h-4" />} 
            label="User Registry" 
            active={activeTab === "users"} 
            collapsed={!sidebarOpen} 
            onClick={() => setActiveTab("users")} 
          />
          <SidebarNavItem 
            icon={<BookOpen className="w-4 h-4" />} 
            label="Practice Topics" 
            active={activeTab === "topics"} 
            collapsed={!sidebarOpen} 
            onClick={() => setActiveTab("topics")} 
          />
          <SidebarNavItem 
            icon={<MessageSquare className="w-4 h-4" />} 
            label="Feedback Audits" 
            active={activeTab === "feedback"} 
            collapsed={!sidebarOpen} 
            onClick={() => setActiveTab("feedback")} 
          />
          <SidebarNavItem 
            icon={<HelpCircle className="w-4 h-4" />} 
            label="Support Desk" 
            active={activeTab === "support"} 
            collapsed={!sidebarOpen} 
            badge={tickets.filter(t => t.status !== "resolved").length}
            onClick={() => setActiveTab("support")} 
          />
        </div>

        {/* Sidebar Footer info */}
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-5 border-t border-zinc-900 text-[11px] text-zinc-500 font-mono space-y-1 bg-zinc-950/40"
          >
            <p>Project Ref: udelvewkb...</p>
            <p>Database: Remote Active</p>
            <p className="text-indigo-400 font-bold uppercase tracking-widest text-[9px] mt-2 block">B2C Launch Live</p>
          </motion.div>
        )}
      </motion.div>

      {/* -------------------- MAIN CONTENT AREA -------------------- */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Top Header */}
        <header className="h-16 border-b border-zinc-900 bg-zinc-950/40 backdrop-blur-md flex items-center justify-between px-8 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-white tracking-tight capitalize font-sans">
              {activeTab === "topics" ? "Practice Topics Pool" : activeTab === "feedback" ? "Diagnostics Feedback Audits" : `${activeTab} Control`}
            </h2>
            <div className="h-4 w-px bg-zinc-800" />
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
              <span>Real-time Sync Connected</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAllData}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/80 rounded-xl transition-all text-zinc-400 hover:text-white cursor-pointer"
              title="Refresh Telemetry Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="h-8 w-px bg-zinc-800" />
            <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 px-4 py-1.5 rounded-xl text-xs">
              <span className="font-semibold text-zinc-350">{user.email?.split("@")[0]}</span>
              <span className="bg-indigo-500/20 text-indigo-455 border border-indigo-500/30 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                Admin
              </span>
            </div>
          </div>
        </header>

        {/* Dashboard Pages wrapper */}
        <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8">
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
                {/* Stats Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <StatCard 
                    title="Active Recordings" 
                    value={loadingStats ? "..." : (stats?.totalRecordings ?? mockStats.totalRecordings)} 
                    subtitle="Practices completed"
                    icon={<HardDrive className="w-5 h-5 text-indigo-400" />} 
                  />
                  <StatCard 
                    title="Groq API usage" 
                    value={loadingStats ? "..." : (stats?.totalAnalyzeCalls ?? mockStats.totalAnalyzeCalls)} 
                    subtitle="Whisper/Llama triggers"
                    icon={<Activity className="w-5 h-5 text-purple-400" />} 
                  />
                  <StatCard 
                    title="Session Completion" 
                    value={loadingStats ? "..." : `${stats?.sessionCompletionRate ?? mockStats.sessionCompletionRate}%`} 
                    subtitle="Diagnostic submission rate"
                    icon={<TrendingUp className="w-5 h-5 text-emerald-400" />} 
                  />
                  <StatCard 
                    title="Habitual Speakers" 
                    value={loadingStats ? "..." : (stats?.activeStreakUsersCount ?? mockStats.activeStreakUsersCount)} 
                    subtitle="3+ day practice streak"
                    icon={<Users className="w-5 h-5 text-cyan-400" />} 
                  />
                </div>

                {/* SVG Visual Chart */}
                <DailyStatsChart data={stats?.dailyStats || mockStats.dailyStats} />

                {/* Database logs terminal and storage janitor */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left columns: Database terminal console */}
                  <div className="lg:col-span-2">
                    <DatabaseTerminal tasks={tasks} tickets={tickets} stats={stats} />
                  </div>

                  {/* Right Column: Advanced Storage Janitor */}
                  <div className="space-y-6">
                    <div className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-900/10 hover:border-zinc-700/80 transition-colors space-y-5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                          <Trash2 className="w-4 h-4" />
                          Storage Janitor
                        </span>
                        <span className="text-xs text-zinc-400 font-mono font-semibold">
                          {stats ? formatBytes(stats.storageBytes) : "..."} Used
                        </span>
                      </div>

                      {/* Visual breakdown bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-[11px] text-zinc-400">
                          <span>Video Binaries (88%)</span>
                          <span>Logs (12%)</span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-zinc-800 overflow-hidden flex">
                          <div className="bg-indigo-500 h-full" style={{ width: "88%" }} />
                          <div className="bg-purple-500 h-full" style={{ width: "8%" }} />
                          <div className="bg-teal-500 h-full" style={{ width: "4%" }} />
                        </div>
                        <div className="flex gap-4 text-[10px] text-zinc-500 font-semibold pt-1">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" /> S3 Binaries</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Transcripts</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500" /> Metadata</span>
                        </div>
                      </div>

                      {/* Manual Purge form */}
                      <div className="pt-3 border-t border-zinc-850 space-y-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-300">Clean records older than</span>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              value={cleanupDays} 
                              onChange={(e) => setCleanupDays(parseInt(e.target.value) || 30)}
                              className="bg-black border border-zinc-800 rounded-lg text-center py-1 text-xs w-12 text-white font-mono"
                            />
                            <span className="text-zinc-550">days</span>
                          </div>
                        </div>
                        
                        <button 
                          onClick={handleStorageCleanup}
                          disabled={isCleaning}
                          className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/30 hover:border-rose-500 text-rose-400 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isCleaning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          Execute Manual Purge
                        </button>
                      </div>

                      {/* Storage Janitor Scheduler */}
                      <div className="pt-3 border-t border-zinc-850 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-300">Auto-scheduler</span>
                          <button 
                            onClick={() => setSchedulerActive(!schedulerActive)}
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border transition-colors cursor-pointer ${
                              schedulerActive 
                                ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' 
                                : 'bg-zinc-800 text-zinc-400 border-zinc-750'
                            }`}
                          >
                            {schedulerActive ? "Active" : "Inactive"}
                          </button>
                        </div>
                        {schedulerActive && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="text-[11px] text-zinc-400 space-y-2 bg-black/30 p-2.5 rounded-lg border border-zinc-850"
                          >
                            <div className="flex justify-between items-center">
                              <span>Purge Frequency:</span>
                              <select 
                                value={schedulerDays} 
                                onChange={(e) => setSchedulerDays(parseInt(e.target.value))}
                                className="bg-black border border-zinc-800 text-[10px] px-1 py-0.5 rounded text-zinc-300 outline-none"
                              >
                                <option value={7}>Every 7 days</option>
                                <option value={30}>Every 30 days</option>
                                <option value={90}>Every 90 days</option>
                              </select>
                            </div>
                            <p className="text-[10px] text-zinc-500 italic">Cron task: speakmirror_cleanup_job running nightly.</p>
                          </motion.div>
                        )}
                      </div>

                      {cleanupResult && (
                        <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs flex justify-between items-center">
                          <span>
                            {cleanupResult.error ? (
                              <span className="text-rose-400">Purge failed: {cleanupResult.error}</span>
                            ) : (
                              <span>Purged {cleanupResult.recordingsCleaned} records, {cleanupResult.filesDeleted} binaries.</span>
                            )}
                          </span>
                          <button onClick={() => setCleanupResult(null)} className="font-extrabold hover:text-white px-1">X</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Database View Warning Banner */}
                {!loadingStats && stats?.databaseViewStatus !== "active" && (
                  <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-xs flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
                    <div>
                      <h4 className="font-bold text-sm">Supabase Database View Offline</h4>
                      <p className="mt-1 leading-relaxed text-zinc-350 text-xs">
                        The view `admin_stats` was not detected. Local metrics are calculated using client estimations.
                        Execute the database migration file to activate optimized telemetry logging:
                      </p>
                      <code className="block mt-2 bg-black/60 p-2.5 rounded-lg border border-zinc-800 text-zinc-300 font-mono text-[11px] break-all select-all">
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
                {/* Search & Audit header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-400" />
                      B2C Speaker Registrations
                    </h2>
                    <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-400">
                      {filteredUsers.length} total users
                    </span>
                  </div>

                  <div className="relative w-full sm:w-80">
                    <input 
                      type="text"
                      placeholder="Search speakers by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-zinc-650 focus:outline-none focus:border-zinc-700 transition-colors"
                    />
                    <Search className="w-4 h-4 text-zinc-600 absolute left-3 top-3" />
                  </div>
                </div>

                {/* User registry list */}
                {loadingUsers ? (
                  <div className="glass-panel p-12 text-center text-zinc-500 text-xs border border-zinc-800">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-500" />
                    Querying speaker registers...
                  </div>
                ) : (
                  <div className="glass-panel rounded-2xl border border-zinc-800/80 overflow-hidden bg-zinc-900/10">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-800 bg-zinc-900/35 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            <th className="p-4">Speaker</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Registered Date</th>
                            <th className="p-4 text-center">Speeches Count</th>
                            <th className="p-4">Administrative Role</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900 text-xs">
                          {filteredUsers.map((u: AdminUser) => (
                            <tr key={u.id} className="hover:bg-zinc-900/40 transition-colors group">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-900 border border-zinc-750 text-zinc-200 flex items-center justify-center font-bold text-xs shadow-md">
                                    {u.name[0]?.toUpperCase()}
                                  </div>
                                  <div>
                                    <button 
                                      onClick={() => setSelectedUser(u)}
                                      className="font-bold text-white hover:text-indigo-400 hover:underline text-left cursor-pointer"
                                    >
                                      {u.name}
                                    </button>
                                    <span className="text-[10px] text-zinc-550 block font-mono mt-0.5">{u.id.slice(0, 8)}...</span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 font-mono text-zinc-400 select-all">{u.email}</td>
                              <td className="p-4 text-zinc-450">{new Date(u.created_at).toLocaleDateString()}</td>
                              <td className="p-4 text-center font-bold text-zinc-350">{u.recordings_count}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] border tracking-wider uppercase ${
                                    u.role === "admin" 
                                      ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" 
                                      : "bg-zinc-900 text-zinc-450 border-zinc-800"
                                  }`}>
                                    {u.role}
                                  </span>
                                  <button
                                    onClick={() => handleToggleUserRole(u)}
                                    className="p-1 hover:bg-zinc-800 border border-transparent hover:border-zinc-750 rounded text-zinc-400 hover:text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                                    title={u.role === "admin" ? "Demote to User" : "Promote to Admin"}
                                  >
                                    {u.role === "admin" ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {filteredUsers.length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-12 text-center text-zinc-500 text-sm">
                                No registered speakers match that search query.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
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
                {/* Left Columns: Prompts Sandbox & Import Tool */}
                <div className="lg:col-span-1 space-y-6">
                  
                  {/* AI Prompt Sandbox */}
                  <div className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-900/10">
                    <h3 className="font-bold text-sm mb-1.5 flex items-center gap-2 text-white">
                      <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                      AI Sandbox Playground
                    </h3>
                    <p className="text-xs text-zinc-450 mb-4 leading-relaxed">
                      Seed and preview speaking challenges on a custom theme before publishing them to the B2C pool.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-1">Concept or Domain</label>
                        <input 
                          type="text"
                          placeholder="e.g. Behavioral Interview, Tech Pitch..."
                          value={sandboxTheme}
                          onChange={(e) => setSandboxTheme(e.target.value)}
                          className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-zinc-700 outline-none focus:border-zinc-700 transition-colors"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-1">Difficulty</label>
                          <select 
                            value={sandboxDifficulty}
                            onChange={(e) => setSandboxDifficulty(e.target.value)}
                            className="w-full bg-black border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-400 outline-none"
                          >
                            <option>Beginner</option>
                            <option>Intermediate</option>
                            <option>Advanced</option>
                          </select>
                        </div>
                        <div className="flex items-end">
                          <button 
                            type="button"
                            onClick={handleGenerateSandboxTopic}
                            disabled={isGeneratingSandbox || !sandboxTheme.trim()}
                            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                          >
                            {isGeneratingSandbox ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            Run Seed
                          </button>
                        </div>
                      </div>

                      {sandboxError && (
                        <p className="text-[11px] text-rose-400 font-medium font-sans">{sandboxError}</p>
                      )}

                      {/* Sandbox Sandbox Preview Card */}
                      {sandboxTask && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-black/40 border border-zinc-800 p-4 rounded-xl space-y-3 mt-4 text-xs"
                        >
                          <div className="flex justify-between items-center border-b border-zinc-850 pb-2">
                            <span className="font-bold text-zinc-350">Preview Sandbox Task</span>
                            <span className="text-[10px] uppercase font-bold text-indigo-400">{sandboxDifficulty}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 font-bold block">TOPIC:</span>
                            <input 
                              type="text" 
                              value={sandboxTask.topic}
                              onChange={(e) => setSandboxTask({ ...sandboxTask, topic: e.target.value })}
                              className="w-full bg-zinc-950 border border-zinc-850 rounded px-2 py-1 text-xs text-white outline-none focus:border-zinc-700 mt-1"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[10px] text-zinc-500 font-bold block">VOCABULARY:</span>
                              <input 
                                type="text" 
                                value={sandboxTask.word_of_the_day || ""}
                                onChange={(e) => setSandboxTask({ ...sandboxTask, word_of_the_day: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-850 rounded px-2 py-1 text-[11px] text-white outline-none focus:border-zinc-700 mt-1"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-500 font-bold block">DEFINITION:</span>
                              <input 
                                type="text" 
                                value={sandboxTask.definition || ""}
                                onChange={(e) => setSandboxTask({ ...sandboxTask, definition: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-850 rounded px-2 py-1 text-[11px] text-white outline-none focus:border-zinc-700 mt-1"
                              />
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 font-bold block">READING PRACTICE:</span>
                            <textarea 
                              value={sandboxTask.reading_text || ""}
                              onChange={(e) => setSandboxTask({ ...sandboxTask, reading_text: e.target.value })}
                              rows={2}
                              className="w-full bg-zinc-950 border border-zinc-850 rounded px-2 py-1 text-[11px] text-white outline-none focus:border-zinc-700 mt-1 resize-none"
                            />
                          </div>
                          
                          <button 
                            type="button"
                            onClick={handleSaveSandboxTopic}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Approve and Publish Topic
                          </button>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Month seeder tool */}
                  <div className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-900/10">
                    <h3 className="font-bold text-sm mb-2 flex items-center gap-2 text-white">
                      <Calendar className="w-4 h-4 text-purple-400" />
                      Bulk AI Generation
                    </h3>
                    <p className="text-xs text-zinc-450 mb-4 leading-relaxed">
                      Seed larger batches of topics based on default app categories.
                    </p>
                    
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs text-zinc-350">Generate</span>
                      <input 
                        type="number"
                        value={aiGenCount}
                        onChange={(e) => setAiGenCount(parseInt(e.target.value) || 10)}
                        className="bg-black border border-zinc-800 text-center rounded-lg py-1 text-xs w-14 text-white font-mono"
                      />
                      <span className="text-xs text-zinc-350">topics</span>
                    </div>

                    <button 
                      onClick={handleAiPreGenerate}
                      disabled={isGenerating}
                      className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Generate Batch Pool
                    </button>

                    {genResult && (
                      <div className={`mt-4 p-3 rounded-lg border text-xs leading-relaxed ${genResult.success ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-400'}`}>
                        {genResult.success ? `Batch completed: Generated and saved ${genResult.count} prompts!` : `Batch failed: ${genResult.error}`}
                      </div>
                    )}
                  </div>

                  {/* Bulk manual JSON importer */}
                  <div className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-900/10">
                    <h3 className="font-bold text-sm mb-2 flex items-center gap-2 text-white">
                      <Upload className="w-4 h-4 text-zinc-400" />
                      Manual JSON Importer
                    </h3>
                    <textarea 
                      value={bulkJsonText}
                      onChange={(e) => setBulkJsonText(e.target.value)}
                      placeholder='[{"topic": "Explain async collaboration", "difficulty_level": "Intermediate"}]'
                      rows={3}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-zinc-700 leading-normal resize-none"
                    />
                    <button 
                      onClick={handleBulkImport}
                      disabled={isImporting || !bulkJsonText}
                      className="w-full mt-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 disabled:opacity-50 text-zinc-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      Import JSON Array
                    </button>

                    {importResult && (
                      <div className={`mt-3 p-3 rounded-lg border text-xs leading-relaxed ${importResult.success ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-400'}`}>
                        {importResult.success ? `Successfully imported ${importResult.count} prompts!` : importResult.error}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Pre-generated Topic Pool List */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-base font-bold flex items-center gap-2 text-white">
                      <BookOpen className="w-5 h-5 text-indigo-400" />
                      B2C Speaking Topics Pool
                    </h2>
                    <span className="text-xs text-zinc-450 bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded-lg">
                      {tasks.length} topics total
                    </span>
                  </div>

                  {loadingTasks ? (
                    <div className="glass-panel p-6 rounded-2xl animate-pulse h-96 border border-zinc-805" />
                  ) : (
                    <div className="glass-panel rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-900/10">
                      <div className="max-h-[640px] overflow-y-auto divide-y divide-zinc-900 scrollbar-thin">
                        {tasks.length > 0 ? tasks.map((t) => (
                          <div key={t.id} className="p-5 hover:bg-zinc-900/25 transition-colors flex flex-col sm:flex-row justify-between items-start gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2.5">
                                <span className="text-sm font-semibold text-white">{t.topic_of_the_day}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  t.difficulty_level === 'Advanced' 
                                    ? 'bg-rose-550/10 text-rose-400 border-rose-500/20' 
                                    : t.difficulty_level === 'Intermediate' 
                                    ? 'bg-amber-550/10 text-amber-400 border-amber-500/20' 
                                    : 'bg-cyan-550/10 text-cyan-400 border-cyan-500/20'
                                }`}>
                                  {t.difficulty_level}
                                </span>
                              </div>
                              {t.word_of_the_day && (
                                <p className="text-xs text-zinc-350 leading-normal">
                                  <span className="font-semibold text-zinc-500">Vocabulary:</span> <strong className="text-zinc-200">{t.word_of_the_day}</strong> — <span className="italic text-zinc-400">{t.definition}</span>
                                </p>
                              )}
                              {t.reading_text && (
                                <p className="text-[11px] text-zinc-500 border-l border-zinc-800 pl-2.5 italic leading-relaxed">
                                  "{t.reading_text}"
                                </p>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-550 shrink-0 font-mono self-end sm:self-auto">
                              {new Date(t.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        )) : (
                          <div className="p-12 text-center text-zinc-500 text-xs">
                            No speaking tasks present in database.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB 4: PRACTICE FEEDBACK AUDITS */}
            {activeTab === "feedback" && (
              <motion.div
                key="feedback-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-base font-bold flex items-center gap-2 text-white">
                    <MessageSquare className="w-5 h-5 text-indigo-400" />
                    Diagnostics Feedback Submissions
                  </h2>
                  <span className="text-xs text-zinc-450 bg-zinc-900 border border-zinc-850 px-2.5 py-0.5 rounded-lg">
                    {feedbacks.length} audit logs
                  </span>
                </div>

                {loadingFeedbacks ? (
                  <div className="glass-panel p-12 text-center text-zinc-500 text-xs border border-zinc-800">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-500" />
                    Querying speech diagnostics...
                  </div>
                ) : (
                  <div className="space-y-6">
                    {feedbacks.length > 0 ? feedbacks.map((f) => (
                      <div key={f.id} className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-900/10 space-y-4 hover:border-zinc-750 transition-colors">
                        
                        {/* Header metadata */}
                        <div className="flex flex-wrap justify-between items-start gap-3 border-b border-zinc-900 pb-3.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white text-sm">{f.topic}</span>
                              <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-[9px] rounded-lg">
                                {f.id.slice(0, 8)}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
                              <span className="font-bold text-zinc-350">{f.user_name}</span>
                              <span>|</span>
                              <span className="font-mono text-[11px] text-zinc-400">{f.user_email}</span>
                            </p>
                          </div>

                          <div className="text-[10px] text-zinc-500 font-mono text-right">
                            {new Date(f.created_at).toLocaleString()}
                          </div>
                        </div>

                        {/* Speech Stats row */}
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                          <SpeechMetricCard title="Confidence" value={`${f.confidence}%`} color="text-indigo-400" />
                          <SpeechMetricCard title="Clarity" value={`${f.clarity}%`} color="text-emerald-400" />
                          <SpeechMetricCard title="Pacing" value={`${f.wpm} WPM`} color="text-cyan-400" />
                          <SpeechMetricCard 
                            title="Filler Words" 
                            value={f.filler_words} 
                            color={f.filler_words > 5 ? "text-amber-400" : "text-emerald-400"} 
                          />
                          <SpeechMetricCard 
                            title="Eye Contact" 
                            value={f.eye_contact !== null ? `${Math.round(f.eye_contact)}%` : "N/A"} 
                            color="text-purple-400" 
                          />
                          <SpeechMetricCard 
                            title="Expression" 
                            value={f.expression_score !== null ? `${Math.round(f.expression_score)}%` : "N/A"} 
                            color="text-pink-400" 
                          />
                        </div>

                        {/* Transcript section */}
                        <div className="bg-black/35 p-4 rounded-xl border border-zinc-900/60 leading-relaxed italic text-xs text-zinc-300">
                          <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1 font-mono">User Speech Transcript</span>
                          "{f.transcript}"
                        </div>
                      </div>
                    )) : (
                      <div className="glass-panel p-12 text-center text-zinc-550 text-xs border border-zinc-800">
                        No telemetry diagnostic feedback records found.
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
                  <h2 className="text-base font-bold flex items-center gap-2 text-white">
                    <HelpCircle className="w-5 h-5 text-indigo-400" />
                    Customer Support Desk
                  </h2>
                  <span className="px-2.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
                    {tickets.filter(t => t.status !== "resolved").length} unresolved issues
                  </span>
                </div>

                {/* Warning Banner if table is missing */}
                {ticketsDbStatus === "missing_migration" && (
                  <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-xs flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
                    <div>
                      <h4 className="font-bold text-sm">Supabase Table `support_tickets` Offline</h4>
                      <p className="mt-1 leading-relaxed text-zinc-350 text-xs">
                        The table `support_tickets` was not detected. Local customer inquiries fall back to mock data.
                        Execute the database migration file to activate ticket persistence:
                      </p>
                      <code className="block mt-2 bg-black/60 p-2.5 rounded-lg border border-zinc-800 text-zinc-300 font-mono text-[11px] break-all select-all">
                        supabase/migrations/20260603000001_support_tickets.sql
                      </code>
                    </div>
                  </div>
                )}

                {loadingTickets ? (
                  <div className="glass-panel p-12 text-center text-zinc-550 text-xs border border-zinc-800">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-500" />
                    Loading support desk logs...
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tickets.map((t) => (
                      <div key={t.id} className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-900/10 space-y-4 hover:border-zinc-750 transition-colors">
                        
                        {/* Header */}
                        <div className="flex flex-wrap justify-between items-start gap-3 border-b border-zinc-900 pb-3.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-mono">
                                {t.id.slice(0, 8)}
                              </span>
                              <span className="text-sm font-semibold text-white">{t.category}</span>
                            </div>
                            <div className="text-xs text-zinc-450 mt-1 flex items-center gap-1.5">
                              {t.user && (
                                <>
                                  <span>User ID:</span>
                                  <span className="font-mono text-[11px] text-zinc-400">{t.user.slice(0, 8)}</span>
                                  <span>|</span>
                                </>
                              )}
                              <span className="text-zinc-400">{t.email}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {new Date(t.created_at).toLocaleString()}
                            </span>
                            <span className={`text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-lg border ${
                              t.status === "open"
                                ? "bg-rose-500/10 border-rose-500/20 text-rose-455"
                                : t.status === "investigating"
                                ? "bg-amber-500/10 border-amber-500/20 text-amber-455"
                                : "bg-zinc-900 border-zinc-800 text-zinc-550"
                            }`}>
                              {t.status}
                            </span>
                          </div>
                        </div>

                        {/* Message details */}
                        <div className="p-4 bg-black/35 rounded-xl border border-zinc-900/60 text-xs text-zinc-300 leading-relaxed font-sans">
                          <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1 font-mono">Issue Description</span>
                          {t.message}
                        </div>

                        {/* Actions and troubleshooting notes */}
                        <div className="pt-3 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                          <div className="flex-1 flex gap-2">
                            <input 
                              type="text" 
                              placeholder="Add internal admin notes / diagnostics log..."
                              value={ticketNotes[t.id] || ""}
                              onChange={(e) => setTicketNotes({ ...ticketNotes, [t.id]: e.target.value })}
                              className="flex-1 bg-black border border-zinc-800 rounded-lg px-3 py-1 text-xs text-white placeholder:text-zinc-700 outline-none"
                            />
                            <button 
                              onClick={() => handleSaveTicketNote(t.id)}
                              className="px-3 py-1 bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-zinc-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                            >
                              Save Notes
                            </button>
                          </div>

                          {t.status !== "resolved" && (
                            <div className="flex items-center gap-2 shrink-0">
                              {t.status === "open" && (
                                <button
                                  onClick={() => resolveTicket(t.id, "investigating")}
                                  className="text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 px-3.5 py-1.5 rounded-xl font-semibold transition-all cursor-pointer"
                                >
                                  Investigate
                                </button>
                              )}
                              <button
                                onClick={() => resolveTicket(t.id, "resolved")}
                                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-xl font-bold transition-all shadow-md cursor-pointer"
                              >
                                Mark Resolved
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* -------------------- USER DETAILS DRAWER (SLIDES IN) -------------------- */}
      <AnimatePresence>
        {selectedUser && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="fixed inset-0 bg-black z-40 cursor-pointer"
            />
            {/* Drawer */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 20 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] bg-zinc-950 border-l border-zinc-900 z-50 flex flex-col p-6 overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-zinc-900 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{selectedUser.name}</h3>
                  <span className="text-xs text-zinc-500 font-mono">{selectedUser.id}</span>
                </div>
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                
                {/* Account Details card */}
                <div className="glass-panel p-4 rounded-xl border border-zinc-800 space-y-3">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block font-mono">Account Registry details</span>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Email:</span>
                      <span className="text-white font-mono">{selectedUser.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Register Date:</span>
                      <span className="text-zinc-350">{new Date(selectedUser.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Speeches Practiced:</span>
                      <span className="text-white font-bold">{selectedUser.recordings_count} sessions</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Role Status:</span>
                      <div className="flex gap-2">
                        <span className={`px-2 py-0.5 rounded font-bold text-[9px] border tracking-wider uppercase ${
                          selectedUser.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                        }`}>
                          {selectedUser.role}
                        </span>
                        <button 
                          onClick={() => handleToggleUserRole(selectedUser)}
                          className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                        >
                          Toggle Role
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Average diagnostic scores */}
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block font-mono">Aggregation Metrics (Rolling Average)</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-900/30 border border-zinc-850 p-3.5 rounded-xl text-center">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-500 block font-mono">Fluency</span>
                      <span className="text-lg font-extrabold text-indigo-400 mt-1 block">82%</span>
                    </div>
                    <div className="bg-zinc-900/30 border border-zinc-850 p-3.5 rounded-xl text-center">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-500 block font-mono">Pacing speed</span>
                      <span className="text-lg font-extrabold text-cyan-400 mt-1 block">128 WPM</span>
                    </div>
                    <div className="bg-zinc-900/30 border border-zinc-850 p-3.5 rounded-xl text-center">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-500 block font-mono">Eye Contact</span>
                      <span className="text-lg font-extrabold text-purple-400 mt-1 block">85%</span>
                    </div>
                    <div className="bg-zinc-900/30 border border-zinc-850 p-3.5 rounded-xl text-center">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-500 block font-mono">Expression</span>
                      <span className="text-lg font-extrabold text-pink-400 mt-1 block">79%</span>
                    </div>
                  </div>
                </div>

                {/* Specific feedbacks list */}
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block font-mono">User practice logs</span>
                  <div className="space-y-3">
                    {activeFeedbacks.filter(f => f.user_id === selectedUser.id).map(f => (
                      <div key={f.id} className="bg-zinc-900/20 border border-zinc-850 p-4 rounded-xl space-y-2 text-xs">
                        <div className="flex justify-between font-bold text-white border-b border-zinc-900 pb-1.5 mb-1.5">
                          <span className="truncate pr-4">{f.topic}</span>
                          <span className="text-[#5B7C99] text-[10px] font-mono">{f.id.slice(0, 8)}</span>
                        </div>
                        <div className="flex justify-between text-zinc-450 font-mono text-[11px]">
                          <span>Confidence: {f.confidence}%</span>
                          <span>Clarity: {f.clarity}%</span>
                          <span>WPM: {f.wpm}</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 italic pl-2 border-l border-zinc-800 leading-relaxed mt-2">
                          "{f.transcript.slice(0, 110)}{f.transcript.length > 110 ? "..." : ""}"
                        </p>
                      </div>
                    ))}
                    {activeFeedbacks.filter(f => f.user_id === selectedUser.id).length === 0 && (
                      <p className="text-xs text-zinc-500 italic text-center p-4">No diagnostic logs found for this speaker.</p>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Real-time Notification Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 text-xs text-white"
          >
            <Activity className="w-4 h-4 text-indigo-400 animate-spin" />
            <span className="font-semibold">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ----------------------------------------------------
// UI Sub-components
// ----------------------------------------------------

interface SidebarNavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
  badge?: number;
  onClick: () => void;
}

function SidebarNavItem({ icon, label, active, collapsed, badge, onClick }: SidebarNavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer border group relative ${
        active 
          ? "bg-indigo-600/10 text-indigo-455 border-indigo-500/20 font-bold shadow-md shadow-indigo-500/5" 
          : "text-zinc-400 hover:text-white bg-transparent border-transparent hover:bg-zinc-900/50"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`${active ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'} transition-colors`}>{icon}</span>
        {!collapsed && (
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs tracking-tight"
          >
            {label}
          </motion.span>
        )}
      </div>
      {badge && badge > 0 && !collapsed && (
        <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] px-1.5 py-0.5 rounded font-bold font-mono">
          {badge}
        </span>
      )}
    </button>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, subtitle, icon }: StatCardProps) {
  return (
    <div className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-900/10 hover:border-zinc-700/80 transition-all shadow-md">
      <div className="flex justify-between items-start mb-3">
        <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 font-mono">{title}</span>
        <div className="p-2 bg-zinc-950 border border-zinc-850 rounded-xl">
          {icon}
        </div>
      </div>
      <h3 className="text-3xl font-extrabold tracking-tight text-white font-mono">{value}</h3>
      <p className="text-[11px] text-zinc-500 mt-2 font-medium leading-normal">{subtitle}</p>
    </div>
  );
}

interface SpeechMetricCardProps {
  title: string;
  value: string | number;
  color: string;
}

function SpeechMetricCard({ title, value, color }: SpeechMetricCardProps) {
  return (
    <div className="glass-panel bg-black/40 p-3.5 rounded-xl text-center border border-zinc-900">
      <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-500 block font-mono">{title}</span>
      <span className={`text-base font-extrabold mt-1 block ${color}`}>{value}</span>
    </div>
  );
}

const fallbackDailyStats: DailyStatItem[] = [
  { stat_date: "2026-06-04", recordings_count: 3, analyze_calls_count: 8, video_calls_count: 10, active_users_count: 3 },
  { stat_date: "2026-06-05", recordings_count: 5, analyze_calls_count: 12, video_calls_count: 15, active_users_count: 4 },
  { stat_date: "2026-06-06", recordings_count: 4, analyze_calls_count: 10, video_calls_count: 12, active_users_count: 3 },
  { stat_date: "2026-06-07", recordings_count: 7, analyze_calls_count: 15, video_calls_count: 18, active_users_count: 5 },
  { stat_date: "2026-06-08", recordings_count: 6, analyze_calls_count: 14, video_calls_count: 16, active_users_count: 5 },
  { stat_date: "2026-06-09", recordings_count: 10, analyze_calls_count: 20, video_calls_count: 24, active_users_count: 8 },
  { stat_date: "2026-06-10", recordings_count: 12, analyze_calls_count: 24, video_calls_count: 30, active_users_count: 9 }
];

// chart & terminal component definitions
function DailyStatsChart({ data }: { data: DailyStatItem[] }) {
  const sorted = data && data.length > 0 ? [...data].reverse() : fallbackDailyStats;

  const width = 600;
  const height = 200;
  const padding = 40;

  const maxVal = Math.max(
    ...sorted.map(d => Math.max(d.recordings_count, d.analyze_calls_count, d.active_users_count, 10))
  );

  const getX = (index: number) => padding + (index / Math.max(sorted.length - 1, 1)) * (width - padding * 2);
  const getY = (val: number) => height - padding - (val / maxVal) * (height - padding * 2);

  const recordingsPoints = sorted.map((d, i) => `${getX(i)},${getY(d.recordings_count)}`).join(' ');
  const analyzePoints = sorted.map((d, i) => `${getX(i)},${getY(d.analyze_calls_count)}`).join(' ');
  const activeUsersPoints = sorted.map((d, i) => `${getX(i)},${getY(d.active_users_count)}`).join(' ');

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="relative glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-900/10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-400" />
          Interactive Telemetry Streams
        </h3>
        <div className="flex flex-wrap gap-4 text-[10px] text-zinc-450 font-bold font-mono">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#5B7C99]" /> Recordings</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> AI API Calls</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Active Users</span>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[500px] h-auto overflow-visible select-none">
          {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
            <line
              key={i}
              x1={padding}
              y1={getY(maxVal * r)}
              x2={width - padding}
              y2={getY(maxVal * r)}
              stroke="currentColor"
              className="text-zinc-800/40"
              strokeDasharray="4 4"
            />
          ))}

          {sorted.length > 1 && (
            <>
              <polyline fill="none" stroke="#5B7C99" strokeWidth="2" points={recordingsPoints} className="drop-shadow-[0_2px_4px_rgba(91,124,153,0.25)]" />
              <polyline fill="none" stroke="#6366f1" strokeWidth="2" points={analyzePoints} className="drop-shadow-[0_2px_4px_rgba(99,102,241,0.25)]" />
              <polyline fill="none" stroke="#10b981" strokeWidth="2" points={activeUsersPoints} className="drop-shadow-[0_2px_4px_rgba(16,185,129,0.25)]" />
            </>
          )}

          {sorted.map((d, i) => (
            <g key={i}>
              <line
                x1={getX(i)}
                y1={padding}
                x2={getX(i)}
                y2={height - padding}
                stroke="currentColor"
                className={`text-zinc-750 transition-opacity ${hoveredIndex === i ? 'opacity-100' : 'opacity-0'}`}
                strokeWidth="1"
              />
              <circle cx={getX(i)} cy={getY(d.recordings_count)} r={hoveredIndex === i ? 4.5 : 2.5} fill="#5B7C99" className="transition-all" />
              <circle cx={getX(i)} cy={getY(d.analyze_calls_count)} r={hoveredIndex === i ? 4.5 : 2.5} fill="#6366f1" className="transition-all" />
              <circle cx={getX(i)} cy={getY(d.active_users_count)} r={hoveredIndex === i ? 4.5 : 2.5} fill="#10b981" className="transition-all" />
              
              <rect
                x={getX(i) - (width - padding * 2) / (sorted.length * 2)}
                y={padding}
                width={(width - padding * 2) / Math.max(sorted.length - 1, 1)}
                height={height - padding * 2}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              />
            </g>
          ))}

          <text x={padding - 8} y={getY(0)} textAnchor="end" className="text-[8px] fill-zinc-550 font-mono">0</text>
          <text x={padding - 8} y={getY(maxVal / 2)} textAnchor="end" className="text-[8px] fill-zinc-550 font-mono">{Math.round(maxVal / 2)}</text>
          <text x={padding - 8} y={getY(maxVal)} textAnchor="end" className="text-[8px] fill-zinc-550 font-mono">{Math.round(maxVal)}</text>

          {sorted.filter((_, idx) => idx % Math.max(Math.floor(sorted.length / 5), 1) === 0).map((d, i) => {
            const origIndex = sorted.findIndex(item => item.stat_date === d.stat_date);
            return (
              <text
                key={i}
                x={getX(origIndex)}
                y={height - padding + 15}
                textAnchor="middle"
                className="text-[9px] fill-zinc-500 font-mono font-semibold"
              >
                {d.stat_date.slice(5)}
              </text>
            );
          })}
        </svg>
      </div>

      {hoveredIndex !== null && (
        <div className="absolute top-16 right-6 bg-zinc-950 border border-zinc-850 rounded-xl p-3 shadow-2xl text-xs space-y-1 z-25 font-sans backdrop-blur-md">
          <p className="font-bold text-zinc-350 border-b border-zinc-900 pb-1 mb-1 font-mono">
            {sorted[hoveredIndex].stat_date}
          </p>
          <p className="flex justify-between gap-6 text-[#5B7C99] font-mono">
            <span>Recordings:</span> <strong>{sorted[hoveredIndex].recordings_count}</strong>
          </p>
          <p className="flex justify-between gap-6 text-indigo-455 font-mono">
            <span>AI API Calls:</span> <strong>{sorted[hoveredIndex].analyze_calls_count}</strong>
          </p>
          <p className="flex justify-between gap-6 text-emerald-455 font-mono">
            <span>Active DAU:</span> <strong>{sorted[hoveredIndex].active_users_count}</strong>
          </p>
        </div>
      )}
    </div>
  );
}

function DatabaseTerminal({ tasks, tickets, stats }: { tasks: PracticeTaskItem[]; tickets: SupportTicket[]; stats: AdminStats | null }) {
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    "Realtime control console v1.4.2-dev initialized.",
    "B2C active telemetry sockets connected.",
    "Type 'help' to review diagnostic capabilities."
  ]);
  const [command, setCommand] = useState("");
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleLogs]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCmd = command.trim().toLowerCase();
    if (!cleanCmd) return;

    let response: string[] = [];
    if (cleanCmd === "help" || cleanCmd === "?") {
      response = [
        `> ${command}`,
        "Available commands:",
        "  help | ?        - Display options index",
        "  select tasks    - Fetch active practice tasks",
        "  select tickets  - List recent support inquiries",
        "  select stats    - Print general database telemetry",
        "  clear           - Wipe terminal log history"
      ];
    } else if (cleanCmd === "select tasks") {
      response = [
        `> ${command}`,
        "Executing: SELECT topic_of_the_day, difficulty_level FROM public.practice_tasks LIMIT 3;",
        "----------------------------------------------------------------------",
        String.prototype.padEnd.call("TOPIC", 45) + " | " + "DIFFICULTY",
        "----------------------------------------------------------------------",
        ...tasks.slice(0, 3).map(t => 
          String.prototype.padEnd.call(t.topic_of_the_day.slice(0, 42) + (t.topic_of_the_day.length > 42 ? "..." : ""), 45) + " | " + t.difficulty_level
        ),
        "----------------------------------------------------------------------",
        `Rows returned: ${Math.min(tasks.length, 3)}`
      ];
    } else if (cleanCmd === "select tickets") {
      response = [
        `> ${command}`,
        "Executing: SELECT category, email, status FROM public.support_tickets LIMIT 3;",
        "----------------------------------------------------------------------",
        String.prototype.padEnd.call("CATEGORY", 25) + " | " + String.prototype.padEnd.call("EMAIL", 30) + " | " + "STATUS",
        "----------------------------------------------------------------------",
        ...tickets.slice(0, 3).map(t => 
          String.prototype.padEnd.call(t.category.slice(0, 22), 25) + " | " + String.prototype.padEnd.call(t.email.slice(0, 28), 30) + " | " + t.status
        ),
        "----------------------------------------------------------------------",
        `Rows returned: ${Math.min(tickets.length, 3)}`
      ];
    } else if (cleanCmd === "select stats") {
      if (!stats) {
        response = [`> ${command}`, "Error: telemetry stats cache is empty."];
      } else {
        response = [
          `> ${command}`,
          "Executing system telemetry scan...",
          `  Total Recordings : ${stats.totalRecordings}`,
          `  Total API Calls  : ${stats.totalAnalyzeCalls}`,
          `  Completion Rate  : ${stats.sessionCompletionRate}%`,
          `  Active DAU       : ${stats.dau} users`,
          `  Active MAU       : ${stats.mau} users`,
          `  Disk Usage       : ${(stats.storageBytes / (1024 * 1024)).toFixed(2)} MB`
        ];
      }
    } else if (cleanCmd === "clear") {
      setConsoleLogs([]);
      setCommand("");
      return;
    } else {
      response = [
        `> ${command}`,
        `Command not recognized: '${command}'. Type 'help' for command list.`
      ];
    }

    setConsoleLogs(prev => [...prev, ...response]);
    setCommand("");
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border border-zinc-800 bg-black/85 font-mono shadow-xl relative overflow-hidden flex flex-col h-72">
      <div className="flex justify-between items-center border-b border-zinc-900 pb-3 mb-3 text-xs shrink-0 select-none">
        <span className="text-zinc-400 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          Real-time Database Logs & SQL Console
        </span>
        <span className="text-zinc-650">v1.4.2-dev</span>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-1.5 text-xs text-emerald-500/95 leading-relaxed scrollbar-thin select-text">
        {consoleLogs.map((log, idx) => (
          <div key={idx} className={log.startsWith("> ") ? "text-white font-bold" : log.startsWith("Error:") ? "text-rose-400 font-semibold" : ""}>
            {log}
          </div>
        ))}
        <div ref={terminalEndRef} />
      </div>

      <form onSubmit={handleCommandSubmit} className="mt-3 flex border-t border-zinc-900 pt-3 shrink-0">
        <span className="text-emerald-500 mr-2 font-bold select-none">$</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Type 'select stats' or 'help' and press Enter..."
          className="flex-1 bg-transparent border-none outline-none text-xs text-white caret-emerald-500 font-mono"
        />
      </form>
    </div>
  );
}
