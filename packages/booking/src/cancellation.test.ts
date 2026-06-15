import { money } from "@riaya/core";
import { describe, expect, it } from "vitest";
import { DEFAULT_CANCELLATION_POLICY, computeCancellationFee, hoursUntil } from "./cancellation.js";

const policy = { freeHours: 24, feePercent: 50 };
const GROSS = money(20000); // 200 MAD

describe("computeCancellationFee", () => {
  it("is free when cancelling outside the free window", () => {
    expect(computeCancellationFee(policy, GROSS, 48)).toBe(0);
    expect(computeCancellationFee(policy, GROSS, 24)).toBe(0); // exactly at the boundary
  });

  it("charges the fee percentage inside the window", () => {
    expect(computeCancellationFee(policy, GROSS, 12)).toBe(10000); // 50% of 200 MAD
  });

  it("charges the fee even for an already-started (negative hours) booking", () => {
    expect(computeCancellationFee(policy, GROSS, -3)).toBe(10000);
  });

  it("never exceeds gross and never goes negative", () => {
    expect(computeCancellationFee({ freeHours: 24, feePercent: 150 }, GROSS, 1)).toBe(20000);
    expect(computeCancellationFee({ freeHours: 24, feePercent: -10 }, GROSS, 1)).toBe(0);
  });

  it("rounds to whole centimes", () => {
    // 33% of 12345 = 4073.85 → 4074
    expect(computeCancellationFee({ freeHours: 24, feePercent: 33 }, money(12345), 1)).toBe(4074);
  });

  it("has a sensible default policy", () => {
    expect(DEFAULT_CANCELLATION_POLICY).toEqual({ freeHours: 24, feePercent: 50 });
  });
});

describe("hoursUntil", () => {
  it("computes positive hours for a future start", () => {
    const now = new Date("2027-03-10T09:00:00Z");
    const start = new Date("2027-03-10T15:00:00Z");
    expect(hoursUntil(start, now)).toBe(6);
  });

  it("is negative for a past start", () => {
    const now = new Date("2027-03-10T15:00:00Z");
    const start = new Date("2027-03-10T09:00:00Z");
    expect(hoursUntil(start, now)).toBe(-6);
  });
});
