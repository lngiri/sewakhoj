/**
 * POST /api/bookings/decline
 *
 * Tasker declines a pending_acceptance booking.
 * Validates: booking belongs to authenticated tasker, status is 'pending_acceptance'.
 * Updates status to 'declined', adds tasker to declined_by[].
 * Triggers immediate reassignment via auto_reassign_expired_acceptances().
 */

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingId, reason } = body;

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

    // Fetch the booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, tasker_id, customer_id, status, created_at")
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
      return NextResponse.json(
        {
          success: false,
          error: `Cannot decline booking in '${booking.status}' status`,
        },
        { status: 409 }
      );
    }

    // Calculate response time
    const responseTimeSeconds = booking.created_at
      ? Math.round(
          (Date.now() - new Date(booking.created_at).getTime()) / 1000
        )
      : null;

    // Update booking: decline + add to declined_by
    // Use RPC to handle array operations that aren't supported by the JS client
    const { error: updateError } = await supabase.rpc("decline_booking", {
      p_booking_id: bookingId,
      p_tasker_id: tasker.id,
    });

    if (updateError) {
      console.error("Failed to decline booking:", updateError);
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
        p_action: "declined",
        p_response_seconds: responseTimeSeconds,
      }
    );

    if (metricsError) {
      console.error("Failed to update acceptance metrics:", metricsError);
    }

    // Log the decline reason if provided
    if (reason) {
      await supabase.from("booking_logs").insert({
        booking_id: bookingId,
        actor_id: user.id,
        action: "declined",
        details: { reason },
        created_at: new Date().toISOString(),
      });
    }

    // Notify customer that their booking was declined
    await supabase.from("notifications").insert({
      user_id: booking.customer_id,
      title: "Tasker Declined Your Booking",
      message: reason
        ? `The tasker has declined your booking. Reason: ${reason}. We're looking for another specialist.`
        : "The tasker has declined your booking. We're looking for another specialist.",
      type: "alert",
      link: "/dashboard",
    });

    // Trigger immediate reassignment
    const { data: reassignResult, error: reassignError } = await supabase.rpc(
      "auto_reassign_expired_acceptances"
    );

    if (reassignError) {
      console.error("Reassignment failed:", reassignError);
      // Non-critical — the cron job will pick it up
    }

    return NextResponse.json({
      success: true,
      reassigned: reassignResult?.length > 0 || false,
    });
  } catch (error) {
    console.error("Booking decline error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
