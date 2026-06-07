import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/profile";
  const origin = requestUrl.origin;

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
        cookieOptions: {
          secure: process.env.NODE_ENV === "production",
        },
      }
    );

    // Exchange the authorization code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      const response = NextResponse.redirect(`${origin}${next}`);
      response.cookies.set("sb-access-token", data.session.access_token, {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      response.cookies.set("sb-refresh-token", data.session.refresh_token, {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      return response;
    }
  }

  // Redirect the user to the next page or home/profile
  return NextResponse.redirect(`${origin}${next}`);
}
