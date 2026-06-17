import { describe, expect, it } from "vitest";
import {
  addMoney,
  caregiverPayout,
  formatMoney,
  money,
  multiplyMoney,
  platformFeeFromCaregiver,
  platformFeeFromFamily,
  subtractMoney,
} from "./money.js";

describe("money()", () => {
  it("accepts zero", () => expect(money(0)).toBe(0));
  it("accepts positive integers", () => expect(money(15000)).toBe(15000));
  it("throws on float", () => expect(() => money(1.5)).toThrow("integer centimes"));
  it("throws on negative", () => expect(() => money(-1)).toThrow("negative"));
});

describe("addMoney", () => {
  it("adds two amounts", () => expect(addMoney(money(1000), money(500))).toBe(1500));
  it("adding zero is identity", () => expect(addMoney(money(200), money(0))).toBe(200));
});

describe("subtractMoney", () => {
  it("subtracts smaller from larger", () =>
    expect(subtractMoney(money(1000), money(300))).toBe(700));
  it("subtracting zero is identity", () => expect(subtractMoney(money(500), money(0))).toBe(500));
  it("throws if result is negative", () =>
    expect(() => subtractMoney(money(100), money(200))).toThrow());
});

describe("multiplyMoney", () => {
  it("rounds to nearest centime", () => expect(multiplyMoney(money(1000), 0.12)).toBe(120));
  it("rounds 0.5 up", () => expect(multiplyMoney(money(1), 0.5)).toBe(1));
  it("multiplies by whole number", () => expect(multiplyMoney(money(1000), 3)).toBe(3000));
});

describe("formatMoney", () => {
  it("formats 150000 centimes as MAD currency string", () => {
    const result = formatMoney(money(150000));
    expect(result).toContain("MAD");
    expect(result).toContain("1");
  });
  it("accepts a custom locale", () => {
    const result = formatMoney(money(100), "en-US");
    expect(result).toContain("MAD");
  });
  it("formats zero correctly", () => {
    const result = formatMoney(money(0));
    expect(result).toContain("MAD");
  });
});

describe("platformFeeFromFamily", () => {
  it("is 12% of gross, rounded", () => {
    expect(platformFeeFromFamily(money(100000))).toBe(12000);
  });
  it("rounds correctly on fractional result", () => {
    expect(platformFeeFromFamily(money(1000))).toBe(120);
  });
  it("zero gross → zero fee", () => {
    expect(platformFeeFromFamily(money(0))).toBe(0);
  });
});

describe("platformFeeFromCaregiver", () => {
  it("is 8% of gross, rounded", () => {
    expect(platformFeeFromCaregiver(money(100000))).toBe(8000);
  });
  it("rounds correctly on fractional result", () => {
    expect(platformFeeFromCaregiver(money(1250))).toBe(100);
  });
  it("zero gross → zero fee", () => {
    expect(platformFeeFromCaregiver(money(0))).toBe(0);
  });
});

describe("caregiverPayout", () => {
  it("is gross minus 8% caregiver fee", () => {
    expect(caregiverPayout(money(100000))).toBe(92000);
  });
  it("payout + fee equals gross", () => {
    const gross = money(73500);
    const fee = platformFeeFromCaregiver(gross);
    expect(caregiverPayout(gross) + fee).toBe(gross);
  });
});
