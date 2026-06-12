import { describe, it, expect } from 'vitest';
import { services } from '../services';

describe('services data', () => {
  it('has exactly 12 services', () => {
    expect(services).toHaveLength(12);
  });

  it('every service has required fields', () => {
    for (const s of services) {
      expect(s.id).toBeTruthy();
      expect(s.nameEn).toBeTruthy();
      expect(s.nameNp).toBeTruthy();
      expect(s.emoji).toBeTruthy();
      expect(s.descriptionEn).toBeTruthy();
      expect(s.descriptionNp).toBeTruthy();
    }
  });

  it('every service has a unique id', () => {
    const ids = services.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('plumbing is first', () => {
    expect(services[0].id).toBe('plumbing');
    expect(services[0].nameEn).toBe('Plumbing');
  });
});
