"use client";

import { Mic, Activity, LogIn, Users, Menu, X, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const pathname = usePathname();
  const { user, isLoading, activeWorkspace } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMobileMenuOpen(false);
    window.location.href = "/";
  };

  return (
    <>
      <nav className="fixed top-0 inset-x-0 h-16 border-b border-slate-200/40 bg-white/60 dark:border-white/5 dark:bg-[#050508]/60 backdrop-blur-2xl z-50 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <div className="w-8 h-8 rounded-lg bg-white/40 border border-slate-200/40 dark:bg-white/5 dark:border-white/10 flex items-center justify-center group-hover:bg-slate-100 dark:group-hover:bg-white/10 transition-colors shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                <Mic className="w-4 h-4 text-[#5B7C99] dark:text-white" />
              </div>
              <span className={`font-bold text-lg tracking-tight text-themeText dark:text-white ${user ? "hidden min-[540px]:block" : "hidden min-[380px]:block"}`}>SpeakMirror</span>
            </Link>
            
            {user && (
              <>
                <div className="h-4 w-px bg-slate-200 dark:bg-white/10"></div>
                <WorkspaceSwitcher />
              </>
            )}
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center gap-2 md:gap-4">
            <Link 
              href="/" 
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                pathname === "/" 
                  ? "bg-[#5B7C99]/10 border border-[#5B7C99]/20 text-[#5B7C99] font-semibold dark:bg-white/5 dark:border-white/10 dark:text-white" 
                  : "text-slate-600 hover:text-themeText hover:bg-slate-100/50 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5"
              }`}
            >
              Home
            </Link>

            <Link 
              href="/practice" 
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                pathname === "/practice" 
                  ? "bg-[#5B7C99]/10 border border-[#5B7C99]/20 text-[#5B7C99] font-semibold dark:bg-white/5 dark:border-white/10 dark:text-white" 
                  : "text-slate-600 hover:text-themeText hover:bg-slate-100/50 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5"
              }`}
            >
              Practice
            </Link>

            {user && activeWorkspace && activeWorkspace.id !== "personal" && (
              <Link 
                href="/rooms" 
                className={`text-sm font-medium px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  pathname.startsWith("/rooms") 
                    ? "bg-[#5B7C99]/10 border border-[#5B7C99]/20 text-[#5B7C99] font-semibold dark:bg-white/5 dark:border-white/10 dark:text-white" 
                    : "text-slate-600 hover:text-themeText hover:bg-slate-100/50 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5"
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
                    ? "bg-[#5B7C99]/10 border border-[#5B7C99]/20 text-[#5B7C99] font-semibold dark:bg-white/5 dark:border-white/10 dark:text-white" 
                    : "text-slate-600 hover:text-themeText hover:bg-slate-100/50 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5"
                }`}
              >
                <Activity className="w-4 h-4" />
                Profile
              </Link>
            )}

            {user && (
              <Link 
                href="/settings/profile" 
                className={`text-sm font-medium px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  pathname === "/settings/profile" 
                    ? "bg-[#5B7C99]/10 border border-[#5B7C99]/20 text-[#5B7C99] font-semibold dark:bg-white/5 dark:border-white/10 dark:text-white" 
                    : "text-slate-600 hover:text-themeText hover:bg-slate-100/50 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5"
                }`}
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            )}



            <Link 
              href="/contact" 
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-all hidden md:flex ${
                pathname === "/contact" 
                  ? "bg-[#5B7C99]/10 border border-[#5B7C99]/20 text-[#5B7C99] font-semibold dark:bg-white/5 dark:border-white/10 dark:text-white" 
                  : "text-slate-600 hover:text-themeText hover:bg-slate-100/50 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5"
              }`}
            >
              Contact
            </Link>

            <div className="h-4 w-px bg-slate-200 dark:bg-white/10 mx-1"></div>

            <ThemeToggle />

            {!isLoading && (
              user ? (
                <button 
                  onClick={handleLogout}
                  className="text-sm font-medium px-4 py-2 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-500/5 dark:text-zinc-400 dark:hover:text-red-400 dark:hover:bg-red-400/5 transition-all border border-transparent hover:border-slate-200 dark:hover:border-red-500/10 cursor-pointer"
                >
                  Logout
                </button>
              ) : (
                <Link 
                  href="/auth" 
                  className="flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-lg bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white shadow-[0_4px_12px_rgba(2,132,199,0.15)] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 dark:bg-none dark:shadow-none transition-all font-medium border border-transparent"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
              )
            )}
          </div>

          {/* Mobile Navigation Toggle Button */}
          <div className="flex sm:hidden items-center gap-2">
            <ThemeToggle />
            {!isLoading && !user && (
              <Link 
                href="/auth" 
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 dark:bg-none transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </Link>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-9 h-9 rounded-lg bg-slate-100/50 border border-slate-200/40 dark:bg-white/5 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-themeText dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
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
            className="fixed top-16 inset-x-0 border-b border-slate-200/50 bg-white/95 backdrop-blur-3xl dark:border-white/10 dark:bg-[#09090e]/95 z-40 overflow-hidden flex flex-col px-6 py-6 gap-3.5 shadow-2xl sm:hidden"
          >
            <Link 
              href="/" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`text-sm font-semibold p-3.5 rounded-xl transition-all ${
                pathname === "/" 
                  ? "bg-[#5B7C99]/10 border border-[#5B7C99]/20 text-[#5B7C99] dark:bg-white/5 dark:border-white/10 dark:text-white" 
                  : "text-slate-600 dark:text-zinc-400 hover:text-themeText hover:bg-slate-100/50 dark:hover:text-white dark:hover:bg-white/5"
              }`}
            >
              Home
            </Link>

            <Link 
              href="/practice" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`text-sm font-semibold p-3.5 rounded-xl transition-all ${
                pathname === "/practice" 
                  ? "bg-[#5B7C99]/10 border border-[#5B7C99]/20 text-[#5B7C99] dark:bg-white/5 dark:border-white/10 dark:text-white" 
                  : "text-slate-600 dark:text-zinc-400 hover:text-themeText hover:bg-slate-100/50 dark:hover:text-white dark:hover:bg-white/5"
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
                    ? "bg-[#5B7C99]/10 border border-[#5B7C99]/20 text-[#5B7C99] dark:bg-white/5 dark:border-white/10 dark:text-white" 
                    : "text-slate-600 dark:text-zinc-400 hover:text-themeText hover:bg-slate-100/50 dark:hover:text-white dark:hover:bg-white/5"
                }`}
              >
                <Users className="w-4 h-4 text-[#5B7C99] dark:text-indigo-400" />
                Rooms
              </Link>
            )}

            {user && (
              <Link 
                href="/profile" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`text-sm font-semibold p-3.5 rounded-xl transition-all flex items-center gap-2.5 ${
                  pathname === "/profile" 
                    ? "bg-[#5B7C99]/10 border border-[#5B7C99]/20 text-[#5B7C99] dark:bg-white/5 dark:border-white/10 dark:text-white" 
                    : "text-slate-600 dark:text-zinc-400 hover:text-themeText hover:bg-slate-100/50 dark:hover:text-white dark:hover:bg-white/5"
                }`}
              >
                <Activity className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                Profile
              </Link>
            )}

            {user && (
              <Link 
                href="/settings/profile" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`text-sm font-semibold p-3.5 rounded-xl transition-all flex items-center gap-2.5 ${
                  pathname === "/settings/profile" 
                    ? "bg-[#5B7C99]/10 border border-[#5B7C99]/20 text-[#5B7C99] dark:bg-white/5 dark:border-white/10 dark:text-white" 
                    : "text-slate-600 dark:text-zinc-400 hover:text-themeText hover:bg-slate-100/50 dark:hover:text-white dark:hover:bg-white/5"
                }`}
              >
                <Settings className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                Settings
              </Link>
            )}



            <Link 
              href="/contact" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`text-sm font-semibold p-3.5 rounded-xl transition-all ${
                pathname === "/contact" 
                  ? "bg-[#5B7C99]/10 border border-[#5B7C99]/20 text-[#5B7C99] dark:bg-white/5 dark:border-white/10 dark:text-white" 
                  : "text-slate-600 dark:text-zinc-400 hover:text-themeText hover:bg-slate-100/50 dark:hover:text-white dark:hover:bg-white/5"
              }`}
            >
              Contact
            </Link>

            {user && (
              <>
                <div className="h-px bg-slate-200 dark:bg-white/5 w-full my-1"></div>
                <button 
                  onClick={handleLogout}
                  className="w-full text-left text-sm font-semibold p-3.5 rounded-xl text-rose-500 hover:bg-rose-500/5 dark:text-rose-400 dark:hover:bg-rose-500/5 transition-all border border-transparent hover:border-slate-200 dark:hover:border-rose-500/10 cursor-pointer"
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

