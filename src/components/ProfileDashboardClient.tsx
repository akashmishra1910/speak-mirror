"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Flame, 
  Trophy, 
  Calendar, 
  Target, 
  Loader2, 
  Play, 
  X, 
  Share2, 
  Download,
  LayoutDashboard,
  Video,
  Settings,
  Trash2,
  Search,
  AlertTriangle,
  ChevronRight,
  FileText,
  Sparkles
} from "lucide-react";
import { FluencyCard } from "@/components/FluencyCard";
import { useEffect, useState } from "react";
import { BEAUTIFY_FILTERS } from "@/lib/filters";
import { supabase } from "@/lib/supabase";
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
  eye_contact?: number | null;
  expression_score?: number | null;
  primary_emotion?: string | null;
  pause_duration?: number | null;
  coach_comment?: string | null;
  annotations?: any | null;
}

export default function ProfileDashboardClient({ user, initialRecordings }: { user: any; initialRecordings: Recording[] }) {
  const router = useRouter();

  // Tab State
  const [activeTab, setActiveTab] = useState<"overview" | "recordings" | "settings">("overview");

  // Core Data States
  const [recordings, setRecordings] = useState<Recording[]>(initialRecordings);
  const [isLoading, setIsLoading] = useState(false);
  const [watchRecording, setWatchRecording] = useState<Recording | null>(null);
  const [shareRecording, setShareRecording] = useState<Recording | null>(null);
  const [activeFilter, setActiveFilter] = useState("studio");

  // Preferences States
  const [difficultyLevel, setDifficultyLevel] = useState<string>("Beginner");
  const [isUpdatingLevel, setIsUpdatingLevel] = useState(false);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Danger Zone States
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);

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

  const handleClearHistory = async () => {
    if (!user) return;
    
    const confirm = window.confirm("Are you absolutely sure you want to clear your practice history? This will permanently delete all of your audio/video recordings and diagnostic metrics. This action CANNOT be undone.");
    if (!confirm) return;

    setIsClearingHistory(true);
    try {
      const { error } = await supabase
        .from("recordings")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;
      setRecordings([]);
      alert("Practice history cleared successfully.");
    } catch (err) {
      console.error("Failed to clear practice history:", err);
      alert("Error clearing history. Please try again.");
    } finally {
      setIsClearingHistory(false);
    }
  };

  const handleDeleteRecording = async (recordingId: string) => {
    if (!user) return;
    
    const confirm = window.confirm("Are you sure you want to permanently delete this practice recording? This action cannot be undone.");
    if (!confirm) return;

    try {
      const { error } = await supabase
        .from("recordings")
        .delete()
        .eq("id", recordingId)
        .eq("user_id", user.id);

      if (error) throw error;
      
      setRecordings((prev) => prev.filter((r) => r.id !== recordingId));
      if (watchRecording?.id === recordingId) setWatchRecording(null);
      if (shareRecording?.id === recordingId) setShareRecording(null);
      
      alert("Recording deleted successfully.");
    } catch (err) {
      console.error("Failed to delete recording:", err);
      alert("Error deleting recording. Please try again.");
    }
  };

  const handleExportPDF = async (rec: Recording) => {
    if (!user) return;
    setExportingId(rec.id);
    try {
      // 1. Dynamic load of jsPDF from CDN
      let jsPDFClass = (window as any).jspdf?.jsPDF;
      if (!jsPDFClass) {
        const scriptId = "jspdf-cdn-script";
        let script = document.getElementById(scriptId) as HTMLScriptElement;
        if (!script) {
          script = document.createElement("script");
          script.id = scriptId;
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
          script.async = true;
          document.body.appendChild(script);
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
          });
        } else {
          await new Promise((resolve) => {
            const check = setInterval(() => {
              if ((window as any).jspdf?.jsPDF) {
                clearInterval(check);
                resolve(true);
              }
            }, 100);
          });
        }
        jsPDFClass = (window as any).jspdf.jsPDF;
      }

      if (!jsPDFClass) {
        alert("Failed to load PDF export library. Please check your network connection.");
        return;
      }

      // 2. Initialize jsPDF (A4 size: 210mm x 297mm)
      const doc = new jsPDFClass({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const margin = 20;
      let y = 20;

      // Dark Header Banner
      doc.setFillColor(9, 9, 13);
      doc.rect(0, 0, 210, 40, "F");

      // App Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text("SPEAKMIRROR", margin, 26);
      
      // Subtitle
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text("// SPONTANEOUS SPEECH DIAGNOSTICS REPORT", margin, 33);

      // Date of Report
      doc.setFont("courier", "bold");
      doc.setFontSize(9);
      doc.setTextColor(99, 102, 241);
      const dateStr = new Date(rec.created_at).toLocaleDateString("en-US", {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      doc.text(`DATE: ${dateStr.toUpperCase()}`, 210 - margin, 26, { align: "right" });

      y = 55;

      // Section 1: Evaluation Details
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(31, 41, 55);
      doc.text("SPEECH EVALUATION DETAILS", margin, y);
      y += 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text("SPEAKER:", margin, y);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(17, 24, 39);
      const speakerName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "A Speaker";
      doc.text(speakerName, margin + 28, y);
      y += 6;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text("TOPIC / TASK:", margin, y);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(17, 24, 39);
      const topicText = rec.topic || "Free Practice Session";
      const splitTopicText = doc.splitTextToSize(topicText, 140);
      doc.text(splitTopicText, margin + 28, y);
      y += splitTopicText.length * 5 + 6;

      // Draw line separator
      doc.setDrawColor(229, 231, 235);
      doc.line(margin, y, 210 - margin, y);
      y += 10;

      // Section 2: Telemetry Metrics Grid
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(31, 41, 55);
      doc.text("DIAGNOSTIC TELEMETRY INDEX", margin, y);
      y += 8;

      const hasScore = rec.confidence !== undefined && rec.confidence !== null;
      const gridItems = [
        { label: "CONFIDENCE", val: hasScore ? `${rec.confidence}%` : "Pending" },
        { label: "CLARITY", val: hasScore ? `${rec.clarity}%` : "Pending" },
        { label: "PACING", val: rec.wpm !== undefined && rec.wpm !== null ? `${rec.wpm} WPM` : "—" },
        { label: "FILLER WORDS", val: rec.filler_words !== undefined && rec.filler_words !== null ? `${rec.filler_words}` : "—" }
      ];

      if (rec.eye_contact !== undefined && rec.eye_contact !== null) {
        gridItems.push({ label: "EYE CONTACT", val: `${rec.eye_contact}%` });
      }
      if (rec.expression_score !== undefined && rec.expression_score !== null) {
        gridItems.push({ label: "EXPRESSION SCORE", val: `${rec.expression_score}%` });
      }

      let itemIndex = 0;
      gridItems.forEach((item) => {
        const col = itemIndex % 2;
        const row = Math.floor(itemIndex / 2);
        
        const cardX = margin + col * 88;
        const cardY = y + row * 18;
        
        // Draw card background
        doc.setFillColor(243, 244, 246);
        doc.rect(cardX, cardY, 82, 14, "F");
        
        // Text labels
        doc.setFont("courier", "bold");
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(`// ${item.label.toLowerCase().replace(" ", "_")}`, cardX + 4, cardY + 5.5);
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(17, 24, 39);
        doc.text(item.val, cardX + 4, cardY + 11.5);
        
        itemIndex++;
      });

      y += Math.ceil(gridItems.length / 2) * 18 + 8;

      // Draw line separator
      doc.setDrawColor(229, 231, 235);
      doc.line(margin, y, 210 - margin, y);
      y += 10;

      // Section 3: AI Coaching Insights Suggestions
      if (hasScore) {
        const suggestions = [];
        if (rec.confidence < 75) {
          suggestions.push("Focus on breathing and deliberate pauses to enhance vocal confidence.");
        }
        if (rec.clarity < 75) {
          suggestions.push("Ensure crisp articulation of word endings and adjust speech tempo.");
        }
        if (rec.filler_words !== undefined && rec.filler_words !== null && rec.filler_words > 5) {
          suggestions.push("Replace conversational fillers (e.g., 'like', 'um', 'ah') with silent, intentional pauses.");
        }
        if (rec.wpm !== undefined && rec.wpm !== null && (rec.wpm < 110 || rec.wpm > 160)) {
          suggestions.push(`Your pacing was ${rec.wpm} WPM. Aim for a balanced tempo of 120-150 WPM for maximum impact.`);
        }
        if (suggestions.length === 0) {
          suggestions.push("Excellent delivery! Continue practicing to maintain this high level of fluency.");
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(31, 41, 55);
        doc.text("AI DIAGNOSTIC ANALYSIS & INSIGHTS", margin, y);
        y += 8;

        doc.setFontSize(9);
        
        suggestions.forEach((text, i) => {
          const splitSug = doc.splitTextToSize(text, 155);
          
          if (y + splitSug.length * 5 > 275) {
            doc.addPage();
            y = 20;
          }

          doc.setFont("courier", "bold");
          doc.setTextColor(99, 102, 241);
          doc.text(`0${i+1} //`, margin, y);

          doc.setFont("helvetica", "normal");
          doc.setTextColor(55, 65, 81);
          doc.text(splitSug, margin + 15, y);
          y += splitSug.length * 5 + 3;
        });

        y += 6;
        
        // Draw separator
        doc.setDrawColor(229, 231, 235);
        doc.line(margin, y, 210 - margin, y);
        y += 10;
      }

      // Section 4: Transcript Output
      if (rec.transcript) {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(31, 41, 55);
        doc.text("SPEECH TRANSCRIPT DUMP", margin, y);
        y += 8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(55, 65, 81);
        
        const splitTranscript = doc.splitTextToSize(rec.transcript, 170);
        
        splitTranscript.forEach((line: string) => {
          if (y > 275) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, margin, y);
          y += 5.5;
        });
      }

      // Export file download
      doc.save(`speakmirror-evaluation-${new Date(rec.created_at).toISOString().split('T')[0]}-${rec.id.substring(0, 8)}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to export PDF: " + (err as Error).message);
    } finally {
      setExportingId(null);
    }
  };

  const avgConfidence = recordings.length > 0 
    ? Math.round(recordings.reduce((acc, curr) => acc + (curr.confidence || 0), 0) / recordings.length) 
    : 0;

  const getPracticeMetrics = () => {
    if (recordings.length === 0) return { streak: 0, activeDays: 0 };
    
    const dates = recordings.map(r => {
      const d = new Date(r.created_at);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    });
    
    const uniqueTimestamps = Array.from(new Set(dates)).sort((a, b) => b - a);
    const activeDays = uniqueTimestamps.length;
    
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const yesterdayMidnight = todayMidnight - 86400000;
    
    const mostRecent = uniqueTimestamps[0];
    
    let streak = 0;
    if (mostRecent === todayMidnight || mostRecent === yesterdayMidnight) {
      streak = 1;
      for (let i = 0; i < uniqueTimestamps.length - 1; i++) {
        const diff = uniqueTimestamps[i] - uniqueTimestamps[i + 1];
        if (diff === 86400000) {
          streak++;
        } else if (diff > 86400000) {
          break;
        }
      }
    }
    
    return { streak, activeDays };
  };

  const { streak, activeDays } = getPracticeMetrics();

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Filtered Recordings for Extended View
  const filteredRecordings = recordings.filter(item => {
    const matchesSearch = (item.topic || "Free Practice").toLowerCase().includes(searchTerm.toLowerCase());
    const hasScore = item.confidence !== undefined && item.confidence !== null;
    
    if (statusFilter === "completed") {
      return matchesSearch && hasScore;
    }
    if (statusFilter === "analyzing") {
      return matchesSearch && !hasScore;
    }
    return matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold mb-3 text-themeText dark:text-white">
          {user?.user_metadata?.full_name ? `${user.user_metadata.full_name}'s Dashboard` : "Your Dashboard"}
        </h1>
        <p className="text-slate-655 dark:text-foreground/60 max-w-xl font-light leading-relaxed text-sm md:text-base">
          Track your metrics, view complete practice history, and manage preferences within a modern SaaS suite.
        </p>
      </motion.div>

      {/* Main Layout Grid */}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Left Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0 flex flex-row md:flex-col gap-2 p-2 bg-slate-100/80 dark:bg-surface rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-white/5 overflow-x-auto md:overflow-x-visible">
          {/* Navigation Title */}
          <div className="hidden md:block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500 mb-2 mt-2 px-3">
            Console Menu
          </div>
          
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-auto md:w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-[#5B7C99] text-white shadow-md dark:bg-white dark:text-black font-bold"
                : "text-slate-600 hover:text-[#5B7C99] dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5"
            }`}
          >
            <LayoutDashboard className="w-4.5 h-4.5" />
            Overview
          </button>

          <button
            onClick={() => setActiveTab("recordings")}
            className={`w-auto md:w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "recordings"
                ? "bg-[#5B7C99] text-white shadow-md dark:bg-white dark:text-black font-bold"
                : "text-slate-600 hover:text-[#5B7C99] dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5"
            }`}
          >
            <Video className="w-4.5 h-4.5" />
            Recordings
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`w-auto md:w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "settings"
                ? "bg-[#5B7C99] text-white shadow-md dark:bg-white dark:text-black font-bold"
                : "text-slate-600 hover:text-[#5B7C99] dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5"
            }`}
          >
            <Settings className="w-4.5 h-4.5" />
            Settings
          </button>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 w-full min-w-0">
          <AnimatePresence mode="wait">
            
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                {/* Metric Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Streak Card */}
                  <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white/60 dark:bg-surface/10 hover:border-slate-300 dark:hover:border-zinc-800 transition-colors flex items-center gap-5 float-slow interactive-card">
                    <div className="w-14 h-14 shrink-0 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                      <Flame className="w-7 h-7 text-orange-500" />
                    </div>
                    <div>
                      <div className="text-2xl font-extrabold text-slate-800 dark:text-white">{streak} Days</div>
                      <div className="text-slate-555 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Active Streak</div>
                    </div>
                  </div>

                  {/* Avg Confidence Card */}
                  <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white/60 dark:bg-surface/10 hover:border-slate-300 dark:hover:border-zinc-800 transition-colors flex items-center gap-5 float-medium interactive-card">
                    <div className="w-14 h-14 shrink-0 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                      <Target className="w-7 h-7 text-[#5B7C99] dark:text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-extrabold text-slate-800 dark:text-white">{avgConfidence}%</div>
                      <div className="text-slate-555 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Avg. Confidence</div>
                    </div>
                  </div>

                  {/* Practice Days Card */}
                  <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white/60 dark:bg-surface/10 hover:border-slate-300 dark:hover:border-zinc-800 transition-colors flex items-center gap-5 float-fast interactive-card">
                    <div className="w-14 h-14 shrink-0 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                      <Trophy className="w-7 h-7 text-purple-500" />
                    </div>
                    <div>
                      <div className="text-2xl font-extrabold text-slate-800 dark:text-white">{activeDays} Days</div>
                      <div className="text-slate-555 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Practice Days</div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity Data Table */}
                <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white/60 dark:bg-surface/10">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                      <Calendar className="w-5 h-5 text-[#5B7C99] dark:text-zinc-350" />
                      Recent Activity
                    </h2>
                    <button 
                      onClick={() => setActiveTab("recordings")} 
                      className="text-xs font-bold text-[#5B7C99] dark:text-[#E0F2FE] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      View all recordings <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  {/* Summary Table (Desktop) */}
                  <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200/60 dark:border-white/5">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-white/[0.02] text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-foreground/50">
                          <th className="p-4">Topic / Prompt</th>
                          <th className="p-4">Recorded Date</th>
                          <th className="p-4 text-center">Confidence</th>
                          <th className="p-4 text-center">Clarity</th>
                          <th className="p-4 text-center">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs text-slate-700 dark:text-zinc-350">
                        {recordings.slice(0, 5).map((item) => {
                          const hasScore = item.confidence !== undefined && item.confidence !== null;
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all">
                              <td className="p-4 font-semibold text-slate-800 dark:text-white max-w-[200px] truncate">
                                {item.topic || "Free Practice"}
                              </td>
                              <td className="p-4 text-slate-550 dark:text-zinc-400 font-light">
                                {formatDate(item.created_at)}
                              </td>
                              <td className="p-4 text-center font-bold text-slate-800 dark:text-white">
                                {hasScore ? `${item.confidence}%` : "—"}
                              </td>
                              <td className="p-4 text-center font-semibold text-slate-600 dark:text-zinc-300">
                                {hasScore ? `${item.clarity}%` : "—"}
                              </td>
                              <td className="p-4 text-center">
                                {hasScore ? (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                                    Completed
                                  </span>
                                ) : (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20 animate-pulse">
                                    Analyzing
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {item.video_url && (
                                    <>
                                      <button 
                                        onClick={() => setWatchRecording(item)}
                                        className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/10 dark:hover:bg-indigo-600/20 border border-indigo-500/10 text-indigo-600 dark:text-indigo-400 transition-all cursor-pointer"
                                        title="Watch Video"
                                      >
                                        <Play className="w-3.5 h-3.5 fill-current" />
                                      </button>
                                      <button 
                                        onClick={() => handleExportPDF(item)}
                                        disabled={exportingId !== null}
                                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/10 dark:hover:bg-emerald-600/20 border border-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-all cursor-pointer disabled:opacity-50"
                                        title="Download PDF Report"
                                      >
                                        {exportingId === item.id ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <FileText className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                      <button 
                                        onClick={() => setShareRecording(item)}
                                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 transition-all cursor-pointer"
                                        title="Share Card"
                                      >
                                        <Share2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteRecording(item.id)}
                                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-600/10 dark:hover:bg-rose-600/20 border border-rose-500/10 text-rose-600 dark:text-rose-400 transition-all cursor-pointer"
                                        title="Delete Recording"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {recordings.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-zinc-500 font-light">
                              No recordings found. Go practice to populate your history dashboard!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary List (Mobile) */}
                  <div className="block sm:hidden space-y-4">
                    {recordings.slice(0, 5).map((item) => {
                      const hasScore = item.confidence !== undefined && item.confidence !== null;
                      return (
                        <div key={item.id} className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white/60 dark:bg-surface/10 space-y-3">
                          <div className="flex justify-between items-start">
                            <h3 className="font-semibold text-slate-800 dark:text-white text-xs truncate max-w-[70%]">
                              {item.topic || "Free Practice"}
                            </h3>
                            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-light">
                              {formatDate(item.created_at)}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex gap-4">
                              <div>
                                <span className="text-slate-555 dark:text-zinc-500 text-[9px] block uppercase font-bold tracking-wider">Confidence</span>
                                <span className="font-bold text-slate-800 dark:text-white">{hasScore ? `${item.confidence}%` : "—"}</span>
                              </div>
                              <div>
                                <span className="text-slate-555 dark:text-zinc-500 text-[9px] block uppercase font-bold tracking-wider">Clarity</span>
                                <span className="font-semibold text-slate-600 dark:text-zinc-300">{hasScore ? `${item.clarity}%` : "—"}</span>
                              </div>
                            </div>
                            <div>
                              {hasScore ? (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                                  Completed
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20 animate-pulse">
                                  Analyzing
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                            {item.video_url && (
                              <>
                                <button 
                                  onClick={() => setWatchRecording(item)}
                                  className="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/10 dark:hover:bg-indigo-600/20 border border-indigo-500/10 text-indigo-600 dark:text-indigo-400 transition-all cursor-pointer"
                                  title="Watch Video"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                </button>
                                <button 
                                  onClick={() => handleExportPDF(item)}
                                  disabled={exportingId !== null}
                                  className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/10 dark:hover:bg-emerald-600/20 border border-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-all cursor-pointer disabled:opacity-50"
                                  title="Download PDF Report"
                                >
                                  {exportingId === item.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button 
                                  onClick={() => setShareRecording(item)}
                                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 transition-all cursor-pointer"
                                  title="Share Card"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteRecording(item.id)}
                                  className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-600/10 dark:hover:bg-rose-600/20 border border-rose-500/10 text-rose-600 dark:text-rose-400 transition-all cursor-pointer"
                                  title="Delete Recording"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {recordings.length === 0 && (
                      <div className="p-8 text-center text-slate-500 dark:text-zinc-500 font-light text-xs">
                        No recordings found. Go practice to populate your history dashboard!
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* RECORDINGS TAB */}
            {activeTab === "recordings" && (
              <motion.div
                key="recordings"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white/60 dark:bg-surface/10">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                      <Video className="w-5 h-5 text-[#5B7C99] dark:text-zinc-300" />
                      All Practice History
                    </h2>
                    
                    {/* Filters Row */}
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="relative flex-1 sm:flex-none">
                        <input 
                          type="text"
                          placeholder="Search topics..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full sm:w-60 bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-foreground/30 focus:outline-none focus:border-slate-400 dark:focus:border-white transition-colors"
                        />
                        <Search className="w-4 h-4 text-slate-400 dark:text-foreground/30 absolute left-3 top-3" />
                      </div>
                      
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-white/85 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-white focus:outline-none cursor-pointer"
                      >
                        <option value="all">All Status</option>
                        <option value="completed">Completed</option>
                        <option value="analyzing">Analyzing</option>
                      </select>
                    </div>
                  </div>

                  {/* Main Extended Data Table (Desktop) */}
                  <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200/60 dark:border-white/5">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-white/[0.02] text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-foreground/50">
                          <th className="p-4">Topic / Prompt</th>
                          <th className="p-4">Recorded Date</th>
                          <th className="p-4 text-center">Confidence</th>
                          <th className="p-4 text-center">Clarity</th>
                          <th className="p-4 text-center">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs text-slate-700 dark:text-zinc-350">
                        {filteredRecordings.map((item) => {
                          const hasScore = item.confidence !== undefined && item.confidence !== null;
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all">
                              <td className="p-4 font-semibold text-slate-800 dark:text-white max-w-[250px] truncate">
                                {item.topic || "Free Practice"}
                              </td>
                              <td className="p-4 text-slate-555 dark:text-zinc-400 font-light">
                                {formatDate(item.created_at)}
                              </td>
                              <td className="p-4 text-center font-bold text-slate-800 dark:text-white">
                                {hasScore ? `${item.confidence}%` : "—"}
                              </td>
                              <td className="p-4 text-center font-semibold text-slate-600 dark:text-zinc-300">
                                {hasScore ? `${item.clarity}%` : "—"}
                              </td>
                              <td className="p-4 text-center">
                                {hasScore ? (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                                    Completed
                                  </span>
                                ) : (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20 animate-pulse">
                                    Analyzing
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {item.video_url && (
                                    <>
                                      <button 
                                        onClick={() => setWatchRecording(item)}
                                        className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/10 dark:hover:bg-indigo-600/20 border border-indigo-500/10 text-indigo-600 dark:text-indigo-400 transition-all cursor-pointer"
                                        title="Watch Video"
                                      >
                                        <Play className="w-3.5 h-3.5 fill-current" />
                                      </button>
                                      <button 
                                        onClick={() => handleExportPDF(item)}
                                        disabled={exportingId !== null}
                                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/10 dark:hover:bg-emerald-600/20 border border-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-all cursor-pointer disabled:opacity-50"
                                        title="Download PDF Report"
                                      >
                                        {exportingId === item.id ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <FileText className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                      <button 
                                        onClick={() => setShareRecording(item)}
                                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 transition-all cursor-pointer"
                                        title="Share Card"
                                      >
                                        <Share2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteRecording(item.id)}
                                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-600/10 dark:hover:bg-rose-600/20 border border-rose-500/10 text-rose-600 dark:text-rose-400 transition-all cursor-pointer"
                                        title="Delete Recording"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredRecordings.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-12 text-center text-slate-500 dark:text-zinc-500 font-light">
                              {recordings.length === 0 
                                ? "No recordings found. Go practice to populate your history!" 
                                : "No results match your search parameters."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Main Extended List (Mobile) */}
                  <div className="block sm:hidden space-y-4">
                    {filteredRecordings.map((item) => {
                      const hasScore = item.confidence !== undefined && item.confidence !== null;
                      return (
                        <div key={item.id} className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white/60 dark:bg-surface/10 space-y-3">
                          <div className="flex justify-between items-start">
                            <h3 className="font-semibold text-slate-800 dark:text-white text-xs truncate max-w-[70%]">
                              {item.topic || "Free Practice"}
                            </h3>
                            <span className="text-[10px] text-slate-555 dark:text-zinc-400 font-light">
                              {formatDate(item.created_at)}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex gap-4">
                              <div>
                                <span className="text-slate-555 dark:text-zinc-500 text-[9px] block uppercase font-bold tracking-wider">Confidence</span>
                                <span className="font-bold text-slate-800 dark:text-white">{hasScore ? `${item.confidence}%` : "—"}</span>
                              </div>
                              <div>
                                <span className="text-slate-555 dark:text-zinc-500 text-[9px] block uppercase font-bold tracking-wider">Clarity</span>
                                <span className="font-semibold text-slate-600 dark:text-zinc-300">{hasScore ? `${item.clarity}%` : "—"}</span>
                              </div>
                            </div>
                            <div>
                              {hasScore ? (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                                  Completed
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20 animate-pulse">
                                  Analyzing
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                            {item.video_url && (
                              <>
                                <button 
                                  onClick={() => setWatchRecording(item)}
                                  className="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/10 dark:hover:bg-indigo-600/20 border border-indigo-500/10 text-indigo-600 dark:text-indigo-400 transition-all cursor-pointer"
                                  title="Watch Video"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                </button>
                                <button 
                                  onClick={() => handleExportPDF(item)}
                                  disabled={exportingId !== null}
                                  className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/10 dark:hover:bg-emerald-600/20 border border-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-all cursor-pointer disabled:opacity-50"
                                  title="Download PDF Report"
                                >
                                  {exportingId === item.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button 
                                  onClick={() => setShareRecording(item)}
                                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 transition-all cursor-pointer"
                                  title="Share Card"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteRecording(item.id)}
                                  className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-600/10 dark:hover:bg-rose-600/20 border border-rose-500/10 text-rose-600 dark:text-rose-400 transition-all cursor-pointer"
                                  title="Delete Recording"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {filteredRecordings.length === 0 && (
                      <div className="p-12 text-center text-slate-500 dark:text-zinc-500 font-light text-xs">
                        {recordings.length === 0 
                          ? "No recordings found. Go practice to populate your history!" 
                          : "No results match your search parameters."}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                {/* Preference Settings Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Difficulty Preference Card */}
                  <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white/60 dark:bg-surface/10 flex flex-col text-left">
                    <h2 className="text-lg font-bold mb-4 text-slate-800 dark:text-white flex items-center gap-2">
                      <Target className="w-5 h-5 text-indigo-650 dark:text-indigo-400 animate-pulse" />
                      Practice Difficulty
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-light mb-6">
                      Adjust the complexity of dynamic topics generated for your practice.
                    </p>
                    
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {["Beginner", "Intermediate", "Advanced"].map((level) => {
                        const isActive = difficultyLevel === level;
                        return (
                          <button
                            key={level}
                            onClick={() => handleUpdateDifficulty(level)}
                            disabled={isUpdatingLevel}
                            className={`py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center cursor-pointer ${
                              isActive
                                ? "bg-indigo-650 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                                : "bg-slate-100/80 dark:bg-white/5 dark:border-white/5 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
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
                    
                    <div className="mt-auto p-3.5 rounded-xl bg-slate-50/50 dark:bg-white/[0.01] border border-slate-200/50 dark:border-white/5 text-[10px] text-slate-500 dark:text-zinc-500 font-light leading-relaxed">
                      {difficultyLevel === "Beginner" && "Generates simple, relatable everyday topics to build confidence and fluency."}
                      {difficultyLevel === "Intermediate" && "Generates professional or abstract topics to practice structuring arguments."}
                      {difficultyLevel === "Advanced" && "Generates complex, philosophical, or technical topics to test deep spontaneous delivery."}
                    </div>
                  </div>

                  {/* Beautify Camera Settings Card */}
                  <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white/60 dark:bg-surface/10 flex flex-col text-left">
                    <h2 className="text-lg font-bold mb-4 text-slate-800 dark:text-white flex items-center gap-2">
                      <Target className="w-5 h-5 text-indigo-650 dark:text-indigo-400 animate-pulse" />
                      Beautify Filter
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-light mb-6">
                      Select a default video color filter for your camera interface.
                    </p>
                    
                    <select
                      value={activeFilter}
                      onChange={(e) => {
                        const val = e.target.value;
                        setActiveFilter(val);
                        localStorage.setItem("speak_mirror_beautify_filter", val);
                      }}
                      className="w-full p-2.5 rounded-xl bg-white/80 border border-slate-200/60 text-xs text-slate-800 dark:bg-white/5 dark:border-white/10 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm dark:shadow-none mb-4"
                    >
                      <option value="none" className="bg-white text-slate-800 dark:bg-[#09090d] dark:text-white">Original (No filter)</option>
                      <option value="studio" className="bg-white text-slate-800 dark:bg-[#09090d] dark:text-white">Studio Glow ✨</option>
                      <option value="warm" className="bg-white text-slate-800 dark:bg-[#09090d] dark:text-white">Warm Golden ☀️</option>
                      <option value="cool" className="bg-white text-slate-800 dark:bg-[#09090d] dark:text-white">Nordic Cool ❄️</option>
                      <option value="smooth" className="bg-white text-slate-800 dark:bg-[#09090d] dark:text-white">Soft Focus 🌸</option>
                    </select>

                    <div className="mt-auto p-3.5 rounded-xl bg-slate-50/50 dark:bg-white/[0.01] border border-slate-200/50 dark:border-white/5 text-[10px] text-slate-500 dark:text-zinc-500 font-light leading-relaxed">
                      Your chosen video filter will be applied automatically when starting new practice sessions.
                    </div>
                  </div>
                </div>

                {/* Classic Red-Bordered Danger Zone Card */}
                <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-red-500/20 bg-rose-500/5 dark:bg-rose-950/5 shadow-[0_4px_30px_rgba(239,68,68,0.02)] flex flex-col text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5.5 h-5.5 text-red-500 animate-pulse" />
                    <h2 className="text-lg font-bold text-red-500">Danger Zone</h2>
                  </div>
                  <p className="text-xs text-slate-555 dark:text-zinc-400 font-light mb-6">
                    Destructive actions cannot be undone. Please proceed with caution.
                  </p>

                  <div className="divide-y divide-red-500/10">
                    {/* Clear History Row */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4 first:pt-0 last:pb-0">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Clear Practice History</h3>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 font-light mt-0.5 leading-relaxed">
                          Delete all your recorded videos, transcripts, scores, and fluency metrics.
                        </p>
                      </div>
                      <button
                        onClick={handleClearHistory}
                        disabled={isClearingHistory}
                        className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/10 hover:shadow-red-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isClearingHistory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        {isClearingHistory ? "Clearing History..." : "Clear All History"}
                      </button>
                    </div>

                    {/* Reset Preferences Row */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4 last:pb-0">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Reset Account Session</h3>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 font-light mt-0.5 leading-relaxed">
                          Reset difficulty settings to Beginner, clean filter selections, and sign out of this device.
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          const confirm = window.confirm("Are you sure you want to reset your account preferences and sign out?");
                          if (!confirm) return;
                          localStorage.removeItem("speak_mirror_beautify_filter");
                          await supabase.auth.signOut();
                          router.push("/auth");
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 border border-red-500/30 bg-white/40 hover:bg-red-500/10 text-red-500 dark:bg-white/5 dark:hover:bg-red-950/20 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        Reset & Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
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
              className="relative max-w-lg w-full glass-panel p-6 rounded-[2rem] border border-slate-200 dark:border-white/10 dark:bg-[#09090d]/95 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-left flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
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
                <h3 className="text-xl font-extrabold text-slate-800 dark:text-white line-clamp-1 pr-12">
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
              <div className="glass-panel px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 dark:bg-white/[0.01] flex items-center justify-between text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Beautify Filter:</span>
                <select
                  value={activeFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setActiveFilter(val);
                    localStorage.setItem("speak_mirror_beautify_filter", val);
                  }}
                  className="p-1 px-2 rounded-lg bg-white border border-slate-205 text-[10px] text-slate-800 dark:bg-white/5 dark:border-white/10 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
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
                  <div className="text-2xl font-black text-slate-800 dark:text-white">{watchRecording.confidence}%</div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-widest font-semibold mt-0.5">Confidence</div>
                </div>
                <div className="flex-1 p-3 rounded-xl bg-sky-500/5 dark:bg-white/[0.02] border border-sky-500/10 dark:border-white/5 text-center">
                  <div className="text-2xl font-black text-slate-800 dark:text-white">{watchRecording.clarity}%</div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-widest font-semibold mt-0.5">Clarity</div>
                </div>
              </div>

              {/* AI Coach Comment */}
              {watchRecording.coach_comment && (
                <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex gap-3 items-start text-left relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 text-indigo-500/10 pointer-events-none">
                    <Sparkles className="w-16 h-16 -mr-4 -mt-4 rotate-12" />
                  </div>
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="flex flex-col gap-0.5 relative z-10">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-indigo-400 font-mono">// ai_coach_feedback</span>
                    <p className="text-slate-800 dark:text-zinc-200 text-xs italic font-light leading-relaxed">
                      "{watchRecording.coach_comment}"
                    </p>
                  </div>
                </div>
              )}

              {/* Transcript */}
              {watchRecording.transcript && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-slate-550 dark:text-zinc-400 uppercase tracking-widest font-semibold">Transcript</span>
                  <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-white/[0.01] border border-slate-200/50 dark:border-white/5 text-xs text-slate-700 dark:text-zinc-300 leading-relaxed max-h-[120px] overflow-y-auto font-light">
                    {(() => {
                      const text = watchRecording.transcript;
                      const annotations = watchRecording.annotations;
                      if (!annotations || !Array.isArray(annotations) || annotations.length === 0) {
                        return <span>{text}</span>;
                      }
                      const sortedAnnotations = [...annotations].sort((a, b) => b.text.length - a.text.length);
                      const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                      const pattern = sortedAnnotations.map(a => `(${escapeRegExp(a.text)})`).join('|');
                      if (!pattern) return <span>{text}</span>;
                      const regex = new RegExp(pattern, 'gi');
                      const parts = text.split(regex);
                      return parts.map((part, index) => {
                        if (!part) return null;
                        const matched = sortedAnnotations.find(a => a.text.toLowerCase() === part.toLowerCase());
                        if (matched) {
                          const highlightColor = matched.type === 'filler' 
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30' 
                            : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30';
                          return (
                            <span 
                              key={index} 
                              className={`inline-block mx-0.5 px-0.5 rounded cursor-help font-semibold ${highlightColor}`}
                              title={`${matched.type === 'filler' ? 'Filler Word' : 'Pacing Deviation'}: ${matched.comment}`}
                            >
                              {part}
                            </span>
                          );
                        }
                        return <span key={index}>{part}</span>;
                      });
                    })()}
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
                className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all z-20 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mt-4">
                <FluencyCard 
                  userName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || "A Speaker"}
                  confidenceScore={shareRecording.confidence}
                  clarityScore={shareRecording.clarity || 88}
                  paceWpm={shareRecording.wpm || 135}
                  fillerWordsCount={typeof shareRecording.filler_words === 'number' 
                    ? shareRecording.filler_words 
                    : Math.max(0, Math.round((100 - shareRecording.confidence) / 10))}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
