import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Nepal timezone offset: UTC+5:45 in milliseconds
 */
const NEPALI_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

/**
 * Returns the current date string in Nepal timezone (YYYY-MM-DD).
 * Use this instead of `new Date().toISOString().split('T')[0]`
 * which uses UTC date and can be wrong for Nepal (especially near midnight).
 */
export function getNepaliDateString(date?: Date): string {
  const d = date || new Date();
  const nepaliDate = new Date(d.getTime() + NEPALI_OFFSET_MS);
  return nepaliDate.toISOString().split('T')[0];
}
