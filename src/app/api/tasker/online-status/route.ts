import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// GET /api/tasker/online-status?taskerId=xxx
// Returns the current online status for a tasker.
// Optionally force-refreshes by calling auto_toggle_tasker_online() via RPC.

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskerId = searchParams.get("taskerId");
  const refresh = searchParams.get("refresh") === "1";

  if (!taskerId) {
    return NextResponse.json(
      { success: false, error: "taskerId is required" },
      { status: 400 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Optionally trigger a refresh of the online status
  if (refresh) {
    await supabase.rpc("auto_toggle_tasker_online");
  }

  const { data, error } = await supabase
    .from("taskers")
    .select("id, is_online, status")
    .eq("id", taskerId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch status", details: error.message },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { success: false, error: "Tasker not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    taskerId: data.id,
    isOnline: data.is_online,
    status: data.status,
  });
}
