import { describe, it, expect } from 'vitest';
import { toast } from '../toast-messages';

describe('toast', () => {
  it('returns message for known key', () => {
    expect(toast('PAYMENT_FAILED')).toBe('Payment failed. Please try again.');
  });
  it('returns message for BOOKING_CONFIRMED', () => {
    expect(toast('BOOKING_CONFIRMED')).toBe('Your booking has been confirmed!');
  });
  it('returns message for LOGIN_REQUIRED', () => {
    expect(toast('LOGIN_REQUIRED')).toBe('Please log in to continue.');
  });
  it('returns the key itself for unknown key (fallback)', () => {
    expect(toast('UNKNOWN_KEY')).toBe('UNKNOWN_KEY');
  });
  it('returns empty string if passed empty string', () => {
    expect(toast('')).toBe('');
  });
});
