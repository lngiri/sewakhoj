/**
 * Tasker Block Day API
 *
 * GET    /api/tasker/block-day?taskerId=xxx — list blocked days (public, future only)
 * GET    /api/tasker/block-day — list own blocked days (authenticated tasker)
 * POST   /api/tasker/block-day — block a day { date: "2026-05-20", reason: "Sick" }
 * DELETE /api/tasker/block-day — unblock a day { date: "2026-05-20" }
 */

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taskerId = searchParams.get("taskerId");

    const supabase = await createServerSupabaseClient();

    // Public access: fetch any tasker's blocked days by ID (for booking page)
    if (taskerId) {
      const { data, error } = await supabase
        .from("tasker_blocked_days")
        .select("id, blocked_date, reason, created_at")
        .eq("tasker_id", taskerId)
        .gte("blocked_date", new Date().toISOString().split("T")[0])
        .order("blocked_date", { ascending: true });

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        blockedDays: data || [],
      });
    }

    // Authenticated access: fetch own blocked days
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { data: tasker, error: taskerError } = await supabase
      .from("taskers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (taskerError || !tasker) {
      return NextResponse.json(
        { success: false, error: "Tasker profile not found" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("tasker_blocked_days")
      .select("id, blocked_date, reason, created_at")
      .eq("tasker_id", tasker.id)
      .gte("blocked_date", new Date().toISOString().split("T")[0])
      .order("blocked_date", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      blockedDays: data || [],
    });
  } catch (error: any) {
    console.error("Block-day GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, reason } = body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: "date is required in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    // Prevent blocking past dates
    const today = new Date().toISOString().split("T")[0];
    if (date < today) {
      return NextResponse.json(
        { success: false, error: "Cannot block a past date" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { data: tasker, error: taskerError } = await supabase
      .from("taskers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (taskerError || !tasker) {
      return NextResponse.json(
        { success: false, error: "Tasker profile not found" },
        { status: 403 }
      );
    }

    // Insert blocked day (unique constraint prevents duplicates)
    const { data, error } = await supabase
      .from("tasker_blocked_days")
      .insert({
        tasker_id: tasker.id,
        blocked_date: date,
        reason: reason || null,
      })
      .select("id, blocked_date, reason, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { success: false, error: "This date is already blocked" },
          { status: 409 }
        );
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      blockedDay: data,
    });
  } catch (error: any) {
    console.error("Block-day POST error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { date } = body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: "date is required in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { data: tasker, error: taskerError } = await supabase
      .from("taskers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (taskerError || !tasker) {
      return NextResponse.json(
        { success: false, error: "Tasker profile not found" },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("tasker_blocked_days")
      .delete()
      .eq("tasker_id", tasker.id)
      .eq("blocked_date", date);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Unblocked ${date}`,
    });
  } catch (error: any) {
    console.error("Block-day DELETE error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}