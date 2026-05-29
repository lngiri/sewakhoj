/**
 * Client-side booking reminder timer.
 *
 * When a booking is accepted/confirmed, this schedules a notification
 * to fire 1 hour before the booking start time via the Service Worker.
 *
 * This replaces the need for a cron job polling every 15 minutes —
 * the notification fires at the exact right moment while the user is online.
 *
 * The cron job remains as a fallback for when the user is offline.
 */

const activeTimers = new Map<string, ReturnType<typeof setTimeout>>();

interface ReminderParams {
  bookingId: string;
  bookingDate: string; // "YYYY-MM-DD" in Nepal time
  bookingTime: string; // "HH:mm:ss" in UTC (as stored in DB)
  title: string;
  body: string;
}

/**
 * Schedule a booking reminder notification.
 * The notification fires 1 hour before (bookingDate + bookingTime) in UTC.
 *
 * If the booking is less than 1 hour away, fires immediately.
 * If the booking is in the past, does nothing.
 */
export function scheduleBookingReminder(params: ReminderParams): void {
  const { bookingId, bookingDate, bookingTime, title, body } = params;

  // Cancel any existing timer for this booking
  cancelBookingReminder(bookingId);

  // Parse booking date + time as UTC (booking_time is stored in UTC)
  const [year, month, day] = bookingDate.split("-").map(Number);
  const timeParts = bookingTime.split(":");
  const hour = Number(timeParts[0]);
  const minute = Number(timeParts[1] ?? 0);
  const second = Number(timeParts[2] ?? 0);

  const bookingUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  const nowUtcMs = Date.now();

  // If booking is in the past, don't schedule
  if (bookingUtcMs <= nowUtcMs) {
    return;
  }

  // Fire notification 1 hour before the booking time
  const reminderTimeMs = bookingUtcMs - 60 * 60 * 1000;
  const delayMs = reminderTimeMs - nowUtcMs;

  if (delayMs <= 0) {
    // Booking is within 1 hour — fire immediately
    fireReminderNotification(bookingId, title, body);
    return;
  }

  const timerId = setTimeout(() => {
    fireReminderNotification(bookingId, title, body);
    activeTimers.delete(bookingId);
  }, delayMs);

  activeTimers.set(bookingId, timerId);
}

/**
 * Cancel a previously scheduled reminder.
 */
export function cancelBookingReminder(bookingId: string): void {
  const existingTimer = activeTimers.get(bookingId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    activeTimers.delete(bookingId);
  }
}

/**
 * Cancel all active reminders (useful on logout).
 */
export function cancelAllReminders(): void {
  for (const [bookingId, timer] of activeTimers.entries()) {
    clearTimeout(timer);
    activeTimers.delete(bookingId);
  }
}

/**
 * Fire the reminder notification via the Service Worker.
 */
function fireReminderNotification(
  bookingId: string,
  title: string,
  body: string
): void {
  // Show via Service Worker (works even if tab is backgrounded)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.active?.postMessage({
        type: "SHOW_NOTIFICATION",
        title,
        body,
        tag: `booking-reminder-${bookingId}`,
        data: {
          url: `/booking/${bookingId}/tracking`,
          booking_id: bookingId,
          type: "booking_reminder",
        },
        requireInteraction: true,
      });
    });
  }

  // Fallback: direct browser notification
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: "/logo.png",
        tag: `booking-reminder-${bookingId}`,
      });
    } catch (_e) {
      // ignore
    }
  }


}
