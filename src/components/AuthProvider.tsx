"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, isLoading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if we are currently handling an OAuth redirect
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const code = searchParams?.get('code');
    const isHandlingAuth = typeof window !== 'undefined' && 
      (code !== null || 
       window.location.hash.includes('access_token=') || 
       window.location.search.includes('error='));

    if (code) {
      // Explicitly exchange the code for a session
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (!error && data.session) {
          setUser(data.session.user);
          // Clean up the URL to prevent re-exchange
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        setIsLoading(false);
      });
    } else {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (!isHandlingAuth) {
          setIsLoading(false);
        }
      });
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Fallback timeout in case onAuthStateChange doesn't fire during OAuth
    if (isHandlingAuth) {
      const timer = setTimeout(() => setIsLoading(false), 4000);
      return () => {
        clearTimeout(timer);
        subscription.unsubscribe();
      };
    }

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
