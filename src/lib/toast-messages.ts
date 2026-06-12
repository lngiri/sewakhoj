// Toast message utilities for build compatibility
// Used by admin dashboards, booking flow, KYC, PWA install banner

// Simple map of common toast keys to human-readable messages
const toastMessages: Record<string, string> = {
  PAYMENT_WINDOW_EXPIRED: "Payment window has expired. Please try again.",
  PROMO_INVALID: "Invalid promo code.",
  PROMO_EXPIRED: "This promo code has expired.",
  PROMO_MAX_USAGE: "This promo code has reached its maximum usage limit.",
  LOGIN_REQUIRED: "Please log in to continue.",
  INVALID_PHONE: "Please enter a valid phone number.",
  PRICE_VALIDATION_FAILED: "Price validation failed. Please try again.",
  PAYMENT_FAILED: "Payment failed. Please try again.",
  SLOT_TAKEN: "This time slot is no longer available. Please choose another.",
  BOOKING_SUBMIT_FAILED: "Failed to submit booking. Please try again.",
  BOOKING_REQUESTED: "Your booking request has been sent and is awaiting tasker confirmation.",
  BOOKING_CONFIRMED: "Your booking has been confirmed!",
};

/**
 * Returns a human-readable toast message for the given key.
 * Falls back to the key itself if no translation is found.
 */
export function toast(key: string): string {
  return toastMessages[key] ?? key;
}

export function showSuccess(_message: string) {
  // Toast UI display — handled by NotificationContext
}

export function showError(_message: string) {
  // Toast UI display — handled by NotificationContext
}
