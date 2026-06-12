import { describe, it, expect } from 'vitest';
import { validatePhone } from '../sms';

describe('validatePhone', () => {
  it('validates 98XXXXXXXX format', () => {
    const result = validatePhone('9812345678');
    expect(result.valid).toBe(true);
    expect(result.clean).toBe('9812345678');
  });
  it('validates 97XXXXXXXX format', () => {
    expect(validatePhone('9712345678').valid).toBe(true);
  });
  it('validates with +977 prefix', () => {
    const result = validatePhone('+9779812345678');
    expect(result.valid).toBe(true);
    expect(result.clean).toBe('9812345678');
  });
  it('validates with 977 prefix without +', () => {
    const result = validatePhone('9779812345678');
    expect(result.valid).toBe(true);
    expect(result.clean).toBe('9812345678');
  });
  it('accepts 96XXXXXXXX (valid NTC prefix)', () => {
    expect(validatePhone('9612345678').valid).toBe(true);
  });
  it('rejects too-short number', () => {
    expect(validatePhone('981234567').valid).toBe(false);
  });
  it('rejects empty string', () => {
    expect(validatePhone('').valid).toBe(false);
  });
  it('strips non-digit characters', () => {
    const result = validatePhone('98-1234-5678');
    expect(result.valid).toBe(true);
    expect(result.clean).toBe('9812345678');
  });
  it('rejects 11-digit number without country code', () => {
    expect(validatePhone('98123456789').valid).toBe(false);
  });
});
