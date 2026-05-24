/**
 * POST /api/bookings/accept
 *
 * Tasker accepts a pending_acceptance booking.
 * Validates: booking belongs to authenticated tasker, status is 'pending_acceptance'.
 * Updates status to 'confirmed', clears acceptance_deadline.
 * Updates tasker_acceptance_metrics (accepted_count, avg_response_time).
 */

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "Missing required field: bookingId" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Get authenticated user
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

    // Get tasker profile for this user
    const { data: tasker, error: taskerError } = await supabase
      .from("taskers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (taskerError || !tasker) {
      return NextResponse.json(
        { success: false, error: "Tasker profile not found" },
        { status: 403 }
      );
    }

    // Fetch the booking with a row lock (using .single() ensures atomic read)
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, tasker_id, customer_id, status, acceptance_deadline, created_at")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Verify booking belongs to this tasker
    if (booking.tasker_id !== tasker.id) {
      return NextResponse.json(
        { success: false, error: "This booking is not assigned to you" },
        { status: 403 }
      );
    }

    // Verify booking is in pending_acceptance status
    if (booking.status !== "pending_acceptance") {
      if (booking.status === "declined" || booking.status === "cancelled") {
        return NextResponse.json(
          {
            success: false,
            error: "Booking has expired and been reassigned or cancelled",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          error: `Cannot accept booking in '${booking.status}' status`,
        },
        { status: 409 }
      );
    }

    // Calculate response time (seconds since booking creation)
    const responseTimeSeconds = booking.created_at
      ? Math.round(
          (Date.now() - new Date(booking.created_at).getTime()) / 1000
        )
      : null;

    // Update booking status to confirmed
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "confirmed",
        acceptance_deadline: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .eq("status", "pending_acceptance"); // Race condition guard

    if (updateError) {
      console.error("Failed to accept booking:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update booking status" },
        { status: 500 }
      );
    }

    // Update tasker acceptance metrics
    const { error: metricsError } = await supabase.rpc(
      "update_acceptance_metrics",
      {
        p_tasker_id: tasker.id,
        p_action: "accepted",
        p_response_seconds: responseTimeSeconds,
      }
    );

    if (metricsError) {
      // Non-critical — log but don't fail the request
      console.error("Failed to update acceptance metrics:", metricsError);
    }

    // Notify customer
    const { data: customerName } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", booking.customer_id)
      .single();

    await supabase.from("notifications").insert({
      user_id: booking.customer_id,
      title: "Tasker Accepted! ✅",
      message: `Your tasker has accepted the booking and will arrive as scheduled.`,
      type: "status",
      link: `/booking/${bookingId}/tracking`,
      is_read: false,
    });

    return NextResponse.json({
      success: true,
      booking: { id: bookingId, status: "confirmed" },
    });
  } catch (error) {
    console.error("Booking accept error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
