/**
 * Input Sanitization Utilities
 * Used across the platform to prevent XSS, SQL injection, and malformed data
 */

/** Strip HTML tags from a string */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/** Sanitize a text input: trim, strip HTML, normalize whitespace */
export function sanitizeText(input: string, maxLength: number = 5000): string {
  if (!input) return '';
  return stripHtml(input.trim())
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

/** Validate UUID format */
export function isValidUUID(input: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);
}

/** Validate Nepali phone number (+977 or 0 prefix, 10 digits) */
export function isValidNepaliPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return /^(\+977[-\s]?)?9[78]\d{8}$/.test(cleaned) || /^0[-\s]?9[78]\d{8}$/.test(cleaned);
}

/** Validate email format */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Sanitize a number input, clamping to range */
export function sanitizeNumber(input: string | number, min: number = 0, max: number = 999999999): number {
  const num = typeof input === 'string' ? parseFloat(input) : input;
  if (isNaN(num)) return min;
  return Math.max(min, Math.min(max, num));
}

/** Sanitize an object's string fields recursively */
export function sanitizeObject<T extends Record<string, any>>(obj: T, maxFieldLength: number = 5000): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeText(value, maxFieldLength);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeObject(value, maxFieldLength);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item: any) =>
        typeof item === 'string'
          ? sanitizeText(item, maxFieldLength)
          : typeof item === 'object' && item !== null
            ? sanitizeObject(item, maxFieldLength)
            : item
      );
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

/** Escape SQL-like patterns in user input (defense in depth) */
export function escapeSqlPattern(input: string): string {
  return input.replace(/['"\\;]/g, '');
}

/** Validate a URL is safe (no javascript: protocol) */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}