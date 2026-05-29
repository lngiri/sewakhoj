"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { scheduleBookingReminder, cancelBookingReminder } from "@/lib/booking-reminder-timer";

interface BookingChange {
  id: string;
  status: string;
  customer_id: string;
  tasker_id: string;
  booking_date: string;
  booking_time: string;
  service?: string;
  hours?: number;
  total_amount?: number;
  old_status?: string;
}

/** Shared helper: create sine oscillator with quick-attack gain envelope */
function playTone(frequency: number, durationMs: number, gainPeak = 0.2) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(frequency, ctx.currentTime);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(gainPeak, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000 - 0.05);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(() => {
      o.stop();
      ctx.close();
    }, durationMs);
  } catch (_e) {
    // ignore
  }
}

/** Play attention beep — always plays for important booking events */
function playAttentionBeep(fn: () => void) {
  fn();
}

// --- Distinct beep patterns for different event types ---

/** Booking request sent (informational) — short, light, high-pitched */
function beepSent() {
  playTone(1047, 200, 0.12); // C6, very short, quieter
}

/** Booking accepted (positive urgency) — rising two-tone */
function beepAccepted() {
  playTone(659, 180, 0.18); // E5
  setTimeout(() => playTone(880, 350, 0.22), 150); // A5 with overlap
}

/** Booking declined/cancelled (negative) — low descending tone */
function beepDeclined() {
  playTone(392, 200, 0.2); // G4
  setTimeout(() => playTone(262, 400, 0.18), 160); // C4, longer sustain
}

/** New request for tasker (urgent action) — fast double-beep */
function beepUrgent() {
  playTone(880, 160, 0.22);
  setTimeout(() => playTone(1175, 280, 0.25), 130); // D6, punchier
}

/** Show a native browser notification via Service Worker + fallback */
function showNativeNotification(
  title: string,
  options?: {
    body?: string;
    tag?: string;
    data?: Record<string, any>;
    requireInteraction?: boolean;
  }
) {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.active?.postMessage({
        type: "SHOW_NOTIFICATION",
        title,
        body: options?.body || "",
        tag: options?.tag || "default",
        data: options?.data || {},
        requireInteraction: options?.requireInteraction || false,
      });
    });
  }

  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        body: options?.body,
        icon: "/logo.png",
        tag: options?.tag,
      });
    } catch (_e) {
      // ignore
    }
  }
}

/**
 * React hook that subscribes to real-time booking changes for the current user.
 *
 * - Detects status transitions (pending_acceptance → accepted, declined, etc.)
 * - Shows instant in-app toast notifications
 * - Starts a client-side timer for 1-hour booking reminders
 * - Sends browser push notifications via the service worker
 */
