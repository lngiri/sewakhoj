import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createServerClient } from "@supabase/ssr";
import { sendSMS } from "@/lib/sms";
import { validateAdminApiAccess, SETTINGS_ROLES } from "@/lib/admin-auth";

// POST /api/admin/reengagement/process-sms - Process pending SMS queue entries
export async function POST(req: NextRequest) {
  try {
    const auth = await validateAdminApiAccess(SETTINGS_ROLES);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const limit = Math.min(body.limit || 20, 100);

    // Use service role client to read the queue
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

    // Fetch pending SMS
    const { data: pending, error: fetchError } = await supabaseAdmin
      .from("sms_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!pending || pending.length === 0) {
      return NextResponse.json({ processed: 0, sent: 0, failed: 0, remaining: 0 });
    }

    let sent = 0;
    let failed = 0;

    for (const entry of pending) {
      try {
        const result = await sendSMS({
          to: entry.phone,
          text: entry.message,
        });

        if (result.success) {
          await supabaseAdmin
            .from("sms_queue")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", entry.id);
          sent++;
        } else {
          await supabaseAdmin
            .from("sms_queue")
            .update({
              status: "failed",
              error_message: result.error || "Unknown error",
            })
            .eq("id", entry.id);
          failed++;
        }
      } catch (err: any) {
        await supabaseAdmin
          .from("sms_queue")
          .update({
            status: "failed",
            error_message: err.message || "Unknown error",
          })
          .eq("id", entry.id);
        failed++;
      }
    }

    // Count remaining
    const { count } = await supabaseAdmin
      .from("sms_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    return NextResponse.json({
      processed: pending.length,
      sent,
      failed,
      remaining: count || 0,
    });
  } catch (error: any) {
    console.error("SMS queue processor error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/admin/reengagement/process-sms - Check queue status
export async function GET(req: NextRequest) {
  try {
    const auth = await validateAdminApiAccess(SETTINGS_ROLES);
    if (auth instanceof NextResponse) return auth;

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

    const { count: pending } = await supabaseAdmin
      .from("sms_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: sent } = await supabaseAdmin
      .from("sms_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "sent");

    const { count: failed } = await supabaseAdmin
      .from("sms_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "failed");

    return NextResponse.json({
      pending: pending || 0,
      sent: sent || 0,
      failed: failed || 0,
      total: (pending || 0) + (sent || 0) + (failed || 0),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}