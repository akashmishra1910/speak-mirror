"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth, Workspace } from "./AuthProvider";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, Folder, Users, Plus, Loader2, X, Key, Copy, CheckCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function WorkspaceSwitcher() {
  const { user, activeWorkspace, setActiveWorkspace, workspaces, fetchWorkspaces } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  
  // Create Team Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createdOrg, setCreatedOrg] = useState<{ name: string; invite_token: string } | null>(null);

  // Join Team Modal States
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinToken, setJoinToken] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside clicks
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !user) return;
    
    setIsCreating(true);
    try {
      // Insert organization.
      // The Postgres trigger automatically creates the creator-to-admin mapping.
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .insert({ name: newTeamName.trim(), created_by: user.id })
        .select()
        .single();

      if (orgError) throw orgError;

      // Re-fetch workspaces for the provider context
      await fetchWorkspaces(user.id);
      
      // Select the newly created workspace as active
      if (orgData) {
        const newWorkspace: Workspace = { 
          id: orgData.id, 
          name: orgData.name,
          invite_token: orgData.invite_token 
        };
        setActiveWorkspace(newWorkspace);
        setCreatedOrg({ name: orgData.name, invite_token: orgData.invite_token });
      }

      setNewTeamName("");
    } catch (err: any) {
      alert("Error creating team: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinToken.trim() || !user) return;
    
    setIsJoining(true);
    try {
      // Import the server action and execute it
      const { joinTeamWithToken } = await import("@/actions/workspace");
      const joinedWorkspace = await joinTeamWithToken(joinToken.trim());
      
      // Re-fetch workspaces for the provider context
      await fetchWorkspaces(user.id);
      
      // Select the newly joined workspace as active
      setActiveWorkspace(joinedWorkspace);

      setJoinToken("");
      setIsJoinModalOpen(false);
      setIsOpen(false);
      alert(`Successfully joined team: ${joinedWorkspace.name}`);

      // Auto-redirect to the newly joined team's room
      try {
        const { data: roomData } = await supabase
          .from("rooms")
          .select("id")
          .eq("organization_id", joinedWorkspace.id)
          .maybeSingle();

        if (roomData) {
          router.push(`/rooms/${roomData.id}`);
        } else {
          router.push("/rooms");
        }
      } catch (err) {
        console.error("Error auto-redirecting to team room:", err);
        router.push("/rooms");
      }
    } catch (err: any) {
      alert("Error joining team: " + err.message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreatedModalClose = () => {
    setCreatedOrg(null);
    setIsModalOpen(false);
    setIsOpen(false);
    router.push("/rooms");
  };

  const handleDeleteTeam = async (ws: Workspace) => {
    const confirmDelete = confirm(
      `Are you sure you want to permanently delete the team "${ws.name}"? This action cannot be undone and will delete the team workspace for all members.`
    );
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", ws.id);

      if (error) throw error;

      alert(`Team "${ws.name}" has been permanently deleted.`);

      // If the deleted team was active, switch back to personal
      if (activeWorkspace.id === ws.id) {
        setActiveWorkspace({ id: "personal", name: "Personal Space" });
      }

      // Re-fetch workspaces list
      await fetchWorkspaces(user.id);
    } catch (err: any) {
      console.error("Error deleting team:", err);
      alert("Failed to delete team: " + err.message);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Switcher Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 text-white font-medium text-xs md:text-sm transition-all duration-200 shadow-[0_0_15px_rgba(255,255,255,0.01)] cursor-pointer"
      >
        {activeWorkspace.id === "personal" ? (
          <Folder className="w-3.5 h-3.5 text-zinc-400" />
        ) : (
          <Users className="w-3.5 h-3.5 text-indigo-400" />
        )}
        <span className="max-w-[120px] truncate">{activeWorkspace.name}</span>
        <ChevronDown 
          className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-300 ${
            isOpen ? "rotate-180 text-white" : ""
          }`} 
        />
      </button>

      {/* Frosted Glass Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 mt-2 w-64 rounded-2xl bg-[#09090e]/95 backdrop-blur-3xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.6)] z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-white/5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest bg-white/[0.01]">
              Workspaces
            </div>

            {/* Workspaces List */}
            <div className="p-1.5 max-h-60 overflow-y-auto space-y-1">
              {workspaces.map((ws) => {
                const isActive = ws.id === activeWorkspace.id;
                return (
                  <div
                    key={ws.id}
                    onClick={async () => {
                      setActiveWorkspace(ws);
                      setIsOpen(false);

                      // Automatically open that particular team's room (or practice for personal space)
                      if (ws.id === "personal") {
                        router.push("/practice");
                      } else {
                        try {
                          const { data: roomData } = await supabase
                            .from("rooms")
                            .select("id")
                            .eq("organization_id", ws.id)
                            .maybeSingle();

                          if (roomData) {
                            router.push(`/rooms/${roomData.id}`);
                          } else {
                            router.push("/rooms");
                          }
                        } catch (err) {
                          console.error("Error auto-redirecting to team room:", err);
                          router.push("/rooms");
                        }
                      }
                    }}
                    className={`w-full flex flex-col p-2.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                      isActive 
                        ? "bg-white/[0.06] border-white/10 text-white font-semibold" 
                        : "border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {ws.id === "personal" ? (
                          <Folder className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-zinc-500"}`} />
                        ) : (
                          <Users className={`w-4 h-4 shrink-0 ${isActive ? "text-indigo-400" : "text-indigo-400/60"}`} />
                        )}
                        <span className="truncate">{ws.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {ws.id !== "personal" && (ws.created_by === user.id || ws.role === "OWNER") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTeam(ws);
                            }}
                            className="p-1 rounded-md text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer flex items-center justify-center"
                            title="Delete Team Workspace"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isActive && <Check className="w-4 h-4 text-white shrink-0" />}
                      </div>
                    </div>

                    {ws.id !== "personal" && ws.invite_token && (
                      <div className="mt-2 flex items-center justify-between gap-1.5 bg-black/40 px-2 py-1.5 rounded-lg border border-white/5 font-mono text-[9px] text-white overflow-hidden">
                        <span className="truncate select-all opacity-85" title={ws.invite_token}>
                          {ws.invite_token}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(ws.invite_token || "");
                            alert(`Copied Invite Key for ${ws.name}!`);
                          }}
                          className="px-1.5 py-0.5 rounded bg-white text-zinc-950 font-bold hover:bg-zinc-200 transition-all cursor-pointer shrink-0 text-[8px]"
                        >
                          Copy
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer options - Create new team / Join team */}
            <div className="p-1.5 border-t border-white/5 bg-white/[0.01] flex flex-col gap-1">
              <button
                onClick={() => {
                  setCreatedOrg(null);
                  setIsModalOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-medium text-zinc-500 hover:text-white hover:bg-white/[0.03] transition-all duration-150 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-zinc-500" />
                <span>Create New Team</span>
              </button>
              <button
                onClick={() => setIsJoinModalOpen(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-medium text-zinc-500 hover:text-white hover:bg-white/[0.03] transition-all duration-150 cursor-pointer"
              >
                <Key className="w-4 h-4 text-zinc-500" />
                <span>Join a Team</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Frosted Glass Creation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            {/* Overlay backdrop blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!createdOrg) setIsModalOpen(false);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md rounded-[1.5rem] sm:rounded-3xl bg-[#09090d]/90 backdrop-blur-3xl border border-white/10 p-5 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-10"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  if (createdOrg) {
                    handleCreatedModalClose();
                  } else {
                    setIsModalOpen(false);
                  }
                }}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {createdOrg ? (
                /* Success View showing Invite Link */
                <div className="space-y-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Team Created!</h3>
                    <p className="text-zinc-400 text-xs md:text-sm font-light">
                      Your team workspace <strong>{createdOrg.name}</strong> is ready. Share this invite key with your colleagues so they can join:
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 bg-black/60 border border-white/10 rounded-xl p-3.5 font-mono text-xs text-white overflow-hidden">
                    <span className="truncate select-all">{createdOrg.invite_token}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(createdOrg.invite_token);
                        alert("Copied Team Invite Key to Clipboard!");
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-zinc-950 font-bold hover:bg-zinc-200 transition-all text-xs cursor-pointer shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </button>
                  </div>

                  <button
                    onClick={handleCreatedModalClose}
                    className="w-full py-3 rounded-xl bg-white text-zinc-950 font-bold text-sm hover:bg-zinc-200 transition-all cursor-pointer"
                  >
                    Go to workspace
                  </button>
                </div>
              ) : (
                /* Form View */
                <>
                  <h3 className="text-xl font-bold text-white mb-2">Create New Team</h3>
                  <p className="text-zinc-400 text-xs md:text-sm font-light mb-6">
                    Organize projects, practice assignments, and collaborate dynamically with your teammates.
                  </p>

                  <form onSubmit={handleCreateTeam} className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        Team Name
                      </label>
                      <input
                        type="text"
                        required
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="e.g. Team Alpha, Speech Masters"
                        className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-5 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isCreating || !newTeamName.trim()}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCreating ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Creating...</span>
                          </>
                        ) : (
                          <span>Create Team</span>
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Frosted Glass Join Modal */}
      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            {/* Overlay backdrop blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsJoinModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md rounded-[1.5rem] sm:rounded-3xl bg-[#09090d]/90 backdrop-blur-3xl border border-white/10 p-5 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-10"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsJoinModalOpen(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-bold text-white mb-2">Join a Team</h3>
              <p className="text-zinc-400 text-xs md:text-sm font-light mb-6">
                Enter the unique Team Invitation Key shared by your team owner or mentor to join their collaborative space.
              </p>

              <form onSubmit={handleJoinTeam} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    Team Invite Key
                  </label>
                  <input
                    type="text"
                    required
                    value={joinToken}
                    onChange={(e) => setJoinToken(e.target.value)}
                    placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsJoinModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isJoining || !joinToken.trim()}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Joining...</span>
                      </>
                    ) : (
                      <span>Join Team</span>
                    )}
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
