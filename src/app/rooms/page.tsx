"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users, Loader2, Key, Sparkles } from "lucide-react";

interface Room {
  id: string;
  name: string;
}

export default function RoomsPage() {
  const { user, isLoading, activeWorkspace } = useAuth();
  const router = useRouter();
  const [fetchingRooms, setFetchingRooms] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Modals & Forms
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // 1. Guard route: redirect to practice if in personal workspace
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth");
      return;
    }

    if (activeWorkspace?.id === "personal") {
      router.replace("/practice");
      return;
    }
  }, [user, isLoading, activeWorkspace, router]);

  // 2. Fetch workspace room and user role
  useEffect(() => {
    async function fetchWorkspaceRoom() {
      if (!user || !activeWorkspace || activeWorkspace.id === "personal") return;
      
      setFetchingRooms(true);
      try {
        // Fetch user's role in the active organization
        const { data: memberData } = await supabase
          .from("organization_users")
          .select("role")
          .eq("organization_id", activeWorkspace.id)
          .eq("user_id", user.id)
          .maybeSingle();
          
        if (memberData) {
          setUserRole(memberData.role);
        }

        // Fetch the room scoped to this organization
        const { data: roomData } = await supabase
          .from("rooms")
          .select("id, name")
          .eq("organization_id", activeWorkspace.id)
          .maybeSingle();

        if (roomData) {
          // Room already exists! Redirect to it immediately
          router.replace(`/rooms/${roomData.id}`);
          return;
        }
      } catch (err) {
        console.error("Error fetching room for workspace:", err);
      } finally {
        setFetchingRooms(false);
      }
    }

    if (user && activeWorkspace && activeWorkspace.id !== "personal") {
      fetchWorkspaceRoom();
    }
  }, [user, activeWorkspace, router]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeWorkspace) return;
    setActionLoading(true);
    
    try {
      // Insert room linked to the active organization
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .insert({ 
          name: newRoomName.trim(), 
          created_by: user.id,
          organization_id: activeWorkspace.id
        })
        .select()
        .single();
        
      if (roomError) throw roomError;

      // Add user to room_members as host
      const { error: memberError } = await supabase
        .from("room_members")
        .insert({ room_id: roomData.id, user_id: user.id });

      if (memberError) throw memberError;

      setIsCreateModalOpen(false);
      setNewRoomName("");
      
      // Redirect to the newly created room immediately
      router.replace(`/rooms/${roomData.id}`);
    } catch (err: any) {
      alert("Error creating room: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const isAuthorizedToCreate = userRole === "OWNER" || userRole === "MENTOR";

  if (isLoading || fetchingRooms) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Loading Room...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative flex flex-col items-center justify-center min-h-[70vh]">
      <div className="text-center mb-12">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 text-zinc-300 text-xs md:text-sm font-medium border border-white/5 mb-4 shadow-[0_0_15px_rgba(255,255,255,0.02)]">
          <Sparkles className="w-4 h-4 text-zinc-400 animate-pulse" />
          {activeWorkspace?.name || "Team Workspace"}
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-white">Team Practice Room</h1>
        <p className="text-foreground/60 max-w-xl mx-auto font-light leading-relaxed text-sm md:text-base">
          Collaborate with peers, practice together, and view each other's progress in private spaces.
        </p>
      </div>

      <div className="w-full max-w-lg glass-panel p-12 rounded-[2rem] text-center flex flex-col items-center border border-white/5 float-slow bg-white/[0.01]">
        <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(255,255,255,0.02)]">
          <Users className="w-10 h-10 text-zinc-300" />
        </div>
        <h2 className="text-2xl font-extrabold mb-3 text-white">No Room Setup</h2>
        <p className="text-zinc-400 mb-8 max-w-sm font-light text-sm leading-relaxed">
          {isAuthorizedToCreate
            ? "Your team workspace doesn't have a practice room yet. Initialize the room to get started."
            : "Your team owner or mentor hasn't created a practice room yet. Please contact them to initialize the space."
          }
        </p>

        {isAuthorizedToCreate && (
          <button 
            onClick={() => {
              setNewRoomName(`${activeWorkspace?.name || "Team"} Practice Room`);
              setIsCreateModalOpen(true);
            }}
            className="px-6 py-3 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 transition-all font-bold text-sm flex items-center gap-2 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.08)] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Team Room
          </button>
        )}
      </div>

      {/* Create Room Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel p-8 rounded-[2rem] w-full max-w-md shadow-2xl relative z-10 border border-white/10 bg-[#09090d]/90 backdrop-blur-3xl"
            >
              <h2 className="text-2xl font-extrabold mb-2 text-white">Create a Room</h2>
              <p className="text-zinc-400 mb-6 text-sm font-light leading-relaxed">
                Setting up the practice space for <strong>{activeWorkspace?.name}</strong>.
              </p>
              
              <form onSubmit={handleCreateRoom}>
                <label className="block text-xs font-semibold mb-2 text-zinc-500 uppercase tracking-wider">Room Name</label>
                <input 
                  type="text" 
                  required
                  value={newRoomName}
                  onChange={e => setNewRoomName(e.target.value)}
                  placeholder="e.g. Sales Pitch Practice"
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 mb-6 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white placeholder-zinc-600 font-light text-sm"
                />
                <div className="flex items-center justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all font-semibold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 transition-all font-bold text-xs flex items-center gap-2 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.08)] disabled:opacity-50 cursor-pointer"
                  >
                    {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Create Room</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
