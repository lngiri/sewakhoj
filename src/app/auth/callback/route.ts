import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/";

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

    // Password reset flow is now handled directly at /reset-password
    // This callback is only for OAuth, magic link, and signup flows

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

      // Insert role into user_roles table
      const { error: roleInsertError } = await serviceSupabase
        .from("user_roles")
        .insert({ user_id: user.id, role: role });

      if (roleInsertError) {
        console.error("Auth callback - error inserting user role:", roleInsertError);
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

      // Check user roles from user_roles table for redirection logic
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      console.log("Auth callback - user roles:", { userRoles, rolesError });

      if (!rolesError && userRoles) {
        const roles = userRoles.map((r) => r.role);
        console.log("Auth callback - user has roles:", roles);

        // Redirect based on role count
        if (roles.length === 1) {
          // Single role - auto-redirect to corresponding dashboard
          if (roles[0] === "customer") {
            const dashboardResponse = NextResponse.redirect(new URL("/dashboard", baseUrl));
            response.cookies.getAll().forEach((cookie) => {
              dashboardResponse.cookies.set(cookie);
            });
            return dashboardResponse;
          } else if (roles[0] === "tasker") {
            const taskerResponse = NextResponse.redirect(new URL("/tasker", baseUrl));
            response.cookies.getAll().forEach((cookie) => {
              taskerResponse.cookies.set(cookie);
            });
            return taskerResponse;
          }
        } else if (roles.length === 2 && roles.includes("customer") && roles.includes("tasker")) {
          // Both roles - redirect to role selection page
          const roleSelectionResponse = NextResponse.redirect(new URL("/role-selection", baseUrl));
          response.cookies.getAll().forEach((cookie) => {
            roleSelectionResponse.cookies.set(cookie);
          });
          return roleSelectionResponse;
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
