/**
 * Deterministic short reference IDs for sessions and patients.
 * Same algorithm is mirrored in Flutter (reference_ids.dart) so
 * both platforms produce identical codes.
 */

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h * 31) + s.charCodeAt(i)) & 0x7fffffff;
  }
  return h;
}

/** Short session reference from an appointment ID (e.g. "S-K4F82A") */
export function sessionRefId(appointmentId: string): string {
  const num = appointmentId.replace(/\D/g, '');
  const hash = simpleHash(num);
  return `S-${hash.toString(36).toUpperCase().padStart(6, '0').slice(0, 6)}`;
}

/** Short patient reference from userId or profileKey (e.g. "P-A3B7C1") */
export function patientRefId(key: string): string {
  const hash = simpleHash(key);
  return `P-${hash.toString(36).toUpperCase().padStart(6, '0').slice(0, 6)}`;
}
