import { money } from "@riaya/core";
import { describe, expect, it } from "vitest";
// Import via barrel to cover packages/payments/src/index.ts
import { DevGateway, gateway } from "./index.js";

describe("DevGateway", () => {
  const gw = new DevGateway();

  describe("authorize", () => {
    it("returns a gatewayRef derived from the booking ref", async () => {
      const session = await gw.authorize(money(10000), "booking-123", "/return");
      expect(session.gatewayRef).toBe("dev_auth_booking-123");
    });

    it("echoes the returnUrl as redirectUrl", async () => {
      const session = await gw.authorize(money(10000), "ref", "/family/bookings");
      expect(session.redirectUrl).toBe("/family/bookings");
    });
  });

  describe("capture", () => {
    it("returns the same gatewayRef and the captured amount", async () => {
      const result = await gw.capture("dev_auth_ref", money(10000));
      expect(result.gatewayRef).toBe("dev_auth_ref");
      expect(result.capturedAmount).toBe(10000);
    });

    it("captures zero correctly (edge case)", async () => {
      const result = await gw.capture("ref", money(0));
      expect(result.capturedAmount).toBe(0);
    });
  });

  describe("refund", () => {
    it("returns the same gatewayRef and the refunded amount", async () => {
      const result = await gw.refund("ref", money(5000), "booking_cancelled");
      expect(result.gatewayRef).toBe("ref");
      expect(result.refundedAmount).toBe(5000);
    });
  });

  describe("payout", () => {
    it("returns a payoutRef derived from the escrow ref", async () => {
      const result = await gw.payout(
        money(92000),
        { accountRef: "RIB123", holderName: "Fatima" },
        "escrow-456"
      );
      expect(result.payoutRef).toBe("dev_payout_escrow-456");
      expect(result.amount).toBe(92000);
    });
  });
});

describe("gateway singleton", () => {
  it("is a DevGateway instance", () => {
    expect(gateway).toBeInstanceOf(DevGateway);
  });
});
