import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { User } from "@/types";

/**
 * Resolves the current authenticated user from request headers or cookie store.
 */
export async function getCurrentUser(request?: Request): Promise<User | null> {
  try {
    if (request) {
      // 1. Resolve from Bearer Authorization header
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
        const token = authHeader.substring(7);
        const supabaseAdmin = getSupabaseAdmin();
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (!error && user) return user as User;
      }

      // 2. Resolve from Cookie header (fallback for direct fetches)
      const cookieHeader = request.headers.get("cookie") || "";
      const token = cookieHeader
        .split("; ")
        .find(c => c.trim().startsWith("sb-access-token="))
        ?.split("=")[1];
      if (token) {
        const supabaseAdmin = getSupabaseAdmin();
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (!error && user) return user as User;
      }
    }

    // 3. Fall back to standard server-side client using cookies store
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) return user as User;

    return null;
  } catch (err) {
    console.error("getCurrentUser error:", err);
    return null;
  }
}

/**
 * Ensures the user is authenticated, throwing an error if they are not.
 */
export async function requireAuth(request?: Request): Promise<User> {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

/**
 * Ensures the user is authenticated and has the 'admin' role.
 */
export async function requireAdmin(request?: Request): Promise<User> {
  const user = await requireAuth(request);
  if (user.user_metadata?.role !== "admin") {
    throw new Error("Forbidden: Admin privileges required");
  }
  return user;
}

/**
 * Ensures the user is authenticated and holds a specific role in their user metadata.
 */
export async function requireRole(role: string, request?: Request): Promise<User> {
  const user = await requireAuth(request);
  if (user.user_metadata?.role !== role) {
    throw new Error(`Forbidden: Role '${role}' required`);
  }
  return user;
}
