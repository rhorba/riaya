import { type Money, money } from "@riaya/core";

/**
 * Per-caregiver cancellation policy. Free cancellation `freeHours` or more before
 * the session start; inside that window, the family owes `feePercent` of gross.
 */
export type CancellationPolicy = {
  freeHours: number;
  feePercent: number;
};

export const DEFAULT_CANCELLATION_POLICY: CancellationPolicy = {
  freeHours: 24,
  feePercent: 50,
};

/** Whole + fractional hours between `now` and a session start (negative if past). */
export function hoursUntil(start: Date, now: Date = new Date()): number {
  return (start.getTime() - now.getTime()) / 3_600_000;
}

/**
 * Cancellation fee (integer centimes) the family owes when cancelling a confirmed
 * booking. Free outside the policy window; a percentage of gross inside it; never
 * more than gross. This computes the amount only — actual money movement (escrow
 * capture/refund) lands in Sprint 4.
 */
export function computeCancellationFee(
  policy: CancellationPolicy,
  grossAmount: Money,
  hoursBeforeStart: number
): Money {
  if (hoursBeforeStart >= policy.freeHours) return money(0);
  const pct = Math.min(100, Math.max(0, policy.feePercent));
  return money(Math.min(grossAmount, Math.round((grossAmount * pct) / 100)));
}
