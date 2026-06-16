import { money } from "@riaya/core";
import { describe, expect, it } from "vitest";
import { capSubsidy, computeEscrowAmounts } from "./amounts.js";

describe("computeEscrowAmounts", () => {
  it("splits fees the marketplace way: family +12% on top, caregiver −8%", () => {
    const a = computeEscrowAmounts(money(100000)); // 1000.00 MAD gross
    expect(a.grossAmount).toBe(100000);
    expect(a.platformFeeFromFamily).toBe(12000); // 12%
    expect(a.platformFeeFromCaregiver).toBe(8000); // 8%
    expect(a.familyGross).toBe(112000); // gross + family fee
    expect(a.caregiverPayout).toBe(92000); // gross − caregiver fee
    expect(a.employerSubsidy).toBe(0);
    expect(a.familyPays).toBe(112000); // no subsidy → owes familyGross
  });

  it("books balance: familyPays + subsidy == caregiverPayout + total platform fees", () => {
    const a = computeEscrowAmounts(money(73500), money(20000));
    const moneyIn = a.familyPays + a.employerSubsidy;
    const moneyOut = a.caregiverPayout + a.platformFeeFromFamily + a.platformFeeFromCaregiver;
    expect(moneyIn).toBe(moneyOut);
  });

  it("deducts the employer subsidy from what the family pays", () => {
    const a = computeEscrowAmounts(money(100000), money(50000));
    expect(a.familyPays).toBe(62000); // 112000 − 50000
    expect(a.caregiverPayout).toBe(92000); // unaffected by subsidy
  });

  it("rounds fees to integer centimes (never a float)", () => {
    const a = computeEscrowAmounts(money(33333));
    expect(Number.isInteger(a.platformFeeFromFamily)).toBe(true);
    expect(Number.isInteger(a.platformFeeFromCaregiver)).toBe(true);
    expect(a.platformFeeFromFamily).toBe(4000); // round(3999.96)
    expect(a.platformFeeFromCaregiver).toBe(2667); // round(2666.64)
  });

  it("allows a subsidy that exactly covers the family total (familyPays = 0)", () => {
    const a = computeEscrowAmounts(money(100000), money(112000));
    expect(a.familyPays).toBe(0);
  });

  it("rejects a subsidy that exceeds the family total", () => {
    expect(() => computeEscrowAmounts(money(100000), money(112001))).toThrow(/exceeds/);
  });
});

describe("capSubsidy", () => {
  it("caps at the smaller of desired, budget, and familyGross", () => {
    expect(capSubsidy(money(50000), money(30000), money(112000))).toBe(30000); // budget binds
    expect(capSubsidy(money(50000), money(80000), money(40000))).toBe(40000); // familyGross binds
    expect(capSubsidy(money(20000), money(80000), money(112000))).toBe(20000); // desired binds
  });

  it("never returns a negative subsidy", () => {
    expect(capSubsidy(money(0), money(0), money(112000))).toBe(0);
  });
});
