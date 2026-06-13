import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const taskerId = request.nextUrl.searchParams.get("taskerId");
  const date = request.nextUrl.searchParams.get("date");
  if (!taskerId || !date) {
    return NextResponse.json({ error: "Missing taskerId or date" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: blocked, error: blockedError } = await supabase
    .rpc("is_day_blocked", { p_tasker_id: taskerId, p_date: date });

  if (!blockedError && blocked) {
    return NextResponse.json({ blocked: true, availableSlots: [] });
  }

  const { data: slots, error } = await supabase
    .rpc("get_available_slots", { p_tasker_id: taskerId, p_date: date });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!slots || slots.length === 0) {
    return NextResponse.json({ blocked: false, availableSlots: [] });
  }

  return NextResponse.json({ blocked: false, availableSlots: slots });
}
