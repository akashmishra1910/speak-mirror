import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Next.js config matcher handles routing triggers.
  // But we still extract segment parameters safely.
  const segments = pathname.split("/");
  // segments = ["", "rooms", "room_id", "mentor-dashboard"]
  const roomId = segments[2];

  if (!roomId) {
    return NextResponse.next();
  }

  // 1. Retrieve the access token from cookies
  const token = request.cookies.get("sb-access-token")?.value;

  if (!token) {
    // If not authenticated, redirect to the auth page
    const loginUrl = new URL("/auth", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Initialize a server-side Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );

  // 3. Retrieve user profile safely from the token
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    const loginUrl = new URL("/auth", request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // 4. Query the rooms table to find the organization_id of the room
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("organization_id")
      .eq("id", roomId)
      .single();

    if (roomError || !room || !room.organization_id) {
      // If room is invalid or has no organization scoped, deny access to dashboard
      console.warn(`Access denied to dashboard: Room ${roomId} has no organization scopes.`);
      return NextResponse.redirect(new URL("/practice", request.url));
    }

    // 5. Query organization_users mapping to verify user role
    const { data: membership, error: memberError } = await supabase
      .from("organization_users")
      .select("role")
      .eq("organization_id", room.organization_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !membership || membership.role !== "admin") {
      // If they are only a member or do not belong to the organization, deny access
      console.warn(`User ${user.id} denied access to room ${roomId} mentor-dashboard (role: ${membership?.role || 'none'}).`);
      return NextResponse.redirect(new URL("/practice", request.url));
    }

    // Access granted
    return NextResponse.next();

  } catch (err) {
    console.error("Middleware database lookup error:", err);
    return NextResponse.redirect(new URL("/practice", request.url));
  }
}

// Config matcher ensures this middleware only runs for mentor-dashboard views,
// completely avoiding any performance impact on any other page or asset requests.
export const config = {
  matcher: "/rooms/:id/mentor-dashboard",
};
