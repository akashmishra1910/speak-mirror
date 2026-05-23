"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users, ArrowRight, Loader2, Key } from "lucide-react";
import Link from "next/link";

interface Room {
  id: string;
  name: string;
  passkey: string;
}

export default function RoomsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [fetchingRooms, setFetchingRooms] = useState(true);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Forms
  const [newRoomName, setNewRoomName] = useState("");
  const [joinPasskey, setJoinPasskey] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth");
    }
  }, [user, isLoading, router]);

  const fetchRooms = async () => {
    if (!user) return;
    setFetchingRooms(true);
    try {
      // Fetch rooms the user is a member of
      const { data, error } = await supabase
        .from("room_members")
        .select(`
          room_id,
          rooms ( id, name, passkey )
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      
      const formattedRooms = (data || []).map((rm: any) => rm.rooms as Room);
      setRooms(formattedRooms);
    } catch (err) {
      console.error("Error fetching rooms", err);
    } finally {
      setFetchingRooms(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRooms();
    }
  }, [user]);

  const generatePasskey = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setActionLoading(true);
    
    try {
      const passkey = generatePasskey();
      
      // Insert room
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .insert({ name: newRoomName, passkey, created_by: user.id })
        .select()
        .single();
        
      if (roomError) throw roomError;

      // Add user to room_members
      const { error: memberError } = await supabase
        .from("room_members")
        .insert({ room_id: roomData.id, user_id: user.id });

      if (memberError) throw memberError;

      setIsCreateModalOpen(false);
      setNewRoomName("");
      fetchRooms();
    } catch (err: any) {
      alert("Error creating room: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setActionLoading(true);

    try {
      // Find room by passkey
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("passkey", joinPasskey.toUpperCase())
        .single();

      if (roomError || !roomData) throw new Error("Invalid passkey or room not found.");

      // Add user to room_members (ignore if already added, handled by unique constraint or silent fail)
      const { error: memberError } = await supabase
        .from("room_members")
        .insert({ room_id: roomData.id, user_id: user.id });

      // If violation, they are already in the room, which is fine
      if (memberError && memberError.code !== '23505') throw memberError;

      setIsJoinModalOpen(false);
      setJoinPasskey("");
      fetchRooms();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-white">Team Rooms</h1>
          <p className="text-foreground/60 max-w-xl font-light leading-relaxed">
            Collaborate with peers, practice together, and view each other's progress in private spaces.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsJoinModalOpen(true)}
            className="px-5 py-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-white transition-all font-semibold text-sm flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.02)]"
          >
            <Key className="w-4 h-4 text-zinc-400" />
            Join Room
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-3 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 transition-all font-semibold text-sm flex items-center gap-2 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.08)]"
          >
            <Plus className="w-4 h-4" />
            Create Room
          </button>
        </div>
      </div>

      {fetchingRooms ? (
        <div className="py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center flex flex-col items-center float-slow">
          <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(255,255,255,0.02)]">
            <Users className="w-10 h-10 text-zinc-300" />
          </div>
          <h2 className="text-2xl font-extrabold mb-2 text-white">No Rooms Yet</h2>
          <p className="text-foreground/60 mb-8 max-w-md font-light leading-relaxed">
            You haven't joined any team rooms. Create one to invite your peers or join an existing one using a passkey!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room, idx) => (
            <Link key={room.id} href={`/rooms/${room.id}`}>
              <motion.div 
                whileHover={{ y: -4 }}
                className={`glass-panel p-6 rounded-3xl group cursor-pointer border border-white/5 transition-all ${idx % 3 === 0 ? 'float-slow' : idx % 3 === 1 ? 'float-medium' : 'float-fast'} interactive-card`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:scale-110 transition-all shadow-[0_0_15px_rgba(255,255,255,0.02)]">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-xs font-mono tracking-widest text-zinc-300">
                    {room.passkey}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2 text-white group-hover:text-white transition-colors">{room.name}</h3>
                <div className="flex items-center text-white text-sm font-medium mt-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
                  Enter Room <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Room Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel p-8 rounded-[2rem] w-full max-w-md shadow-2xl relative z-10 border border-white/10 bg-zinc-950/90"
            >
              <h2 className="text-2xl font-extrabold mb-2 text-white">Create a Room</h2>
              <p className="text-foreground/60 mb-6 text-sm font-light leading-relaxed">A secure passkey will be generated automatically for your team.</p>
              
              <form onSubmit={handleCreateRoom}>
                <label className="block text-sm font-medium mb-2 text-zinc-300">Room Name</label>
                <input 
                  type="text" 
                  required
                  value={newRoomName}
                  onChange={e => setNewRoomName(e.target.value)}
                  placeholder="e.g. Sales Pitch Practice"
                  className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 mb-6 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all text-white placeholder-zinc-500 font-light text-sm"
                />
                <div className="flex items-center justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all font-semibold text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 transition-all font-semibold text-sm flex items-center gap-2 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.08)] disabled:opacity-50"
                  >
                    {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create Room
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Join Room Modal */}
      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel p-8 rounded-[2rem] w-full max-w-md shadow-2xl relative z-10 border border-white/10 bg-zinc-950/90"
            >
              <h2 className="text-2xl font-extrabold mb-2 text-white">Join a Room</h2>
              <p className="text-foreground/60 mb-6 text-sm font-light leading-relaxed">Enter the 6-character passkey provided by the room creator.</p>
              
              <form onSubmit={handleJoinRoom}>
                <label className="block text-sm font-medium mb-2 text-zinc-300">Passkey</label>
                <input 
                  type="text" 
                  required
                  maxLength={6}
                  value={joinPasskey}
                  onChange={e => setJoinPasskey(e.target.value.toUpperCase())}
                  placeholder="e.g. AB12CD"
                  className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 mb-6 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all text-white placeholder-zinc-500 font-mono tracking-widest uppercase text-sm"
                />
                <div className="flex items-center justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsJoinModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all font-semibold text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 transition-all font-semibold text-sm flex items-center gap-2 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.08)] disabled:opacity-50"
                  >
                    {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Join Room
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
