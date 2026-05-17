/**
 * Tasker Weekly Schedule API
 *
 * GET  /api/tasker/schedule — fetch schedule for authenticated tasker (or ?taskerId= for public)
 * PUT  /api/tasker/schedule — upsert schedule { schedule: { "0":{enabled,start,end}, ... } }
 *
 * The schedule JSONB format:
 * { "0": {"enabled": false},
 *   "1": {"enabled": true, "start": "09:00", "end": "18:00"}, ... }
 * Keys "0"-"6" = Sunday-Saturday
 */

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taskerId = searchParams.get("taskerId");

    const supabase = await createServerSupabaseClient();

    // Public access: fetch any tasker's schedule by ID
    if (taskerId) {
      const { data, error } = await supabase
        .from("tasker_weekly_schedule")
        .select("schedule")
        .eq("tasker_id", taskerId)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        schedule: data?.schedule || {},
      });
    }

    // Authenticated access: fetch own schedule
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get tasker profile
    const { data: tasker, error: taskerError } = await supabase
      .from("taskers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (taskerError || !tasker) {
      return NextResponse.json(
        { error: "Tasker profile not found" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("tasker_weekly_schedule")
      .select("schedule, updated_at")
      .eq("tasker_id", tasker.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      schedule: data?.schedule || {},
      updated_at: data?.updated_at || null,
    });
  } catch (error: any) {
    console.error("Schedule GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { schedule } = body;

    if (!schedule || typeof schedule !== "object") {
      return NextResponse.json(
        { error: "schedule object is required" },
        { status: 400 }
      );
    }

    // Validate schedule structure
    for (let d = 0; d <= 6; d++) {
      const day = schedule[d.toString()];
      if (day) {
        if (typeof day.enabled !== "boolean") {
          return NextResponse.json(
            { error: `Day ${d}: 'enabled' must be a boolean` },
            { status: 400 }
          );
        }
        if (day.enabled) {
          if (
            !day.start ||
            !day.end ||
            !/^\d{2}:\d{2}$/.test(day.start) ||
            !/^\d{2}:\d{2}$/.test(day.end)
          ) {
            return NextResponse.json(
              {
                error: `Day ${d}: 'start' and 'end' must be HH:MM format when enabled`,
              },
              { status: 400 }
            );
          }
        }
      }
    }

    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
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
        { error: "Tasker profile not found" },
        { status: 403 }
      );
    }

    // Upsert the schedule
    const { data, error } = await supabase
      .from("tasker_weekly_schedule")
      .upsert(
        { tasker_id: tasker.id, schedule, updated_at: new Date().toISOString() },
        { onConflict: "tasker_id" }
      )
      .select("schedule, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      schedule: data.schedule,
      updated_at: data.updated_at,
    });
  } catch (error: any) {
    console.error("Schedule PUT error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}