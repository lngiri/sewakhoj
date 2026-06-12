import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../escapeHtml';

describe('escapeHtml', () => {
  it('escapes &', () => {
    expect(escapeHtml('a&b')).toBe('a&amp;b');
  });
  it('escapes < and >', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });
  it('escapes double quotes', () => {
    expect(escapeHtml('he said "hello"')).toBe('he said &quot;hello&quot;');
  });
  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#039;s');
  });
  it('returns empty string unchanged', () => {
    expect(escapeHtml('')).toBe('');
  });
  it('returns safe string unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});
