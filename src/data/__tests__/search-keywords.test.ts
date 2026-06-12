import { describe, it, expect } from 'vitest';
import { getSearchSuggestions } from '../search-keywords';

describe('getSearchSuggestions', () => {
  it('returns empty array for query < 2 chars', () => {
    expect(getSearchSuggestions('')).toEqual([]);
    expect(getSearchSuggestions('a')).toEqual([]);
  });

  it('returns suggestions for "plumb"', () => {
    const results = getSearchSuggestions('plumb');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.serviceId === 'plumbing')).toBe(true);
  });

  it('returns suggestions for "clean"', () => {
    const results = getSearchSuggestions('clean');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.serviceId === 'cleaning')).toBe(true);
  });

  it('returns suggestions for Nepali keyword "saman"', () => {
    const results = getSearchSuggestions('saman');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.serviceId === 'moving')).toBe(true);
  });

  it('returns multiple suggestions for generic term', () => {
    const results = getSearchSuggestions('re');
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('each result has required fields', () => {
    const results = getSearchSuggestions('paint');
    for (const r of results) {
      expect(r.serviceId).toBeTruthy();
      expect(r.category).toBeTruthy();
      expect(r.emoji).toBeTruthy();
      expect(r.matchedKeyword).toBeTruthy();
    }
  });
});
