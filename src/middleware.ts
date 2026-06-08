import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
      cookieOptions: {
        secure: process.env.NODE_ENV === "production",
      },
    }
  );

  // Validate server-side JWT signatures
  const { pathname } = request.nextUrl;
  const { data: { user } } = await supabase.auth.getUser();

  // If user is logged in, check if onboarding is completed
  if (user) {
    const isExcludedFromOnboarding =
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/onboarding") ||
      pathname.startsWith("/terms") ||
      pathname.startsWith("/privacy") ||
      pathname === "/favicon.ico";

    if (!isExcludedFromOnboarding) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile || !profile.onboarding_completed) {
          const onboardingUrl = new URL("/onboarding", request.url);
          return NextResponse.redirect(onboardingUrl);
        }
      } catch (err) {
        console.error("Middleware onboarding check error:", err);
      }
    }
  }

  // Protect paths: /profile, /rooms, /admin
  const isProtectedPath =
    pathname.startsWith("/profile") ||
    pathname.startsWith("/rooms") ||
    pathname.startsWith("/admin");

  if (isProtectedPath && !user) {
    const loginUrl = new URL("/auth", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Admin role check for admin routes
  if (pathname.startsWith("/admin") && user && user.user_metadata?.role !== "admin") {
    const url = new URL("/practice", request.url);
    return NextResponse.redirect(url);
  }

  // Mentor dashboard check
  const segments = pathname.split("/");
  const roomId = segments[2];
  if (pathname.includes("/mentor-dashboard") && roomId && user) {
    try {
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("organization_id")
        .eq("id", roomId)
        .single();

      if (roomError || !room || !room.organization_id) {
        const url = new URL("/practice", request.url);
        return NextResponse.redirect(url);
      }

      const { data: membership, error: memberError } = await supabase
        .from("organization_users")
        .select("role")
        .eq("organization_id", room.organization_id)
        .eq("user_id", user.id)
        .single();

      if (memberError || !membership || membership.role !== "admin") {
        const url = new URL("/practice", request.url);
        return NextResponse.redirect(url);
      }
    } catch (err) {
      console.error("Middleware dashboard check error:", err);
      const url = new URL("/practice", request.url);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
