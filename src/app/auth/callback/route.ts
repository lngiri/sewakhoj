import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", request.url));
  }

  try {
    const baseUrl = new URL(request.url);
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

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Auth callback exchange error:", exchangeError);
      return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.redirect(new URL("/login?error=no_user", request.url));
    }

    // Determine target URL based on user status and role
    let targetUrl = next;

    // Check if user exists in our DB
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .single();

    const oauthRole = request.cookies.get("oauth_role")?.value || user.user_metadata?.role || "customer";
    const oauthFullName = request.cookies.get("oauth_fullName")?.value || user.user_metadata?.full_name || "User";
    const oauthReferral = request.cookies.get("oauth_referral")?.value || user.user_metadata?.referred_by;

    if (!existingUser) {
      // New user creation
      const serviceSupabase = new SupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      await serviceSupabase.from("users").upsert({
        id: user.id,
        email: user.email,
        full_name: oauthFullName,
        avatar_url: user.user_metadata?.avatar_url,
        role: oauthRole,
        referred_by: oauthReferral || null,
      });

      await serviceSupabase.from("user_roles").insert({ user_id: user.id, role: oauthRole });

      // Create referral record if there's a referral code
      if (oauthReferral) {
        // Find the referrer by their referral code
        const { data: referrer } = await serviceSupabase
          .from('users')
          .select('id')
          .eq('referral_code', oauthReferral)
          .single();
        
        if (referrer) {
          await serviceSupabase.from('referrals').insert({
            referrer_id: referrer.id,
            referred_id: user.id,
            referral_code: oauthReferral,
            status: 'joined'
          });
        }
      }

      if (oauthRole === "tasker") {
        targetUrl = "/tasker/onboard";
      } else {
        targetUrl = "/dashboard";
      }
    } else {
      // Existing user redirection logic
      
      // Check for Admin/Staff role from both tables for redundancy
      const { data: staffData } = await supabase
        .from('staff_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const isAdmin = staffData || (existingUser && (existingUser.role === 'admin' || existingUser.role === 'super_admin'));

      if (isAdmin) {
        targetUrl = "/admin";
      } else if (existingUser.role === "tasker") {
        const { data: profile } = await supabase.from("taskers").select("id").eq("user_id", user.id).single();
        targetUrl = profile ? "/tasker" : "/tasker/onboard";
      } else {
        targetUrl = "/dashboard";
      }
    }

    const response = NextResponse.redirect(new URL(targetUrl, baseUrl));

    // Apply Supabase session cookies
    responseCookies.forEach((c) => response.cookies.set({ name: c.name, value: c.value, ...c.options }));

    // Clear temp OAuth cookies
    response.cookies.set("oauth_role", "", { maxAge: 0 });
    response.cookies.set("oauth_fullName", "", { maxAge: 0 });
    response.cookies.set("oauth_referral", "", { maxAge: 0 });

    return response;
  } catch (error) {
    console.error("Auth callback crash:", error);
    return NextResponse.redirect(new URL("/login?error=server_error", request.url));
  }
}
