import { type CareType, type Money, money, multiplyMoney } from "@riaya/core";

export type CaregiverRates = {
  hourlyRate?: number | null;
  dailyRate?: number | null;
};

/** A standard care day is 8 hours — used to pro-rate / cap a daily rate. */
const HOURS_PER_DAY = 8;

/**
 * Estimated gross amount (integer centimes) for a booking of `durationMinutes`.
 * Prefers the hourly rate; falls back to the daily rate pro-rated over an 8h day.
 * For a daily-rate caregiver, a single session is capped at the day rate even if
 * it runs longer than 8h (you don't pay >1 day for one continuous session).
 * `careType` is accepted for forward compatibility (no per-type surcharge in
 * v0.1). No per-child surcharge in v0.1. Escrow computation (fees/subsidy) is
 * Sprint 4 — this is only an estimate shown to the family at request time.
 */
export function computeBookingAmount(
  rates: CaregiverRates,
  durationMinutes: number,
  _careType?: CareType
): Money {
  const hours = durationMinutes / 60;
  if (rates.hourlyRate != null) return multiplyMoney(money(rates.hourlyRate), hours);
  if (rates.dailyRate != null) {
    const days = Math.min(1, hours / HOURS_PER_DAY);
    return multiplyMoney(money(rates.dailyRate), days);
  }
  return money(0);
}

export function durationMinutes(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}
