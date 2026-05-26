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
    let active = true;

    async function initializeAuth() {
      // Check if there is an auth code or error in the URL query params
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");
      const errorType = searchParams.get("error");
      const errorDesc = searchParams.get("error_description");

      // Check URL hash parameters (for Implicit Grant Flow redirects)
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      let hashParams = new URLSearchParams();
      if (hash && hash.startsWith("#")) {
        hashParams = new URLSearchParams(hash.substring(1));
      }
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const hashErrorType = hashParams.get("error");
      const hashErrorDesc = hashParams.get("error_description");

      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (active) {
            if (error) {
              console.warn("OAuth exchange failed, signing out:", error.message);
              await supabase.auth.signOut().catch(() => {});
              setUser(null);
            } else if (data.session) {
              setUser(data.session.user);
            }
            // Clean URL query parameters to prevent re-exchange
            const url = new URL(window.location.href);
            url.searchParams.delete("code");
            window.history.replaceState({}, document.title, url.pathname + url.search);
          }
        } catch (err) {
          console.error("Error exchanging code:", err);
          if (active) {
            setUser(null);
          }
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      } else if (accessToken && refreshToken) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          if (active) {
            if (error) {
              console.warn("Setting session from hash failed, signing out:", error.message);
              await supabase.auth.signOut().catch(() => {});
              setUser(null);
            } else if (data.session) {
              setUser(data.session.user);
            }
            // Clean URL hash parameters to prevent re-processing
            const url = new URL(window.location.href);
            url.hash = "";
            window.history.replaceState({}, document.title, url.pathname + url.search);
          }
        } catch (err) {
          console.error("Error setting session from hash:", err);
          if (active) {
            setUser(null);
          }
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      } else if (errorType || errorDesc || hashErrorType || hashErrorDesc) {
        const finalErrorType = errorType || hashErrorType;
        const finalErrorDesc = errorDesc || hashErrorDesc;
        console.error("OAuth error redirect:", finalErrorType, finalErrorDesc);
        if (active) {
          setUser(null);
          setIsLoading(false);
          
          // Display a user-friendly alert explaining the authentication error
          const decodedDesc = finalErrorDesc ? decodeURIComponent(finalErrorDesc.replace(/\+/g, " ")) : "Authentication failed";
          alert(`Authentication Error: ${decodedDesc}\n\nPlease check your Supabase and Google Cloud Console configurations.`);
          
          // Clean URL query and hash parameters
          const url = new URL(window.location.href);
          url.searchParams.delete("error");
          url.searchParams.delete("error_description");
          url.searchParams.delete("error_code");
          url.hash = "";
          window.history.replaceState({}, document.title, url.pathname + url.search);
        }
      } else {
        // Standard session retrieval
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (active) {
            if (error) {
              console.warn("Session check failed, clearing storage:", error.message);
              await supabase.auth.signOut().catch(() => {});
              setUser(null);
            } else {
              setUser(session?.user ?? null);
            }
          }
        } catch (err) {
          console.error("Error getting session:", err);
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      }
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (active) {
        console.log("Auth state changed:", event, session?.user?.email);
        setUser(session?.user ?? null);
        // Only resolve loading if we are NOT currently handling code exchange/redirect
        const searchParams = new URLSearchParams(window.location.search);
        const hasCode = searchParams.has("code");
        const hasError = searchParams.has("error");
        
        // Also check hash parameters
        const hash = typeof window !== "undefined" ? window.location.hash : "";
        const hasHashToken = hash.includes("access_token=") || hash.includes("error=");
        
        if (!hasCode && !hasError && !hasHashToken) {
          setIsLoading(false);
        }
      }
    });

    // Run async initializer
    initializeAuth();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
