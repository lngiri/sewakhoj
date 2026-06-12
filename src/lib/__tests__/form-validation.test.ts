import { describe, it, expect } from 'vitest';
import {
  validateFields,
  required,
  isEmail,
  minLength,
  isNumeric,
  passwordStrength,
  passwordsMatch,
} from '../form-validation';

describe('required', () => {
  it('returns error for empty string', () => {
    expect(required('', 'Name')).toBe('Name is required.');
  });
  it('returns error for whitespace-only', () => {
    expect(required('   ', 'Name')).toBe('Name is required.');
  });
  it('returns null for valid input', () => {
    expect(required('John', 'Name')).toBeNull();
  });
});

describe('isEmail', () => {
  it('returns null for valid email', () => {
    expect(isEmail('a@b.com')).toBeNull();
  });
  it('returns error for missing @', () => {
    expect(isEmail('ab.com')).toBe('Please enter a valid email address.');
  });
  it('returns error for empty string', () => {
    expect(isEmail('')).toBe('Please enter a valid email address.');
  });
});

describe('minLength', () => {
  it('returns error for too-short string', () => {
    expect(minLength('ab', 5, 'Password')).toBe('Password must be at least 5 characters.');
  });
  it('returns null for sufficient length', () => {
    expect(minLength('abcdef', 5, 'Password')).toBeNull();
  });
  it('counts trimmed length', () => {
    expect(minLength('  a  ', 3, 'Field')).toBe('Field must be at least 3 characters.');
  });
});

describe('isNumeric', () => {
  it('returns null for numeric string', () => {
    expect(isNumeric('123', 'Price')).toBeNull();
  });
  it('returns error for non-numeric', () => {
    expect(isNumeric('abc', 'Price')).toBe('Price must be a valid number.');
  });
  it('returns error for empty', () => {
    expect(isNumeric('', 'Price')).toBe('Price must be a valid number.');
  });
});

describe('passwordStrength', () => {
  it('returns error for short password', () => {
    expect(passwordStrength('Ab1')).toBe('Password must be at least 8 characters.');
  });
  it('returns error for missing uppercase', () => {
    expect(passwordStrength('abcdef1')).toBe('Password must be at least 8 characters.');
  });
  it('returns error for missing lowercase', () => {
    expect(passwordStrength('ABCDEF1')).toBe('Password must be at least 8 characters.');
  });
  it('returns error for missing number', () => {
    expect(passwordStrength('Abcdefgh')).toBe('Password must contain at least one number.');
  });
  it('returns null for strong password', () => {
    expect(passwordStrength('Abcdef1')).toBe('Password must be at least 8 characters.');
  });
  it('returns null for valid strong password', () => {
    expect(passwordStrength('Password1')).toBeNull();
  });
});

describe('passwordsMatch', () => {
  it('returns null when they match', () => {
    expect(passwordsMatch('abc', 'abc')).toBeNull();
  });
  it('returns error when they differ', () => {
    expect(passwordsMatch('abc', 'xyz')).toBe('Passwords do not match.');
  });
});

describe('validateFields', () => {
  it('collects errors from rules', () => {
    const errors = validateFields([
      { field: 'name', validator: () => required('', 'Name') },
    ]);
    expect(errors.name).toBe('Name is required.');
  });
  it('stops at first error per field', () => {
    const errors = validateFields([
      { field: 'email', validator: () => 'first error' },
      { field: 'email', validator: () => 'second error' },
    ]);
    expect(errors.email).toBe('first error');
  });
  it('returns empty for all-passing rules', () => {
    const errors = validateFields([
      { field: 'name', validator: () => required('John', 'Name') },
    ]);
    expect(Object.keys(errors)).toHaveLength(0);
  });
});
