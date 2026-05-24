import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Sparrow SMS helper (Edge Function native) ──
const SPARROW_BASE = "http://api.sparrowsms.com/v2";

async function sendSparrowSMS(phone: string, text: string): Promise<boolean> {
  const token = Deno.env.get("SPARROW_SMS_TOKEN");
  const identity = Deno.env.get("SPARROW_SMS_IDENTITY") || "SewaKhoj";

  if (!token) {
    console.log("[SMS MOCK]", "To:", phone, "Text:", text);
    return true; // mock mode — don't block the flow
  }

  // Clean phone: strip +977 / 977 prefix, keep 10 digits
  const clean = phone.replace(/[^0-9]/g, "");
  let normalized = clean;
  if (normalized.startsWith("977") && normalized.length === 13) {
    normalized = normalized.slice(3);
  }

  try {
    const params = new URLSearchParams({ token, from: identity, to: normalized, text });
    const res = await fetch(`${SPARROW_BASE}/sms/?${params.toString()}`);
    const data = await res.json();
    return data.response_code === 200;
  } catch (err) {
    console.error("[SMS ERROR]", err);
    return false;
  }
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { taskerId, pillars, action, reason } = await req.json();

    // Validate inputs
    if (!taskerId) {
      return new Response(JSON.stringify({ error: "Missing taskerId" }), { status: 400 });
    }
    if (!action || !["approve", "reject"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
    }

    // Get authenticated user from token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
    }

    // Verify admin has super_admin or admin role
    const { data: adminRole, error: roleError } = await supabase
      .from("staff_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || !["super_admin", "admin"].includes(adminRole?.role)) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 403 });
    }

    // Verify tasker exists and is in pending status
    const { data: tasker, error: taskerError } = await supabase
      .from("taskers")
      .select("id, user_id, status")
      .eq("id", taskerId)
      .single();

    if (taskerError || !tasker) {
      return new Response(JSON.stringify({ error: "Tasker not found" }), { status: 404 });
    }

    if (tasker.status !== "pending") {
      return new Response(JSON.stringify({ error: "Tasker is not in pending status" }), { status: 400 });
    }

    // Fetch tasker's phone from public.users for SMS
    const { data: userProfile } = await supabase
      .from("users")
      .select("phone")
      .eq("id", tasker.user_id)
      .single();

    const taskerPhone = userProfile?.phone || null;

    if (action === "approve") {
      // Verify at least id pillar is true
      if (!pillars?.id) {
        return new Response(JSON.stringify({ error: "ID verification is mandatory for approval" }), { status: 400 });
      }

      // Perform approval
      const { error: updateError } = await supabase
        .from("taskers")
        .update({
          status: "active",
          id_verified: pillars.id
        })
        .eq("id", taskerId);

      if (updateError) {
        return new Response(JSON.stringify({ error: "Failed to update tasker" }), { status: 500 });
      }

      // Update KYC status
      await supabase
        .from("tasker_kyc")
        .update({ status: "approved", reviewed_at: new Date().toISOString() })
        .eq("tasker_id", taskerId);

      // Send in-app notification
      await supabase.from("notifications").insert({
        user_id: tasker.user_id,
        title: "Application Approved! 🎉",
        message: "Congratulations! Your SewaKhoj Tasker profile is now active. You can now start receiving bookings.",
        type: "status",
        link: "/dashboard"
      });

      // Send SMS notification
      if (taskerPhone) {
        await sendSparrowSMS(
          taskerPhone,
          "Congratulations! Your SewaKhoj Tasker profile is now active. Start receiving bookings now. Login: sewakhoj.com/dashboard"
        );
      }
    } else if (action === "reject") {
      // Perform rejection
      const { error: updateError } = await supabase
        .from("taskers")
        .update({
          status: "rejected"
        })
        .eq("id", taskerId);

      if (updateError) {
        return new Response(JSON.stringify({ error: "Failed to update tasker" }), { status: 500 });
      }

      // Update KYC status
      await supabase
        .from("tasker_kyc")
        .update({
          status: "rejected",
          admin_note: reason,
          reviewed_at: new Date().toISOString()
        })
        .eq("tasker_id", taskerId);

      // Send in-app notification
      await supabase.from("notifications").insert({
        user_id: tasker.user_id,
        title: "Action Required: Profile Update",
        message: `Your SewaKhoj tasker application requires changes. Reason: ${reason || "Please review guidelines"}`,
        type: "alert",
        link: "/tasker/onboard"
      });

      // Send SMS notification with reason
      if (taskerPhone) {
        const smsText = reason
          ? `SewaKhoj: Your tasker application needs updates. Reason: ${reason}. Fix here: sewakhoj.com/tasker/onboard`
          : `SewaKhoj: Your tasker application needs updates. Please review guidelines at sewakhoj.com/tasker/onboard`;
        await sendSparrowSMS(taskerPhone, smsText);
      }
    }

    // Insert audit log
    await supabase.from("system_logs").insert({
      admin_id: user.id,
      tasker_id: taskerId,
      action: action,
      timestamp: new Date().toISOString(),
      reason: reason || null
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
