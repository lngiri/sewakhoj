import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const taskerId = request.nextUrl.searchParams.get("taskerId");
  if (!taskerId) {
    return NextResponse.json({ error: "Missing taskerId" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data } = await supabase
    .from("tasker_blocked_days")
    .select("blocked_date")
    .eq("tasker_id", taskerId);

  return NextResponse.json({ blockedDays: data || [] });
}
