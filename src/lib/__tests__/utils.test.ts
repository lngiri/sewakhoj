import { describe, it, expect } from 'vitest';
import { getNepaliDateString } from '../utils';

describe('getNepaliDateString', () => {
  it('returns YYYY-MM-DD format', () => {
    const result = getNepaliDateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns the correct date for a known Nepal-time date', () => {
    // 2024-01-15 00:00 UTC = 2024-01-15 05:45 Nepal time (same date)
    const date = new Date('2024-01-15T00:00:00Z');
    expect(getNepaliDateString(date)).toBe('2024-01-15');
  });

  it('returns next Nepal date when UTC is late evening before midnight', () => {
    // 2024-01-15 22:00 UTC = 2024-01-16 03:45 Nepal time (next day)
    const date = new Date('2024-01-15T22:00:00Z');
    expect(getNepaliDateString(date)).toBe('2024-01-16');
  });
});
