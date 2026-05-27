"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface Workspace {
  id: string;
  name: string;
  invite_token?: string;
  role?: string;
  created_by?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  activeWorkspace: Workspace;
  setActiveWorkspace: (workspace: Workspace) => void;
  workspaces: Workspace[];
  fetchWorkspaces: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  activeWorkspace: { id: "personal", name: "Personal Space" },
  setActiveWorkspace: () => {},
  workspaces: [{ id: "personal", name: "Personal Space" }],
  fetchWorkspaces: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([{ id: "personal", name: "Personal Space" }]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace>({ id: "personal", name: "Personal Space" });

  const setActiveWorkspace = (workspace: Workspace) => {
    setActiveWorkspaceState(workspace);
    if (typeof window !== "undefined") {
      localStorage.setItem("speak_mirror_active_workspace", JSON.stringify(workspace));
    }
  };

  const fetchWorkspaces = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("organization_users")
        .select("organization_id, role, organizations(name, is_personal, invite_token, created_by)")
        .eq("user_id", userId);

      if (!error && data) {
        const orgWorkspaces = data
          .filter((item: any) => !item.organizations?.is_personal)
          .map((item: any) => ({
            id: item.organization_id,
            name: item.organizations?.name || "Unnamed Team",
            invite_token: item.organizations?.invite_token,
            role: item.role,
            created_by: item.organizations?.created_by
          }));
        const allWorkspaces = [
          { id: "personal", name: "Personal Space" },
          ...orgWorkspaces
        ];
        setWorkspaces(allWorkspaces);

        // Restore active workspace if it's still valid
        const saved = localStorage.getItem("speak_mirror_active_workspace");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const exists = allWorkspaces.find((w) => w.id === parsed.id);
            if (exists) {
              setActiveWorkspaceState(exists);
              return;
            }
          } catch (e) {
            console.error("Failed to parse active workspace:", e);
          }
        }
        setActiveWorkspaceState({ id: "personal", name: "Personal Space" });
      }
    } catch (e) {
      console.error("Error fetching workspaces:", e);
    }
  };

  useEffect(() => {
    let active = true;

    const syncCookies = (session: any) => {
      if (typeof document !== "undefined") {
        if (session) {
          const maxAge = session.expires_in || 3600;
          document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
          document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=${maxAge * 24}; SameSite=Lax; Secure`;
        } else {
          document.cookie = "sb-access-token=; path=/; max-age=0; SameSite=Lax; Secure";
          document.cookie = "sb-refresh-token=; path=/; max-age=0; SameSite=Lax; Secure";
        }
      }
    };

    const trackLoginSession = async (currUser: User) => {
      if (typeof window === "undefined") return;
      const isTracked = sessionStorage.getItem("speak_mirror_session_tracked");
      if (!isTracked) {
        sessionStorage.setItem("speak_mirror_session_tracked", "true");
        const currentCount = Number(currUser.user_metadata?.login_count || 0);
        const newCount = currentCount + 1;
        
        try {
          const { data, error } = await supabase.auth.updateUser({
            data: { login_count: newCount }
          });
          if (active) {
            if (error) {
              console.error("Failed to update user login count:", error.message);
              sessionStorage.removeItem("speak_mirror_session_tracked");
            } else if (data.user) {
              setUser(data.user);
            }
          }
        } catch (err) {
          console.error("Error updating user login count:", err);
          sessionStorage.removeItem("speak_mirror_session_tracked");
        }
      }
    };

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
              syncCookies(data.session);
              await fetchWorkspaces(data.session.user.id);
              await trackLoginSession(data.session.user);
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
              syncCookies(data.session);
              await fetchWorkspaces(data.session.user.id);
              await trackLoginSession(data.session.user);
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
              if (session) {
                syncCookies(session);
                await fetchWorkspaces(session.user.id);
                await trackLoginSession(session.user);
              }
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
        syncCookies(session);
        
        if (event === "SIGNED_OUT") {
          sessionStorage.removeItem("speak_mirror_session_tracked");
          setWorkspaces([{ id: "personal", name: "Personal Space" }]);
          setActiveWorkspaceState({ id: "personal", name: "Personal Space" });
          localStorage.removeItem("speak_mirror_active_workspace");
        } else if (session?.user) {
          fetchWorkspaces(session.user.id);
          trackLoginSession(session.user);
        }

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
    <AuthContext.Provider value={{ user, isLoading, activeWorkspace, setActiveWorkspace, workspaces, fetchWorkspaces }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
