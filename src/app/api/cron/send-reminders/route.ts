/**
 * GET /api/cron/send-reminders
 *
 * Cron job trigger for send_booking_reminders().
 * Call this endpoint every 15 minutes (cron schedule: every 15 min)
 * to send push notifications for bookings starting in 1 hour.
 *
 * Authentication: Requires CRON_SECRET header matching CRON_SECRET env var.
 *
 * Deployment:
 *   - Vercel: Add to vercel.json cron jobs section
 *   - Cloudflare: Add cron trigger in wrangler.toml or Cloudflare Dashboard
 *   - External: Any cron service (cron-job.org, etc.) can POST to this URL
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Authenticate via CRON_SECRET header
  const authHeader = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error(
      "CRON_SECRET environment variable is not set. " +
        "Set it in your deployment environment to secure this endpoint."
    );
    return NextResponse.json(
      { success: false, error: "Server misconfigured: CRON_SECRET not set" },
      { status: 500 }
    );
  }

  if (authHeader !== expectedSecret) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  try {
    const { data, error } = await supabase.rpc("send_booking_reminders");

    if (error) {
      console.error("send_booking_reminders RPC failed:", error);
      return NextResponse.json(
        { success: false, error: "RPC failed", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Booking reminders processed",
      data,
    });
  } catch (err) {
    console.error("send_booking_reminders error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export { GET as POST };
