import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { validateAdminApiAccess, SETTINGS_ROLES } from "@/lib/admin-auth";

// GET /api/admin/reengagement - Get campaign stats and dormant user data
export async function GET(req: NextRequest) {
  try {
    const auth = await validateAdminApiAccess(SETTINGS_ROLES);
    if (auth instanceof NextResponse) return auth;

    const supabase = await createServerSupabaseClient();

    const searchParams = req.nextUrl.searchParams;
    const customerDays = parseInt(searchParams.get("customer_days") || "30");
    const taskerDays = parseInt(searchParams.get("tasker_days") || "30");

    // Get campaign stats
    const { data: campaignStats } = await supabase
      .rpc("get_campaign_stats");

    // Get dormant user stats
    const { data: dormantStats } = await supabase
      .rpc("get_dormant_user_stats", {
        p_customer_days: customerDays,
        p_tasker_days: taskerDays,
      });

    // Get recent campaigns
    const { data: recentCampaigns } = await supabase
      .from("reengagement_campaigns")
      .select("*")
      .order("run_at", { ascending: false })
      .limit(10);

    // Get templates
    const { data: templates } = await supabase
      .from("reengagement_templates")
      .select("*")
      .order("target_role")
      .order("channel");

    return NextResponse.json({
      campaignStats: campaignStats?.[0] || null,
      dormantStats: dormantStats || [],
      recentCampaigns: recentCampaigns || [],
      templates: templates || [],
      thresholds: { customerDays, taskerDays },
    });
  } catch (error: any) {
    console.error("Re-engagement GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/reengagement - Trigger a re-engagement campaign run
export async function POST(req: NextRequest) {
  try {
    const auth = await validateAdminApiAccess(SETTINGS_ROLES);
    if (auth instanceof NextResponse) return auth;

    const supabase = await createServerSupabaseClient();

    const body = await req.json();
    const customerDays = body.customer_days || 30;
    const taskerDays = body.tasker_days || 30;
    const channels = body.channels || ["notification"];

    // Create a service-role client for the DB function call
    const cookieStore = await cookies();
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() { return ""; },
          set() {},
          remove() {},
        },
      }
    );

    // Execute the campaign via the database function
    const { data: campaignId, error } = await supabaseAdmin
      .rpc("run_reengagement_campaign", {
        p_triggered_by: auth.userId,
        p_customer_days: customerDays,
        p_tasker_days: taskerDays,
        p_channels: channels,
      });

    if (error) {
      console.error("Campaign RPC error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch the campaign result
    const { data: campaign } = await supabaseAdmin
      .from("reengagement_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    return NextResponse.json({ campaign, campaign_id: campaignId });
  } catch (error: any) {
    console.error("Re-engagement POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/reengagement - Update templates
export async function PATCH(req: NextRequest) {
  try {
    const auth = await validateAdminApiAccess(SETTINGS_ROLES);
    if (auth instanceof NextResponse) return auth;

    const supabase = await createServerSupabaseClient();

    const body = await req.json();
    const { template_id, title, body: templateBody, is_active } = body;

    if (!template_id) {
      return NextResponse.json({ error: "template_id required" }, { status: 400 });
    }

    const updates: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (templateBody !== undefined) updates.body = templateBody;
    if (is_active !== undefined) updates.is_active = is_active;

    const { error } = await supabase
      .from("reengagement_templates")
      .update(updates)
      .eq("id", template_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Re-engagement PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}