import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  
  // Debug logging
  console.log("========== AUTH CALLBACK DEBUG ==========");
  console.log("Full URL:", request.url);
  console.log("Search params:", Object.fromEntries(searchParams.entries()));
  console.log("Code present:", !!code);
  console.log("Cookies:", request.cookies.getAll().map(c => c.name));
  console.log("========== END DEBUG ==========");
  
  if (!code) {
    console.error("Auth callback - No code received. Full URL:", request.url);
    return NextResponse.redirect(new URL("/login?error=no_code", request.url));
  }

  try {
    // Create response that will be used for redirects
    const baseUrl = new URL(request.url);
    const response = NextResponse.redirect(new URL("/", baseUrl));
    
    // Create server-side Supabase client with proper cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value: "",
              ...options,
            });
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
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("Auth callback - get user error:", userError);
      return NextResponse.redirect(new URL("/login?error=no_user", request.url));
    }

    console.log("Auth callback - user authenticated:", user.id, user.email);

    // Check if user exists in users table
    const { data: existingUser, error: selectError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .single();

    console.log("Auth callback - existing user check:", { existingUser, selectError });

    // Get role and fullName from cookies (set by the client before OAuth redirect)
    const oauthRole = request.cookies.get("oauth_role")?.value || user.user_metadata?.role || "customer";
    const oauthFullName = request.cookies.get("oauth_fullName")?.value || 
                          user.user_metadata?.full_name || 
                          user.email?.split("@")[0] || 
                          "User";

    if (!existingUser) {
      // Get user metadata and URL parameters
      const fullName = oauthFullName;
      const city = null;
      const role = oauthRole as 'customer' | 'tasker';
      const avatarUrl = user.user_metadata?.avatar_url;
      
      console.log("Auth callback - creating/updating user:", { fullName, role, avatarUrl });
      
      // Use service role client to bypass RLS for user creation
      const serviceSupabase = new SupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      // Use upsert to handle cases where DB trigger already created the user
      const { error: upsertError } = await serviceSupabase.from("users").upsert({
        id: user.id,
        email: user.email,
        full_name: fullName,
        avatar_url: avatarUrl,
        city: city,
        role: role,
      }, {
        onConflict: 'id',
        ignoreDuplicates: false,
      });

      if (upsertError) {
        console.error("Auth callback - error upserting user:", upsertError);
        // Don't fail the auth flow if user creation fails - they can complete profile later
      } else {
        console.log("Auth callback - user created/updated successfully");
      }

      // Clear the OAuth cookies
      response.cookies.set("oauth_role", "", { maxAge: 0 });
      response.cookies.set("oauth_fullName", "", { maxAge: 0 });

      // Redirect taskers to onboarding
      if (role === 'tasker') {
        const onboardingResponse = NextResponse.redirect(new URL("/tasker/onboard", baseUrl));
        // Copy auth cookies to the onboarding response
        response.cookies.getAll().forEach(cookie => {
          onboardingResponse.cookies.set(cookie);
        });
        return onboardingResponse;
      }
    } else {
      // User exists, check if they need to go to onboarding
      if (existingUser.role === 'tasker') {
        // Check if tasker profile exists
        const { data: taskerProfile } = await supabase
          .from("taskers")
          .select("id")
          .eq("user_id", user.id)
          .single();
        
        if (!taskerProfile) {
          const onboardingResponse = NextResponse.redirect(new URL("/tasker/onboard", baseUrl));
          // Copy auth cookies to the onboarding response
          response.cookies.getAll().forEach(cookie => {
            onboardingResponse.cookies.set(cookie);
          });
          return onboardingResponse;
        }
      }
    }

    console.log("Auth callback - redirecting to home");
    return response;
  } catch (error) {
    console.error("Callback error:", error);
    return NextResponse.redirect(new URL("/login?error=server_error", request.url));
  }
}
