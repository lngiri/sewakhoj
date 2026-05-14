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

    // Check if user exists in our DB (use maybeSingle to avoid crash when no row)
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    const oauthRole = request.cookies.get("oauth_role")?.value || user.user_metadata?.role || "customer";
    const oauthFullName = request.cookies.get("oauth_fullName")?.value || user.user_metadata?.full_name || "User";
    const oauthReferral = request.cookies.get("oauth_referral")?.value || user.user_metadata?.referred_by;

    // Use service role client for all DB mutations to bypass RLS
    const serviceSupabase = new SupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (!existingUser) {
      // Look up referrer UUID FIRST (referral code → UUID)
      // users.referred_by is UUID REFERENCES users(id), not a string
      let referrerId: string | null = null;
      if (oauthReferral) {
        const { data: referrer } = await serviceSupabase
          .from('users')
          .select('id')
          .eq('referral_code', oauthReferral)
          .maybeSingle();
        if (referrer) {
          referrerId = referrer.id;
        }
      }

      // New user creation
      await serviceSupabase.from("users").upsert({
        id: user.id,
        email: user.email,
        full_name: oauthFullName,
        avatar_url: user.user_metadata?.avatar_url,
        role: oauthRole,
        referred_by: referrerId, // UUID, not referral code string
      });

      // Use upsert to handle case where DB trigger already created the role
      await serviceSupabase.from("user_roles").upsert(
        { user_id: user.id, role: oauthRole },
        { onConflict: 'user_id,role' }
      );

      // Create referral record if there's a referral code
      // Use upsert to handle DB trigger race condition (process_referral_on_signup)
      if (referrerId) {
        await serviceSupabase.from('referrals').upsert({
          referrer_id: referrerId,
          referred_id: user.id,
          referral_code: oauthReferral,
          status: 'joined'
        }, { onConflict: 'referred_id' });
      }

      if (oauthRole === "tasker") {
        targetUrl = "/tasker/onboard";
      } else {
        targetUrl = "/dashboard";
      }
    } else {
      // Existing user redirection logic

      // Ensure user_roles record exists (backfill for users created via DB trigger without it)
      await serviceSupabase.from("user_roles").upsert(
        { user_id: user.id, role: existingUser.role || oauthRole },
        { onConflict: 'user_id,role' }
      );
      
      // Check for Admin/Staff role (use maybeSingle to avoid crash for non-staff)
      const { data: staffData } = await supabase
        .from('staff_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      const isAdmin = staffData || (existingUser.role === 'admin' || existingUser.role === 'super_admin');

      if (isAdmin) {
        targetUrl = "/admin";
      } else if (existingUser.role === "tasker") {
        // Use maybeSingle to avoid crash for non-tasker users
        const { data: profile } = await supabase
          .from("taskers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
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
