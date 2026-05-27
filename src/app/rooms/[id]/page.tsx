"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { Loader2, Play, Users, Mic, ArrowLeft, Sparkles, Trash2, Mail, Copy, Check } from "lucide-react";
import Link from "next/link";

interface Room {
  id: string;
  name: string;
  created_by: string;
  organization_id?: string;
  invite_token?: string;
}

interface RoomTask {
  id: string;
  topic_of_the_day: string;
  word_of_the_day: string;
  word_meaning?: string;
  word_example?: string;
  idiom_of_the_day?: string;
  reading_text: string;
  created_at: string;
}

interface Recording {
  id: string;
  created_at: string;
  topic: string;
  confidence: number;
  clarity: number;
  video_url: string;
  user_id: string;
  user_name?: string;
}

export default function RoomDetailPage() {
  const { id } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [room, setRoom] = useState<Room | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [activeTask, setActiveTask] = useState<RoomTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedTeamId, setCopiedTeamId] = useState(false);

  const handleCopyTeamId = () => {
    if (room?.invite_token) {
      navigator.clipboard.writeText(room.invite_token);
      setCopiedTeamId(true);
      setTimeout(() => setCopiedTeamId(false), 2000);
    }
  };

  const handleDeleteRoom = async () => {
    if (!room) return;
    const confirmDelete = confirm(
      "Are you sure you want to permanently delete this room? This action will remove the practice room for you and all team members."
    );
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("rooms")
        .delete()
        .eq("id", room.id);

      if (error) throw error;
      
      alert("Room has been permanently deleted.");
      router.replace("/rooms");
    } catch (err: any) {
      console.error("Error deleting room:", err);
      alert("Failed to delete room: " + err.message);
    }
  };

  // Host Controls State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ 
    topic: "", word: "", meaning: "", example: "", idiom: "", text: "" 
  });
  const [savingTask, setSavingTask] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchRoomDetails = async () => {
      if (!user || !id) return;
      try {
        // Fetch room with organization invite_token
        const { data: roomData, error: roomError } = await supabase
          .from("rooms")
          .select("*, organizations(invite_token)")
          .eq("id", id)
          .single();

        if (roomError) throw roomError;

        // Safe extraction of invite_token with dual object/array fallback and direct query fallback
        let inviteToken = null;
        if (roomData) {
          if (roomData.organizations) {
            inviteToken = Array.isArray(roomData.organizations)
              ? roomData.organizations[0]?.invite_token
              : (roomData.organizations as any).invite_token;
          }
          
          if (!inviteToken && roomData.organization_id) {
            const { data: orgData } = await supabase
              .from("organizations")
              .select("invite_token")
              .eq("id", roomData.organization_id)
              .single();
            if (orgData) {
              inviteToken = orgData.invite_token;
            }
          }
          
          roomData.invite_token = inviteToken;
        }

        setRoom(roomData);

        // Fetch recordings
        try {
          const res = await fetch(`/api/room-recordings?roomId=${id}`);
          if (!res.ok) throw new Error("Failed to load recordings");
          const data = await res.json();
          setRecordings(data.recordings || []);
        } catch (err: any) {
          console.error("Error fetching recordings", err);
        }

        // Fetch latest task
        const { data: taskData } = await supabase
          .from("room_tasks")
          .select("*")
          .eq("room_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (taskData) setActiveTask(taskData);
      } catch (err) {
        console.error("Error fetching room details", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchRoomDetails();
    }
  }, [id, user]);

  useEffect(() => {
    if (user && room && user.id === room.created_by) {
      fetch(`/api/room-members?roomId=${room.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.members) setMembers(data.members);
        })
        .catch(err => console.error("Failed to fetch members:", err));
    }
  }, [user, room]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !room) return;
    setSavingTask(true);
    try {
      const { data, error } = await supabase
        .from("room_tasks")
        .insert({
          room_id: room.id,
          topic_of_the_day: newTask.topic,
          word_of_the_day: newTask.word,
          word_meaning: newTask.meaning,
          word_example: newTask.example,
          idiom_of_the_day: newTask.idiom,
          reading_text: newTask.text
        })
        .select()
        .single();
      
      if (error) throw error;
      setActiveTask(data);
      setIsTaskModalOpen(false);
      setNewTask({ topic: "", word: "", meaning: "", example: "", idiom: "", text: "" });

      // Fire email notification and alert the result so user can debug
      try {
        const emailRes = await fetch("/api/notify-team", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: room.id,
            roomName: room.name,
            task: data
          })
        });
        const emailData = await emailRes.json();
        if (emailRes.ok) {
           alert("Task Created! " + emailData.message);
        } else {
           alert("Task Created, but email failed: " + emailData.error);
        }
      } catch (emailErr) {
        console.error("Failed to trigger team notification email", emailErr);
      }

    } catch (err: any) {
      alert("Error creating task: " + err.message);
    } finally {
      setSavingTask(false);
    }
  };

  const handleSendEmail = async (task: any) => {
    if (!room) return;
    try {
      const emailRes = await fetch("/api/notify-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.id,
          roomName: room.name,
          task: task
        })
      });
      const emailData = await emailRes.json();
      if (emailRes.ok) {
         alert("Email Sent! " + emailData.message);
      } else {
         alert("Email failed: " + emailData.error);
      }
    } catch (emailErr) {
      console.error("Failed to trigger team notification email", emailErr);
      alert("Failed to send email");
    }
  };

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-task");
      if (!res.ok) throw new Error("Failed to generate task");
      const data = await res.json();
      setNewTask({
        topic: data.topic || "",
        word: data.word || "",
        meaning: data.meaning || "",
        example: data.example || "",
        idiom: data.idiom || "",
        text: data.reading_text || ""
      });
    } catch (err) {
      console.error(err);
      alert("Error generating task. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteSubmission = async (recordingId: string) => {
    if (!confirm("Are you sure you want to delete this submission?")) return;
    if (!room) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const res = await fetch(`/api/delete-recording?recordingId=${recordingId}&roomId=${room.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete submission");
      }
      
      // Update local state instantly only after successful API call
      setRecordings(prev => prev.filter(r => r.id !== recordingId));
    } catch (err: any) {
      console.error("Error deleting submission:", err);
      alert("Failed to delete submission: " + err.message);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-2xl md:text-3xl font-extrabold mb-4 text-white">Room was deleted by owner or does not exist</h1>
        <p className="text-zinc-400 mb-8 font-light text-sm max-w-sm leading-relaxed">
          The collaborative practice room for this team has been permanently deleted by the team creator.
        </p>
        <Link 
          href="/rooms" 
          className="px-6 py-3 rounded-xl bg-white text-zinc-950 font-bold hover:bg-zinc-200 transition-all text-sm shadow-[0_0_20px_rgba(255,255,255,0.08)] border border-white/10"
        >
          Return to Rooms
        </Link>
      </div>
    );
  }

  const avgConfidence = recordings.length > 0 
    ? Math.round(recordings.reduce((acc, curr) => acc + (curr.confidence || 0), 0) / recordings.length) 
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/rooms" className="inline-flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white mb-8 transition-all">
        <ArrowLeft className="w-4 h-4" />
        Back to Rooms
      </Link>

      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.02)]">
              <Users className="w-5 h-5 text-zinc-300" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-xs font-mono tracking-widest text-zinc-300">
                TEAM ID: {room.invite_token || "N/A"}
              </span>
              {room.invite_token && (
                <button
                  onClick={handleCopyTeamId}
                  className="p-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.02)] flex items-center justify-center"
                  title="Copy Team ID"
                >
                  {copiedTeamId ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white">{room.name}</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
          {user?.id === room.created_by && (
            <button
              onClick={handleDeleteRoom}
              className="px-6 py-3 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-500 hover:text-red-400 border border-red-500/20 hover:border-red-500/30 transition-all font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.05)] cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Delete Room
            </button>
          )}
          <Link 
            href={activeTask ? `/practice?roomId=${room.id}&taskId=${activeTask.id}` : `/practice?roomId=${room.id}`}
            className="px-6 py-3 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 transition-all font-semibold text-sm flex items-center justify-center gap-2 border border-white/10 shadow-[0_0_25px_rgba(255,255,255,0.08)]"
          >
            <Mic className="w-4 h-4" />
            {activeTask ? "Start Daily Task" : "Practice for Team"}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="glass-panel p-6 rounded-3xl flex items-center gap-6 float-slow interactive-card">
          <div className="text-4xl font-extrabold text-white">{recordings.length}</div>
          <div className="text-foreground/40 text-xs font-semibold uppercase tracking-wider">Total Submissions</div>
        </div>
        <div className="glass-panel p-6 rounded-3xl flex items-center gap-6 float-medium interactive-card">
          <div className="text-4xl font-extrabold text-white">{avgConfidence}%</div>
          <div className="text-foreground/40 text-xs font-semibold uppercase tracking-wider">Team Avg Confidence</div>
        </div>
      </div>

      {/* Active Task Section */}
      {activeTask && (
        <div className="mb-12 glass-panel p-8 rounded-3xl border border-white/10 relative overflow-hidden float-slow interactive-card">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              Today's Task
            </h2>
            <div className="flex items-center gap-4">
              <div className="text-sm font-semibold text-zinc-300">
                {new Date(activeTask.created_at).toLocaleDateString()}
              </div>
              <a 
                href={`https://wa.me/?text=${encodeURIComponent(`📢 *Daily SpeakMirror Task* 📢\n\n*Team:* ${room.name}\n*Topic:* ${activeTask.topic_of_the_day}\n\n*Word of the Day:* ${activeTask.word_of_the_day} (${activeTask.word_meaning || ''})\n*Idiom:* ${activeTask.idiom_of_the_day || ''}\n\n👉 Click here to start practicing:\n${typeof window !== 'undefined' ? window.location.origin : ''}/rooms/${room.id}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-[#25D366]/5 text-[#25D366] border border-[#25D366]/20 hover:bg-[#25D366]/10 transition-all text-xs font-bold flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Share to WhatsApp
              </a>
              {user?.id === room.created_by && (
                <button 
                  onClick={() => handleSendEmail(activeTask)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-zinc-300 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all text-xs font-bold flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Send via Email
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl flex flex-col justify-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-1">Topic of the Day</div>
              <div className="font-semibold text-lg mb-4 text-white">{activeTask.topic_of_the_day}</div>
              
              {activeTask.idiom_of_the_day && (
                <>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-1">Idiom of the Day</div>
                  <div className="font-semibold text-white">{activeTask.idiom_of_the_day}</div>
                </>
              )}
            </div>
            <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
              <div className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-1">Word of the Day</div>
              <div className="font-semibold text-lg text-white mb-2">{activeTask.word_of_the_day}</div>
              {activeTask.word_meaning && (
                <div className="text-sm text-foreground/85 mb-2 font-light"><span className="opacity-40">Meaning:</span> {activeTask.word_meaning}</div>
              )}
              {activeTask.word_example && (
                <div className="text-sm text-foreground/85 italic font-light"><span className="opacity-40 not-italic">Example:</span> "{activeTask.word_example}"</div>
              )}
            </div>
          </div>
          
          <div className="bg-white/[0.01] border border-white/5 p-5 rounded-2xl">
            <div className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-2">Reading Text (Pronunciation & Articulation)</div>
            <p className="text-foreground/90 leading-relaxed italic border-l border-white/20 pl-4 bg-white/[0.01] rounded-r-xl py-2 font-light text-sm md:text-base">"{activeTask.reading_text}"</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Shared Team Feed</h2>
        {user?.id === room.created_by && (
          <button 
            onClick={() => setIsTaskModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all text-sm font-semibold flex items-center gap-2"
          >
            Assign New Task
          </button>
        )}
      </div>

      {user?.id === room.created_by && members.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <Users className="w-5 h-5 text-zinc-400" />
            Team Members ({members.length})
          </h2>
          <div className="glass-panel p-6 rounded-[2rem] border border-white/5 float-medium interactive-card">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map(member => (
                <div key={member.user_id} className="flex items-center gap-4 bg-white/[0.01] p-4 rounded-xl border border-white/5">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center font-bold">
                    {member.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-semibold text-sm truncate text-white">{member.full_name}</div>
                    <div className="text-xs text-foreground/40 truncate font-light">{member.email}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {recordings.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center border border-white/5 float-slow">
          <p className="text-foreground/60 mb-4 font-light">No one has practiced for this team yet.</p>
          <Link href={`/practice?roomId=${room.id}`} className="text-white hover:underline font-semibold">Be the first to submit a video!</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recordings.map((rec, idx) => (
            <motion.div 
              key={rec.id} 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className={`glass-panel p-5 rounded-3xl border border-white/5 flex flex-col h-full ${idx % 3 === 0 ? 'float-slow' : idx % 3 === 1 ? 'float-medium' : 'float-fast'} interactive-card`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border ${rec.confidence >= 80 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : rec.confidence >= 70 ? "bg-white/5 text-zinc-300 border-white/10" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                  {rec.confidence}%
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-foreground/40 font-light">
                    {new Date(rec.created_at).toLocaleDateString()}
                  </div>
                  {user?.id === room.created_by && (
                    <button 
                      onClick={() => handleDeleteSubmission(rec.id)}
                      className="p-1.5 text-foreground/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Delete Submission"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wide">
                {rec.user_name || "Team Member"}
              </div>
              
              <h3 className="font-bold text-base mb-4 text-white line-clamp-2 flex-1">{rec.topic}</h3>
              
              {rec.video_url && (
                <a 
                  href={rec.video_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-auto w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-white transition-all rounded-xl font-semibold text-sm"
                >
                  <Play className="w-4 h-4" />
                  Watch Video
                </a>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel p-8 rounded-[2rem] w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto relative z-10 border border-white/10 bg-zinc-950/90"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-extrabold text-white">Assign Daily Task</h2>
              <button 
                type="button"
                onClick={handleAIGenerate}
                disabled={isGenerating}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-all text-xs font-semibold flex items-center gap-2 disabled:opacity-50 shadow-[0_0_15px_rgba(255,255,255,0.02)]"
              >
                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                AI Generate Task
              </button>
            </div>
            <p className="text-foreground/60 mb-6 text-sm font-light">Create a reading task for your team to practice pronunciation.</p>
            
            <form onSubmit={handleCreateTask}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-zinc-300">Topic of the Day</label>
                  <input 
                    type="text" 
                    required
                    value={newTask.topic}
                    onChange={e => setNewTask({...newTask, topic: e.target.value})}
                    placeholder="e.g. Sales Pitch Opening"
                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all text-white placeholder-zinc-500 font-light text-sm"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-zinc-300">Word of the Day</label>
                    <input 
                      type="text" 
                      required
                      value={newTask.word}
                      onChange={e => setNewTask({...newTask, word: e.target.value})}
                      placeholder="e.g. Articulate"
                      className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all text-white placeholder-zinc-500 font-light text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-zinc-300">Idiom of the Day</label>
                    <input 
                      type="text" 
                      value={newTask.idiom}
                      onChange={e => setNewTask({...newTask, idiom: e.target.value})}
                      placeholder="e.g. Break the ice"
                      className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all text-white placeholder-zinc-500 font-light text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 text-zinc-300">Word Meaning</label>
                  <input 
                    type="text" 
                    value={newTask.meaning}
                    onChange={e => setNewTask({...newTask, meaning: e.target.value})}
                    placeholder="Dictionary definition..."
                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all text-white placeholder-zinc-500 font-light text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 text-zinc-300">Example Sentence</label>
                  <input 
                    type="text" 
                    value={newTask.example}
                    onChange={e => setNewTask({...newTask, example: e.target.value})}
                    placeholder="Example usage..."
                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all text-white placeholder-zinc-500 font-light text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 text-zinc-300">Reading Text</label>
                  <textarea 
                    required
                    rows={4}
                    value={newTask.text}
                    onChange={e => setNewTask({...newTask, text: e.target.value})}
                    placeholder="Enter the exact script you want them to read. The AI will grade their pronunciation against this text."
                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all text-white placeholder-zinc-500 font-light text-sm resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all font-semibold text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={savingTask}
                  className="px-5 py-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 transition-all font-semibold text-sm flex items-center gap-2 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.08)] disabled:opacity-50"
                >
                  {savingTask && <Loader2 className="w-4 h-4 animate-spin" />}
                  Publish Task
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
