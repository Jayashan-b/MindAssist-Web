import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitize user input by stripping HTML tags and enforcing length limits.
 * Prevents XSS and ensures data integrity for form submissions.
 */
export function sanitizeInput(value: string, maxLength: number = 500): string {
  // Strip HTML tags
  const stripped = value.replace(/<[^>]*>/g, '');
  // Collapse multiple whitespace into single spaces
  const normalized = stripped.replace(/\s+/g, ' ').trim();
  // Enforce length limit
  return normalized.slice(0, maxLength);
}

/**
 * Sanitize an array of string inputs.
 */
export function sanitizeArray(values: string[], maxLength: number = 200): string[] {
  return values
    .map((v) => sanitizeInput(v, maxLength))
    .filter((v) => v.length > 0);
}

/**
 * Validate that a meeting identifier is a valid LiveKit room name
 * or a legacy Jitsi meeting URL.
 */
export function isValidMeetingRoom(roomOrUrl: string | null | undefined): boolean {
  if (!roomOrUrl) return false;
  return roomOrUrl.startsWith('consultation-') || roomOrUrl.startsWith('https://meet.jit.si/');
}
