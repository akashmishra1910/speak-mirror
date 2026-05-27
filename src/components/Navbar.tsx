"use client";

import { Mic, Activity, LogIn, Users, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const pathname = usePathname();
  const { user, isLoading, activeWorkspace } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 inset-x-0 h-16 border-b border-white/5 bg-[#050508]/60 backdrop-blur-2xl z-50 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.02)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.02)]">
                <Mic className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight text-white hidden min-[380px]:block">SpeakMirror</span>
            </Link>
            
            {user && (
              <>
                <div className="h-4 w-px bg-white/10"></div>
                <WorkspaceSwitcher />
              </>
            )}
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center gap-2 md:gap-4">
            <Link 
              href="/practice" 
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                pathname === "/practice" 
                  ? "bg-white/5 border border-white/10 text-white" 
                  : "text-foreground/60 hover:text-white hover:bg-white/5"
              }`}
            >
              Practice
            </Link>

            {user && activeWorkspace && activeWorkspace.id !== "personal" && (
              <Link 
                href="/rooms" 
                className={`text-sm font-medium px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  pathname.startsWith("/rooms") 
                    ? "bg-white/5 border border-white/10 text-white" 
                    : "text-foreground/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Users className="w-4 h-4" />
                Rooms
              </Link>
            )}

            {user && (
              <Link 
                href="/profile" 
                className={`text-sm font-medium px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  pathname === "/profile" 
                    ? "bg-white/5 border border-white/10 text-white" 
                    : "text-foreground/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Activity className="w-4 h-4" />
                Profile
              </Link>
            )}

            <Link 
              href="/contact" 
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-all hidden md:flex ${
                pathname === "/contact" 
                  ? "bg-white/5 border border-white/10 text-white" 
                  : "text-foreground/60 hover:text-white hover:bg-white/5"
              }`}
            >
              Contact
            </Link>

            {!isLoading && (
              user ? (
                <button 
                  onClick={handleLogout}
                  className="text-sm font-medium px-4 py-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-400/5 transition-all border border-transparent hover:border-red-500/10 cursor-pointer"
                >
                  Logout
                </button>
              ) : (
                <Link 
                  href="/auth" 
                  className="flex items-center gap-2 text-sm font-medium px-5 py-2 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 transition-all border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.08)] font-semibold"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
              )
            )}
          </div>

          {/* Mobile Navigation Toggle Button */}
          <div className="flex sm:hidden items-center gap-2">
            {!isLoading && !user && (
              <Link 
                href="/auth" 
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </Link>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="fixed top-16 inset-x-0 border-b border-white/10 bg-[#09090e]/95 backdrop-blur-3xl z-40 overflow-hidden flex flex-col px-6 py-6 gap-3.5 shadow-2xl sm:hidden"
          >
            <Link 
              href="/practice" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`text-sm font-semibold p-3.5 rounded-xl transition-all ${
                pathname === "/practice" 
                  ? "bg-white/5 border border-white/10 text-white" 
                  : "text-foreground/60 hover:text-white hover:bg-white/5"
              }`}
            >
              Practice
            </Link>

            {user && activeWorkspace && activeWorkspace.id !== "personal" && (
              <Link 
                href="/rooms" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`text-sm font-semibold p-3.5 rounded-xl transition-all flex items-center gap-2.5 ${
                  pathname.startsWith("/rooms") 
                    ? "bg-white/5 border border-white/10 text-white" 
                    : "text-foreground/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Users className="w-4 h-4 text-indigo-400" />
                Rooms
              </Link>
            )}

            {user && (
              <Link 
                href="/profile" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`text-sm font-semibold p-3.5 rounded-xl transition-all flex items-center gap-2.5 ${
                  pathname === "/profile" 
                    ? "bg-white/5 border border-white/10 text-white" 
                    : "text-foreground/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Activity className="w-4 h-4 text-zinc-400" />
                Profile
              </Link>
            )}

            <Link 
              href="/contact" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`text-sm font-semibold p-3.5 rounded-xl transition-all ${
                pathname === "/contact" 
                  ? "bg-white/5 border border-white/10 text-white" 
                  : "text-foreground/60 hover:text-white hover:bg-white/5"
              }`}
            >
              Contact
            </Link>

            {user && (
              <>
                <div className="h-px bg-white/5 w-full my-1"></div>
                <button 
                  onClick={handleLogout}
                  className="w-full text-left text-sm font-semibold p-3.5 rounded-xl text-rose-400 hover:bg-rose-500/5 transition-all border border-transparent hover:border-rose-500/10 cursor-pointer"
                >
                  Logout
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
