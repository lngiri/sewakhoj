/**
 * Available Slots API
 *
 * GET /api/tasker/available-slots?taskerId=xxx&date=2026-05-20
 *
 * Returns available 1-hour time slots for a tasker on a given date,
 * filtered by: weekly schedule + blocked days + existing bookings.
 */

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taskerId = searchParams.get("taskerId");
    const date = searchParams.get("date");

    if (!taskerId || !date) {
      return NextResponse.json(
        { success: false, error: "taskerId and date query params are required" },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: "date must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Check if day is blocked first (fast path)
    const { data: blocked } = await supabase
      .from("tasker_blocked_days")
      .select("id")
      .eq("tasker_id", taskerId)
      .eq("blocked_date", date)
      .maybeSingle();

    if (blocked) {
      return NextResponse.json({
        success: true,
        taskerId,
        date,
        availableSlots: [],
        blocked: true,
        schedule: null,
      });
    }

    // Get available slots using the DB function
    const { data: slots, error } = await supabase.rpc("get_available_slots", {
      p_tasker_id: taskerId,
      p_date: date,
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Get the schedule for display context
    const { data: scheduleData } = await supabase
      .from("tasker_weekly_schedule")
      .select("schedule")
      .eq("tasker_id", taskerId)
      .maybeSingle();

    const dayOfWeek = new Date(date + "T00:00:00").getDay(); // 0=Sun
    const daySchedule = scheduleData?.schedule?.[dayOfWeek.toString()] || null;

    return NextResponse.json({
      success: true,
      taskerId,
      date,
      availableSlots: slots?.map((s: any) => s.slot_time) || [],
      blocked: false,
      schedule: daySchedule,
    });
  } catch (error: any) {
    console.error("Available-slots GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}