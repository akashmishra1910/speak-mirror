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
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white/40 border border-slate-200/50 hover:bg-slate-100 hover:border-slate-300/50 text-slate-700 hover:text-themeText shadow-sm dark:bg-[#09090d] dark:border-zinc-800/80 dark:hover:bg-[#12121a] dark:hover:border-zinc-700/80 dark:text-zinc-300 dark:hover:text-white dark:shadow-[0_0_15px_rgba(0,0,0,0.3)] font-mono text-xs transition-all duration-200 cursor-pointer"
      >
        <span className="text-[9px] font-bold text-[#5B7C99] bg-[#5B7C99]/10 px-1.5 py-0.5 rounded border border-[#5B7C99]/20 dark:text-indigo-400 dark:bg-indigo-950/40 dark:border-indigo-800/40 uppercase tracking-widest shrink-0">
          {activeWorkspace.id === "personal" ? "SYS" : "TEAM"}
        </span>
        <span className="max-w-[120px] truncate uppercase font-bold tracking-wider">{activeWorkspace.name}</span>
        <ChevronDown 
          className={`w-3 h-3 text-slate-400 dark:text-zinc-500 transition-transform duration-300 ${
            isOpen ? "rotate-180 text-slate-800 dark:text-white" : ""
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
            className="absolute left-0 mt-2 w-64 rounded-2xl bg-white/95 backdrop-blur-3xl border border-slate-200/60 shadow-lg dark:bg-[#09090d]/95 dark:border-zinc-800/80 dark:shadow-[0_10px_40px_rgba(0,0,0,0.6)] z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-slate-200/60 text-[9px] font-bold font-mono text-slate-400 bg-slate-50/50 uppercase tracking-widest dark:border-zinc-800/80 dark:text-zinc-500 dark:bg-[#0b0b10] flex items-center justify-between">
              <span>[ AVAILABLE_SPACES ]</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
                        ? "bg-slate-100 border-slate-200/80 text-slate-900 dark:bg-[#12121c] dark:border-indigo-500/30 dark:text-white" 
                        : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full font-mono text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[8px] font-bold px-1 py-0.5 rounded border shrink-0 uppercase tracking-wider ${
                          ws.id === "personal"
                            ? "bg-slate-200 text-slate-600 border-slate-300 dark:bg-zinc-950 dark:text-zinc-400 dark:border-zinc-800"
                            : "bg-[#5B7C99]/10 text-[#5B7C99] border-[#5B7C99]/20 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/40"
                        }`}>
                          {ws.id === "personal" ? "SYS" : "TEAM"}
                        </span>
                        <span className="truncate uppercase tracking-wide font-medium">{ws.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {ws.id !== "personal" && (ws.created_by === user.id || ws.role === "OWNER") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTeam(ws);
                            }}
                            className="p-1 rounded text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer flex items-center justify-center border border-transparent hover:border-rose-500/10"
                            title="Delete Team Workspace"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                        {isActive && <Check className="w-3.5 h-3.5 text-[#5B7C99] dark:text-indigo-400 shrink-0" />}
                      </div>
                    </div>

                    {ws.id !== "personal" && ws.invite_token && (
                      <div className="mt-2 flex items-center justify-between gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/50 dark:bg-[#050508] dark:border-zinc-800 font-mono text-[9px] text-slate-500 dark:text-zinc-400 overflow-hidden">
                        <span className="truncate select-all opacity-80 font-semibold" title={ws.invite_token}>
                          KEY: {ws.invite_token}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(ws.invite_token || "");
                            alert(`Copied Invite Key for ${ws.name}!`);
                          }}
                          className="px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-all cursor-pointer shrink-0 text-[8px] border border-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-700"
                        >
                          COPY
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer options - Create new team / Join team */}
            <div className="p-1.5 border-t border-slate-200/60 bg-slate-50/50 dark:border-zinc-800 dark:bg-[#09090d] flex flex-col gap-1 font-mono">
              <button
                onClick={() => {
                  setCreatedOrg(null);
                  setIsModalOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 hover:border-slate-200/60 border border-transparent dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-[#12121a] dark:hover:border-zinc-800 transition-all duration-150 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                <span>+ NEW_TEAM</span>
              </button>
              <button
                onClick={() => setIsJoinModalOpen(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 hover:border-slate-200/60 border border-transparent dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-[#12121a] dark:hover:border-zinc-800 transition-all duration-150 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                <span>&gt; JOIN_TEAM</span>
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
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm dark:bg-black/60"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:bg-[#09090d] dark:border-zinc-800 dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-10 overflow-hidden text-left"
            >
              {/* Technical glowing header strip */}
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#5B7C99] to-transparent dark:via-indigo-500" />
              
              {/* Close Button */}
              <button
                onClick={() => {
                  if (createdOrg) {
                    handleCreatedModalClose();
                  } else {
                    setIsModalOpen(false);
                  }
                }}
                className="absolute top-5 right-5 w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {createdOrg ? (
                /* Success View showing Invite Link */
                <div className="space-y-6 text-center font-mono">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2 uppercase tracking-wider">[ TEAM_CREATED ]</h3>
                    <p className="text-slate-500 dark:text-zinc-400 text-xs font-light leading-relaxed">
                      Your team workspace <strong className="text-slate-800 dark:text-white">{createdOrg.name}</strong> has been provisioned. Share this invite key with members to grant access:
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-xs text-[#5B7C99] dark:bg-[#050508] dark:border-zinc-800 dark:text-indigo-400 overflow-hidden">
                    <span className="truncate select-all">{createdOrg.invite_token}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(createdOrg.invite_token);
                        alert("Copied Team Invite Key to Clipboard!");
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-200 border border-slate-300 text-slate-700 font-bold hover:bg-slate-300 transition-all text-[10px] cursor-pointer shrink-0 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-700"
                    >
                      <Copy className="w-3 h-3" />
                      COPY
                    </button>
                  </div>

                  <button
                    onClick={handleCreatedModalClose}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white font-bold text-xs shadow-[0_4px_12px_rgba(2,132,199,0.15)] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 dark:bg-none dark:shadow-none transition-all cursor-pointer border border-transparent"
                  >
                    ENTER WORKSPACE
                  </button>
                </div>
              ) : (
                /* Form View */
                <div className="font-mono">
                  <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2 uppercase tracking-wider">[ PROVISION_TEAM ]</h3>
                  <p className="text-slate-500 dark:text-zinc-400 text-xs font-light mb-6 leading-relaxed">
                    Create a shared workspace to assign speaking tasks, track room recordings, and collaborate with team members.
                  </p>

                  <form onSubmit={handleCreateTeam} className="space-y-6">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
                        // workspace_name
                      </label>
                      <input
                        type="text"
                        required
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="e.g. TEAM_ALPHA, SPEECH_MASTERS"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5B7C99]/50 focus:ring-1 focus:ring-[#5B7C99]/50 dark:bg-[#050508] dark:border-zinc-800 dark:text-white dark:placeholder-zinc-700 dark:focus:border-indigo-500/50 dark:focus:ring-1 dark:focus:ring-indigo-500/50 transition-all text-xs"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 bg-slate-100 border border-slate-200 hover:bg-slate-200 dark:text-zinc-400 dark:hover:text-white dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                      >
                        CANCEL
                      </button>
                      <button
                        type="submit"
                        disabled={isCreating || !newTeamName.trim()}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white shadow-[0_4px_12px_rgba(2,132,199,0.15)] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 dark:bg-none dark:shadow-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCreating ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>CREATING...</span>
                          </>
                        ) : (
                          <span>CREATE</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
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
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm dark:bg-black/60"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:bg-[#09090d] dark:border-zinc-800 dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-10 overflow-hidden text-left font-mono"
            >
              {/* Technical glowing header strip */}
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#5B7C99] to-transparent dark:via-indigo-500" />
              
              {/* Close Button */}
              <button
                onClick={() => setIsJoinModalOpen(false)}
                className="absolute top-5 right-5 w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2 uppercase tracking-wider">[ JOIN_WORKSPACE ]</h3>
              <p className="text-slate-500 dark:text-zinc-400 text-xs font-light mb-6 leading-relaxed">
                Provide a valid Team Invitation Key shared by the workspace owner to join and sync with their assignments.
              </p>

              <form onSubmit={handleJoinTeam} className="space-y-6">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
                    // security_token
                  </label>
                  <input
                    type="text"
                    required
                    value={joinToken}
                    onChange={(e) => setJoinToken(e.target.value)}
                    placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5B7C99]/50 focus:ring-1 focus:ring-[#5B7C99]/50 dark:bg-[#050508] dark:border-zinc-800 dark:text-white dark:placeholder-zinc-700 dark:focus:border-indigo-500/50 dark:focus:ring-1 dark:focus:ring-indigo-500/50 transition-all text-xs font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setIsJoinModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 bg-slate-100 border border-slate-200 hover:bg-slate-200 dark:text-zinc-400 dark:hover:text-white dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={isJoining || !joinToken.trim()}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white shadow-[0_4px_12px_rgba(2,132,199,0.15)] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 dark:bg-none dark:shadow-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>JOINING...</span>
                      </>
                    ) : (
                      <span>JOIN</span>
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

