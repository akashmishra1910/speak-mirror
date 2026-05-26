"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth, Workspace } from "./AuthProvider";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, Folder, Users, Plus, Loader2, X } from "lucide-react";

export function WorkspaceSwitcher() {
  const { user, activeWorkspace, setActiveWorkspace, workspaces, fetchWorkspaces } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
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
        const newWorkspace: Workspace = { id: orgData.id, name: orgData.name };
        setActiveWorkspace(newWorkspace);
      }

      // Reset form states
      setNewTeamName("");
      setIsModalOpen(false);
      setIsOpen(false);
    } catch (err: any) {
      alert("Error creating team: " + err.message);
    } finally {
      setIsCreating(false);
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
                  <button
                    key={ws.id}
                    onClick={() => {
                      setActiveWorkspace(ws);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs md:text-sm transition-all duration-150 cursor-pointer ${
                      isActive 
                        ? "bg-white/[0.06] text-white font-semibold" 
                        : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {ws.id === "personal" ? (
                        <Folder className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-zinc-500"}`} />
                      ) : (
                        <Users className={`w-4 h-4 shrink-0 ${isActive ? "text-indigo-400" : "text-indigo-400/60"}`} />
                      )}
                      <span className="truncate">{ws.name}</span>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-white shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Footer option - Create new team */}
            <div className="p-1.5 border-t border-white/5 bg-white/[0.01]">
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-medium text-zinc-500 hover:text-white hover:bg-white/[0.03] transition-all duration-150 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-zinc-500" />
                <span>Create New Team</span>
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
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md rounded-3xl bg-[#09090d]/90 backdrop-blur-3xl border border-white/10 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-10"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
