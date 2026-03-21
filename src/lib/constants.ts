// ── Platform commission configuration ─────────────────────────────────────────

/** Fraction of the consultation fee retained by the platform (30%). */
export const PLATFORM_COMMISSION_RATE = 0.30;

/** Returns the platform's share in cents, rounded down. */
export function calculatePlatformCommission(feeInCents: number): number {
  return Math.floor(feeInCents * PLATFORM_COMMISSION_RATE);
}

/** Returns the specialist's payout in cents after commission. */
export function calculateSpecialistPayout(feeInCents: number): number {
  return feeInCents - calculatePlatformCommission(feeInCents);
}

/**
 * Get the specialist's net payout for a single appointment in **cents**.
 *
 * Uses the stored `specialistPayoutInCents` when available (new bookings),
 * otherwise falls back to computing 70 % from the consultation fee or the
 * specialist's current price.
 */
export function getSpecialistNetInCents(
  apt: { specialistPayoutInCents?: number; consultationFeeInCents?: number | null },
  fallbackFeeInCents: number,
): number {
  if (apt.specialistPayoutInCents != null) return apt.specialistPayoutInCents;
  const gross = apt.consultationFeeInCents ?? fallbackFeeInCents;
  return calculateSpecialistPayout(gross);
}
