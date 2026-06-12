import { describe, it, expect } from 'vitest';
import {
  stripHtml,
  sanitizeText,
  isValidUUID,
  isValidNepaliPhone,
  isValidEmail,
  sanitizeNumber,
  sanitizeObject,
  escapeSqlPattern,
  isValidUrl,
} from '../sanitize';

describe('stripHtml', () => {
  it('removes simple HTML tags', () => {
    expect(stripHtml('<p>Hello</p>')).toBe('Hello');
  });
  it('removes nested tags', () => {
    expect(stripHtml('<div><span>text</span></div>')).toBe('text');
  });
  it('returns empty string for only-tags input', () => {
    expect(stripHtml('<br/>')).toBe('');
  });
  it('returns same string if no tags', () => {
    expect(stripHtml('hello world')).toBe('hello world');
  });
});

describe('sanitizeText', () => {
  it('trims whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });
  it('normalizes internal whitespace', () => {
    expect(sanitizeText('hello   world')).toBe('hello world');
  });
  it('strips HTML tags', () => {
    expect(sanitizeText('<script>alert("xss")</script>')).toBe('alert("xss")');
  });
  it('truncates to maxLength', () => {
    expect(sanitizeText('a'.repeat(100), 10)).toBe('a'.repeat(10));
  });
  it('returns empty string for falsy input', () => {
    expect(sanitizeText('')).toBe('');
    expect(sanitizeText(null as any)).toBe('');
    expect(sanitizeText(undefined as any)).toBe('');
  });
});

describe('isValidUUID', () => {
  it('accepts standard UUID v4', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });
  it('rejects short string', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
  });
  it('rejects empty string', () => {
    expect(isValidUUID('')).toBe(false);
  });
});

describe('isValidNepaliPhone', () => {
  it('accepts 98XXXXXXXX format', () => {
    expect(isValidNepaliPhone('9812345678')).toBe(true);
  });
  it('accepts 97XXXXXXXX format', () => {
    expect(isValidNepaliPhone('9712345678')).toBe(true);
  });
  it('accepts +97798XXXXXXXX', () => {
    expect(isValidNepaliPhone('+9779812345678')).toBe(true);
  });
  it('rejects 96XXXXXXXX (not valid Nepal mobile prefix)', () => {
    expect(isValidNepaliPhone('9612345678')).toBe(false);
  });
  it('rejects too-short number', () => {
    expect(isValidNepaliPhone('981234567')).toBe(false);
  });
  it('rejects empty string', () => {
    expect(isValidNepaliPhone('')).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('accepts standard email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });
  it('rejects missing @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });
  it('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
  it('accepts email with subdomain', () => {
    expect(isValidEmail('user@sub.example.com')).toBe(true);
  });
});

describe('sanitizeNumber', () => {
  it('parses string to number', () => {
    expect(sanitizeNumber('42')).toBe(42);
  });
  it('clamps below min', () => {
    expect(sanitizeNumber('-5', 0)).toBe(0);
  });
  it('clamps above max', () => {
    expect(sanitizeNumber('999999999999', 0, 100)).toBe(100);
  });
  it('returns min for NaN', () => {
    expect(sanitizeNumber('abc', 10)).toBe(10);
  });
  it('passes through number input', () => {
    expect(sanitizeNumber(50)).toBe(50);
  });
});

describe('sanitizeObject', () => {
  it('sanitizes string fields', () => {
    const result = sanitizeObject({ name: '  Hello  ', desc: '<b>text</b>' });
    expect(result.name).toBe('Hello');
    expect(result.desc).toBe('text');
  });
  it('handles nested objects', () => {
    const result = sanitizeObject({ meta: { title: '  Foo  ' } });
    expect(result.meta.title).toBe('Foo');
  });
  it('handles arrays of strings', () => {
    const result = sanitizeObject({ tags: ['  a  ', '<b>b</b>'] });
    expect(result.tags).toEqual(['a', 'b']);
  });
  it('preserves non-string values', () => {
    const result = sanitizeObject({ count: 5, active: true });
    expect(result.count).toBe(5);
    expect(result.active).toBe(true);
  });
});

describe('escapeSqlPattern', () => {
  it('removes single quotes', () => {
    expect(escapeSqlPattern("it's")).toBe('its');
  });
  it('removes double quotes', () => {
    expect(escapeSqlPattern('he said "hello"')).toBe('he said hello');
  });
  it('removes backslash', () => {
    expect(escapeSqlPattern('path\\to')).toBe('pathto');
  });
  it('removes semicolon', () => {
    expect(escapeSqlPattern('drop;')).toBe('drop');
  });
});

describe('isValidUrl', () => {
  it('accepts https URL', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
  });
  it('accepts mailto:', () => {
    expect(isValidUrl('mailto:test@example.com')).toBe(true);
  });
  it('rejects javascript: protocol', () => {
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
  });
  it('rejects garbage string', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
  });
});
