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
    const isHandlingAuth = typeof window !== 'undefined' && 
      (window.location.search.includes('code=') || 
       window.location.hash.includes('access_token=') || 
       window.location.search.includes('error='));

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!isHandlingAuth) {
        setIsLoading(false);
      }
    });

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