export function useBookingRealtime() {
  const { user } = useAuth();
  const { showSuccess, showError, showInfo } = useNotification();
  const router = useRouter();
  const customerChannelRef = useRef<any>(null);
  const taskerChannelRef = useRef<any>(null);
  const customerChannelIdRef = useRef(0);
  const taskerChannelIdRef = useRef(0);
  const routerRef = useRef(router);
  routerRef.current = router;

  // --- Handlers ---

  function handleBookingInsert(booking: BookingChange) {
    if (booking.status === "pending_acceptance") {
      showSuccess(
        `Booking request sent! Waiting for the tasker to accept.`,
        6000
      );
      playAttentionBeep(beepSent);
      showNativeNotification("Booking Request Sent ✅", {
        body: "Waiting for the tasker to accept your booking.",
        tag: booking.id,
      });
    }
  }

  function handleBookingUpdate(booking: BookingChange) {
    const { status, id, booking_date, booking_time, old_status } = booking;

    if (status === "accepted" && old_status === "pending_acceptance") {
      showSuccess("Tasker accepted your booking! 🎉", 8000, {
        label: "Track",
        onClick: () => routerRef.current.push(`/booking/${id}/tracking`),
      });

      playAttentionBeep(beepAccepted);

      showNativeNotification("Booking Accepted! ✅", {
        body: "Your tasker has accepted the booking. Track them in real-time.",
        tag: id,
        data: { url: `/booking/${id}/tracking` },
      });

      if (booking_date && booking_time) {
        scheduleBookingReminder({
          bookingId: id,
          bookingDate: booking_date,
          bookingTime: booking_time,
          title: "Booking Starting Soon! 🕐",
          body: "Your tasker will arrive in about 1 hour. Get ready!",
        });
      }
    } else if (status === "declined" && old_status === "pending_acceptance") {
      showError(
        "The tasker declined your booking. Finding another specialist...",
        8000
      );

      playAttentionBeep(beepDeclined);

      showNativeNotification("Booking Declined", {
        body: "The tasker has declined. We're looking for another specialist.",
        tag: id,
      });
    } else if (status === "confirmed") {
      showInfo("Booking confirmed! ✅", 5000);

      if (booking_date && booking_time) {
        scheduleBookingReminder({
          bookingId: id,
          bookingDate: booking_date,
          bookingTime: booking_time,
          title: "Booking Starting Soon! 🕐",
          body: "Your specialist will arrive in about 1 hour. Get ready!",
        });
      }
    } else if (
      status === "in-progress" &&
      (old_status === "accepted" ||
        old_status === "on-the-way" ||
        old_status === "confirmed")
    ) {
      showInfo("Tasker has started the service! 🔧", 5000);
    } else if (status === "completed") {
      showSuccess("Service completed! Rate your experience.", 8000, {
        label: "Review",
        onClick: () => routerRef.current.push(`/booking/${id}/tracking`),
      });
    }
  }

  function handleTaskerBookingInsert(booking: BookingChange) {
    if (booking.status === "pending_acceptance") {
      showInfo("New booking request received! 📋", 10000, {
        label: "View",
        onClick: () =>
          routerRef.current.push(`/booking/${booking.id}/tracking`),
      });

      playAttentionBeep(beepUrgent);

      showNativeNotification("New Booking Request 📋", {
        body: `New booking request. You have 30 minutes to respond.`,
        tag: booking.id,
        data: { url: `/booking/${booking.id}/tracking` },
        requireInteraction: true,
      });
    }
  }

  function handleTaskerBookingUpdate(booking: BookingChange) {
    const { status, id, old_status } = booking;

    if (status === "cancelled") {
      showError("Booking was cancelled by the customer.", 6000);
      playAttentionBeep(beepDeclined);
      cancelBookingReminder(id);
    } else if (
      status === "on-the-way" &&
      (old_status === "accepted" || old_status === "confirmed")
    ) {
      showInfo("Customer is expecting you! Dispatch now. 🚀", 5000);
    } else if (status === "in-progress" && old_status === "on-the-way") {
      showInfo("Service in progress. Make it great! 💪", 5000);
    }
  }

  // --- Subscribe to customer bookings ---

  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;
    customerChannelIdRef.current += 1;
    const currentId = customerChannelIdRef.current;

    // Clean up previous subscriber channel
    if (customerChannelRef.current) {
      supabase.removeChannel(customerChannelRef.current);
      customerChannelRef.current = null;
    }

    const uid = Math.random().toString(36).substring(2, 10);
    const channel = supabase.channel(`booking-customer-${user.id}-${uid}`);

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bookings",
          filter: `customer_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (isMounted && currentId === customerChannelIdRef.current) {
            handleBookingInsert(payload.new as BookingChange);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `customer_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (isMounted && currentId === customerChannelIdRef.current) {
            const booking = payload.new as BookingChange;
            booking.old_status = (payload.old as any)?.status;
            handleBookingUpdate(booking);
          }
        }
      )
      .subscribe();

    customerChannelRef.current = channel;

    return () => {
      isMounted = false;
      if (customerChannelRef.current) {
        supabase.removeChannel(customerChannelRef.current);
        customerChannelRef.current = null;
      }
    };
  }, [user?.id]);

  // --- Subscribe to tasker bookings ---

  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;
    let cleanedUp = false;
    taskerChannelIdRef.current += 1;
    const currentId = taskerChannelIdRef.current;

    // Clean up previous tasker channel
    if (taskerChannelRef.current) {
      supabase.removeChannel(taskerChannelRef.current);
      taskerChannelRef.current = null;
    }

    const setup = async () => {
      const { data: taskerData } = await supabase
        .from("taskers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!taskerData?.id || !isMounted || cleanedUp) return;

      const taskerId = taskerData.id;
      const uid = Math.random().toString(36).substring(2, 10);
      const channel = supabase.channel(
        `booking-tasker-${user.id}-${taskerId}-${uid}`
      );

      channel
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "bookings",
            filter: `tasker_id=eq.${taskerId}`,
          },
          (payload: any) => {
            if (isMounted && currentId === taskerChannelIdRef.current) {
              handleTaskerBookingInsert(payload.new as BookingChange);
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "bookings",
            filter: `tasker_id=eq.${taskerId}`,
          },
          (payload: any) => {
            if (isMounted && currentId === taskerChannelIdRef.current) {
              const booking = payload.new as BookingChange;
              booking.old_status = (payload.old as any)?.status;
              handleTaskerBookingUpdate(booking);
            }
          }
        )
        .subscribe();

      if (isMounted && !cleanedUp) {
        taskerChannelRef.current = channel;
      } else {
        supabase.removeChannel(channel);
      }
    };

    setup();

    return () => {
      isMounted = false;
      cleanedUp = true;
      if (taskerChannelRef.current) {
        supabase.removeChannel(taskerChannelRef.current);
        taskerChannelRef.current = null;
      }
    };
  }, [user?.id]);

  return null;
}

/**
 * Client component that activates the booking realtime listener.
 * Renders nothing — purely a side-effect component.
 */
export default function BookingRealtimeListener() {
  useBookingRealtime();
  return null;
}
