import { money } from "@riaya/core";
import { describe, expect, it } from "vitest";
// Import via barrel to cover packages/notifications/src/index.ts
import {
  bookingConfirmationEmail,
  payoutReceiptEmail,
  reviewRequestEmail,
  welcomeEmail,
} from "./index.js";

describe("welcomeEmail", () => {
  it("includes the recipient name", () => {
    const { subject, text } = welcomeEmail("Fatima");
    expect(subject).toBeTruthy();
    expect(text).toContain("Fatima");
  });

  it("includes the platform name", () => {
    const { text } = welcomeEmail("Sara");
    expect(text).toContain("Riaya");
  });

  it("includes the team signoff", () => {
    const { text } = welcomeEmail("Laila");
    expect(text).toContain("L'équipe Riaya");
  });
});

describe("bookingConfirmationEmail", () => {
  it("mentions the caregiver name and booking date", () => {
    const date = new Date("2026-07-01T09:00:00Z");
    const { subject, text } = bookingConfirmationEmail("Sara", "Fatima", date, money(11200));
    expect(subject).toBeTruthy();
    expect(text).toContain("Fatima");
    expect(text).toContain("Sara");
  });

  it("includes the amount to pay formatted in MAD", () => {
    const { text } = bookingConfirmationEmail("Sara", "Fatima", new Date(), money(11200));
    expect(text).toContain("MAD");
  });
});

describe("payoutReceiptEmail", () => {
  it("includes the caregiver name and payout amount", () => {
    const { subject, text } = payoutReceiptEmail("Fatima", money(92000));
    expect(subject).toBeTruthy();
    expect(text).toContain("Fatima");
    expect(text).toContain("MAD");
  });

  it("contains a thank-you message", () => {
    const { text } = payoutReceiptEmail("Fatima", money(50000));
    expect(text.toLowerCase()).toMatch(/merci|remerci/);
  });
});

describe("reviewRequestEmail", () => {
  it("includes both parties' names", () => {
    const { subject, text } = reviewRequestEmail("Sara", "Fatima");
    expect(subject).toBeTruthy();
    expect(text).toContain("Sara");
    expect(text).toContain("Fatima");
  });

  it("references the review action", () => {
    const { text } = reviewRequestEmail("Sara", "Fatima");
    expect(text).toMatch(/avis/i);
  });
});
