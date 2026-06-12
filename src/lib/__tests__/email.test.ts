import { describe, it, expect, vi } from 'vitest';

vi.mock('resend', () => ({ Resend: vi.fn() }));

import { getWelcomeEmail, getBookingConfirmationEmail, getOTPEmail } from '../email';

describe('getWelcomeEmail', () => {
  it('includes the user name', () => {
    const html = getWelcomeEmail('Ram', 'customer');
    expect(html).toContain('Ram');
  });
  it('includes customer role text for customer', () => {
    const html = getWelcomeEmail('Ram', 'customer');
    expect(html).toContain('ग्राहक');
  });
  it('includes tasker role text for tasker', () => {
    const html = getWelcomeEmail('Shyam', 'tasker');
    expect(html).toContain('साथी');
  });
  it('has DOCTYPE declaration', () => {
    const html = getWelcomeEmail('Test', 'customer');
    expect(html).toContain('<!DOCTYPE html>');
  });
});

describe('getBookingConfirmationEmail', () => {
  it('includes customer name, tasker name, service, date, time, address', () => {
    const html = getBookingConfirmationEmail('Ram', 'Shyam', 'Plumbing', '2024-01-15', '10:00 AM', 'Kathmandu');
    expect(html).toContain('Ram');
    expect(html).toContain('Shyam');
    expect(html).toContain('Plumbing');
    expect(html).toContain('2024-01-15');
    expect(html).toContain('10:00 AM');
    expect(html).toContain('Kathmandu');
  });
  it('has DOCTYPE declaration', () => {
    const html = getBookingConfirmationEmail('A', 'B', 'C', 'D', 'E', 'F');
    expect(html).toContain('<!DOCTYPE html>');
  });
});

describe('getOTPEmail', () => {
  it('includes the OTP code', () => {
    const html = getOTPEmail('482916');
    expect(html).toContain('482916');
  });
  it('has DOCTYPE declaration', () => {
    const html = getOTPEmail('000000');
    expect(html).toContain('<!DOCTYPE html>');
  });
});
