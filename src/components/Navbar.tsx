"use client";

import { Mic, Activity, LogIn, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";

export function Navbar() {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="fixed top-0 inset-x-0 h-16 border-b border-white/5 bg-[#050508]/60 backdrop-blur-2xl z-50 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.02)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.02)]">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">SpeakMirror</span>
        </Link>
        
        <div className="flex items-center gap-2 md:gap-4">
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

          {user && (
            <Link 
              href="/rooms" 
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-all hidden sm:flex items-center gap-2 ${
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
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-all hidden sm:flex items-center gap-2 ${
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
                className="text-sm font-medium px-4 py-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-400/5 transition-all border border-transparent hover:border-red-500/10"
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
      </div>
    </nav>
  );
}
