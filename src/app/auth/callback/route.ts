import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/";

  // Debug logging
  console.log("========== AUTH CALLBACK DEBUG ==========");
  console.log("Full URL:", request.url);
  console.log("Search params:", Object.fromEntries(searchParams.entries()));
  console.log("Code present:", !!code);
  console.log("Next:", next);
  console.log("========== END DEBUG ==========");

  if (!code) {
    console.error("Auth callback - No code received. Full URL:", request.url);
    return NextResponse.redirect(new URL("/login?error=no_code", request.url));
  }

  try {
    const baseUrl = new URL(request.url);

    // Collect cookies to apply to the final response
    const responseCookies: Array<{ name: string; value: string; options: CookieOptions }> = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            responseCookies.push({ name, value, options });
          },
          remove(name: string, options: CookieOptions) {
            responseCookies.push({ name, value: "", options });
          },
        },
      }
    );

    // Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Auth callback - code exchange error:", exchangeError);
      return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
    }

    // Get the user from the newly created session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Auth callback - get user error:", userError);
      return NextResponse.redirect(new URL("/login?error=no_user", request.url));
    }

    console.log("Auth callback - user authenticated:", user.id, user.email);

    // Detect password reset flow: next=/reset-password or type=recovery
    const isPasswordReset =
      next === "/reset-password" ||
      next.includes("reset-password") ||
      searchParams.get("type") === "recovery";

    if (isPasswordReset) {
      console.log("Auth callback - password reset flow detected, redirecting to /reset-password");

      // For password reset: only establish the session and redirect.
      // Skip all user-setup / role-checking / onboarding logic.
      const resetResponse = NextResponse.redirect(new URL("/reset-password", baseUrl));

      responseCookies.forEach((cookie) => {
        resetResponse.cookies.set({
          name: cookie.name,
          value: cookie.value,
          ...cookie.options,
        });
      });

      return resetResponse;
    }

    // ---- Regular auth flow (OAuth, magic link, etc.) ----
    console.log("Auth callback - regular auth flow, next:", next);

    const response = NextResponse.redirect(new URL(next, baseUrl));

    responseCookies.forEach((cookie) => {
      response.cookies.set({
        name: cookie.name,
        value: cookie.value,
        ...cookie.options,
      });
    });

    // Check if user exists in users table
    const { data: existingUser, error: selectError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .single();

    console.log("Auth callback - existing user check:", { existingUser, selectError });

    // Get role and fullName from cookies (set by the client before OAuth redirect)
    const oauthRole =
      request.cookies.get("oauth_role")?.value || user.user_metadata?.role || "customer";
    const oauthFullName =
      request.cookies.get("oauth_fullName")?.value ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "User";

    if (!existingUser) {
      const fullName = oauthFullName;
      const city = null;
      const role = oauthRole as "customer" | "tasker";
      const avatarUrl = user.user_metadata?.avatar_url;

      console.log("Auth callback - creating/updating user:", { fullName, role, avatarUrl });

      // Use service role client to bypass RLS for user creation
      const serviceSupabase = new SupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { error: upsertError } = await serviceSupabase.from("users").upsert(
        {
          id: user.id,
          email: user.email,
          full_name: fullName,
          avatar_url: avatarUrl,
          city: city,
          role: role,
        },
        {
          onConflict: "id",
          ignoreDuplicates: false,
        }
      );

      if (upsertError) {
        console.error("Auth callback - error upserting user:", upsertError);
      } else {
        console.log("Auth callback - user created/updated successfully");
      }

      // Clear the OAuth cookies
      response.cookies.set("oauth_role", "", { maxAge: 0 });
      response.cookies.set("oauth_fullName", "", { maxAge: 0 });

      // Redirect taskers to onboarding
      if (role === "tasker") {
        const onboardingResponse = NextResponse.redirect(new URL("/tasker/onboard", baseUrl));
        response.cookies.getAll().forEach((cookie) => {
          onboardingResponse.cookies.set(cookie);
        });
        return onboardingResponse;
      }
    } else {
      // User exists, check if they need to go to onboarding
      if (existingUser.role === "tasker") {
        const { data: taskerProfile } = await supabase
          .from("taskers")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!taskerProfile) {
          const onboardingResponse = NextResponse.redirect(new URL("/tasker/onboard", baseUrl));
          response.cookies.getAll().forEach((cookie) => {
            onboardingResponse.cookies.set(cookie);
          });
          return onboardingResponse;
        }
      }
    }

    console.log("Auth callback - redirecting to:", next);
    return response;
  } catch (error) {
    console.error("Callback error:", error);
    return NextResponse.redirect(new URL("/login?error=server_error", request.url));
  }
}
