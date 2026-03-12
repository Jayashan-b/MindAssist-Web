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
 * Validate that a URL is a safe Jitsi meeting URL.
 */
export function isValidMeetingUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith('https://meet.jit.si/');
}
