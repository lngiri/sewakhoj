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

    // Step 1: Exchange OAuth code for session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Auth callback exchange error:", exchangeError);
      return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
    }

    // Step 2: Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Auth callback no user:", userError);
      return NextResponse.redirect(new URL("/login?error=no_user", request.url));
    }

    // Step 3: Determine target URL
    let targetUrl = next;

    // Check if user exists in our DB
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    const oauthRole = request.cookies.get("oauth_role")?.value || user.user_metadata?.role || "customer";
    const oauthFullName = request.cookies.get("oauth_fullName")?.value || user.user_metadata?.full_name || "User";
    const oauthReferral = request.cookies.get("oauth_referral")?.value || user.user_metadata?.referred_by;

    // Service role client — only create if key is available (may be missing in Vercel env)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const serviceSupabase = serviceKey
      ? new SupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
      : null;

    if (!serviceKey) {
      console.warn("Auth callback: SUPABASE_SERVICE_ROLE_KEY not set — relying on DB triggers for user provisioning");
    }

    if (!existingUser) {
      // New user — DB trigger on_auth_user_created already inserted into public.users
      // We do a best-effort upsert to fill in any missing fields (full_name, avatar, referral)
      try {
        // Look up referrer UUID from referral code
        let referrerId: string | null = null;
        if (oauthReferral && serviceSupabase) {
          const { data: referrer } = await serviceSupabase
            .from('users')
            .select('id')
            .eq('referral_code', oauthReferral)
            .maybeSingle();
          if (referrer) referrerId = referrer.id;
        }

        // Upsert user profile (safe — uses ON CONFLICT DO NOTHING in trigger)
        const upsertClient = serviceSupabase || supabase;
        await upsertClient.from("users").upsert({
          id: user.id,
          email: user.email,
          full_name: oauthFullName,
          avatar_url: user.user_metadata?.avatar_url,
          role: oauthRole,
          referred_by: referrerId,
        });

        // Insert user_roles (use check-then-insert to avoid UPDATE RLS dependency)
        const { data: existingRole } = await upsertClient
          .from("user_roles")
          .select("id")
          .eq("user_id", user.id)
          .eq("role", oauthRole)
          .maybeSingle();
        if (!existingRole) {
          await upsertClient.from("user_roles").insert({
            user_id: user.id,
            role: oauthRole,
          });
        }

        // Create referral record (requires service role due to RLS)
        if (referrerId && serviceSupabase) {
          await serviceSupabase.from('referrals').upsert({
            referrer_id: referrerId,
            referred_id: user.id,
            referral_code: oauthReferral,
            status: 'joined'
          }, { onConflict: 'referred_id' });
        }
      } catch (dbError) {
        // DB operations failed, but user is authenticated — continue with redirect
        console.error("Auth callback DB write error (non-fatal):", dbError);
      }

      targetUrl = oauthRole === "tasker" ? "/tasker/onboard" : "/dashboard";
    } else {
      // Existing user — backfill user_roles and determine redirect
      try {
        const upsertClient = serviceSupabase || supabase;
        // Check-then-insert to avoid UPDATE RLS dependency
        const { data: existingRole } = await upsertClient
          .from("user_roles")
          .select("id")
          .eq("user_id", user.id)
          .eq("role", existingUser.role || oauthRole)
          .maybeSingle();
        if (!existingRole) {
          await upsertClient.from("user_roles").insert({
            user_id: user.id,
            role: existingUser.role || oauthRole,
          });
        }
      } catch (dbError) {
        console.error("Auth callback user_roles backfill error (non-fatal):", dbError);
      }

      // Check for Admin/Staff role
      const { data: staffData } = await supabase
        .from('staff_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      const isAdmin = staffData || (existingUser.role === 'admin' || existingUser.role === 'super_admin');

      if (isAdmin) {
        targetUrl = "/admin";
      } else if (existingUser.role === "tasker") {
        const { data: profile } = await supabase
          .from("taskers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        targetUrl = profile ? "/dashboard" : "/tasker/onboard";
      } else {
        targetUrl = "/dashboard";
      }
    }

    // Step 4: Redirect with session cookies
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
