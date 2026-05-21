// Form validation utilities used by contact, forgot-password, reset-password, and post-task pages

export interface ValidationRule {
  field: string;
  validator: () => string | null;
}

/**
 * Runs an array of validation rules and returns a Record of field => error message.
 * Empty string values mean the field passed validation.
 */
export function validateFields(rules: ValidationRule[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const rule of rules) {
    if (errors[rule.field]) continue; // skip if already errored
    const err = rule.validator();
    if (err) errors[rule.field] = err;
  }
  return errors;
}

export function required(value: string, label: string): string | null {
  if (!value || value.trim().length === 0) {
    return `${label} is required.`;
  }
  return null;
}

export function isEmail(email: string): string | null {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return "Please enter a valid email address.";
  }
  return null;
}

export function minLength(value: string, min: number, label: string): string | null {
  if (value.trim().length < min) {
    return `${label} must be at least ${min} characters.`;
  }
  return null;
}

export function isNumeric(value: string, label: string): string | null {
  if (!/^\d+$/.test(value)) {
    return `${label} must be a valid number.`;
  }
  return null;
}

export function passwordStrength(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number.";
  }
  return null;
}

export function passwordsMatch(password: string, confirm: string): string | null {
  if (password !== confirm) {
    return "Passwords do not match.";
  }
  return null;
}
