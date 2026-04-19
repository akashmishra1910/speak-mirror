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
    <nav className="fixed top-0 inset-x-0 h-16 border-b border-surface-border bg-background/80 backdrop-blur-xl z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center group-hover:bg-brand-500/20 transition-colors">
            <Mic className="w-5 h-5 text-brand-500" />
          </div>
          <span className="font-bold text-xl tracking-tight">SpeakMirror</span>
        </Link>
        
        <div className="flex items-center gap-2 md:gap-4">
          <Link 
            href="/practice" 
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
              pathname === "/practice" 
                ? "bg-surface text-foreground" 
                : "text-foreground/60 hover:text-foreground hover:bg-surface/50"
            }`}
          >
            Practice
          </Link>

          {user && (
            <Link 
              href="/rooms" 
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors hidden sm:flex items-center gap-2 ${
                pathname.startsWith("/rooms") 
                  ? "bg-surface text-foreground" 
                  : "text-foreground/60 hover:text-foreground hover:bg-surface/50"
              }`}
            >
              <Users className="w-4 h-4" />
              Rooms
            </Link>
          )}

          {user && (
            <Link 
              href="/profile" 
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors hidden sm:flex items-center gap-2 ${
                pathname === "/profile" 
                  ? "bg-surface text-foreground" 
                  : "text-foreground/60 hover:text-foreground hover:bg-surface/50"
              }`}
            >
              <Activity className="w-4 h-4" />
              Profile
            </Link>
          )}

          <Link 
            href="/contact" 
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors hidden md:flex ${
              pathname === "/contact" 
                ? "bg-surface text-foreground" 
                : "text-foreground/60 hover:text-foreground hover:bg-surface/50"
            }`}
          >
            Contact
          </Link>

          {!isLoading && (
            user ? (
              <button 
                onClick={handleLogout}
                className="text-sm font-medium px-4 py-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
              >
                Logout
              </button>
            ) : (
              <Link 
                href="/auth" 
                className="flex items-center gap-2 text-sm font-medium px-5 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-500 transition-colors"
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
