import { describe, expect, it } from "vitest";
import { computeBookingAmount, durationMinutes } from "./pricing.js";

describe("booking pricing", () => {
  it("computes duration in minutes", () => {
    const start = new Date("2026-07-01T09:00:00Z");
    const end = new Date("2026-07-01T13:30:00Z");
    expect(durationMinutes(start, end)).toBe(270);
  });

  it("never returns a negative duration", () => {
    const start = new Date("2026-07-01T13:00:00Z");
    const end = new Date("2026-07-01T09:00:00Z");
    expect(durationMinutes(start, end)).toBe(0);
  });

  it("prices from the hourly rate (integer centimes)", () => {
    // 40 MAD/hr = 4000 centimes; 4h = 16000 centimes
    expect(computeBookingAmount({ hourlyRate: 4000 }, 240)).toBe(16000);
  });

  it("falls back to the daily rate pro-rated over an 8h day", () => {
    // 320 MAD/day = 32000 centimes; 4h = half a day = 16000 centimes
    expect(computeBookingAmount({ dailyRate: 32000 }, 240)).toBe(16000);
  });

  it("returns zero when no rate is set", () => {
    expect(computeBookingAmount({}, 240)).toBe(0);
  });

  it("rounds to whole centimes (never a fractional Money)", () => {
    // 4000 c/hr * (90/60) = 6000; 4000 * (50/60) = 3333.33 → 3333
    expect(computeBookingAmount({ hourlyRate: 4000 }, 50)).toBe(3333);
  });

  it("caps a daily-rate session at one day even beyond 8h", () => {
    // 32000 c/day; 12h would pro-rate to 1.5 days but is capped at 1 day.
    expect(computeBookingAmount({ dailyRate: 32000 }, 12 * 60)).toBe(32000);
  });

  it("prefers the hourly rate over the daily rate when both are set", () => {
    expect(computeBookingAmount({ hourlyRate: 4000, dailyRate: 32000 }, 240)).toBe(16000);
  });

  it("accepts an optional care type without changing the amount (no surcharge in v0.1)", () => {
    expect(computeBookingAmount({ hourlyRate: 4000 }, 240, "daya")).toBe(16000);
  });
});
