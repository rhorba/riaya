import { type Money, money, multiplyMoney } from "@riaya/core";

export type CaregiverRates = {
  hourlyRate?: number | null;
  dailyRate?: number | null;
};

/**
 * Estimated gross amount (integer centimes) for a booking of `durationMinutes`.
 * Prefers the hourly rate; falls back to the daily rate pro-rated over an 8h day.
 * No per-child surcharge in v0.1. Escrow computation (fees/subsidy) is Sprint 4 —
 * this is only an estimate shown to the family at request time.
 */
export function computeBookingAmount(rates: CaregiverRates, durationMinutes: number): Money {
  const hours = durationMinutes / 60;
  if (rates.hourlyRate != null) return multiplyMoney(money(rates.hourlyRate), hours);
  if (rates.dailyRate != null) return multiplyMoney(money(rates.dailyRate), hours / 8);
  return money(0);
}

export function durationMinutes(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}
