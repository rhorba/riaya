import type { Money } from "@riaya/core";

/**
 * Payment gateway abstraction (Module E). v0.1 ships only `DevGateway` (a mock).
 * The production CMI/HPS adapter implements the same interface in v0.2.
 *
 * Every call takes an idempotency `ref` (the escrow id) so a retried request is
 * never double-charged. The real gateway keys its operations on this ref.
 */
export type GatewaySession = {
  /** Opaque gateway reference stored on the escrow (`gateway_ref`). */
  gatewayRef: string;
  /** Where the family is sent to authorize (real gateway); echoed in dev. */
  redirectUrl: string;
};

export type CaptureResult = { gatewayRef: string; capturedAmount: Money };
export type RefundResult = { gatewayRef: string; refundedAmount: Money };
export type PayoutRef = { payoutRef: string; amount: Money };

export type BankDetails = {
  /** RIB / IBAN — never logged. */
  accountRef: string;
  holderName: string;
};

export interface PaymentGateway {
  /** Pre-authorize a charge on the family's payment method. */
  authorize(amount: Money, ref: string, returnUrl: string): Promise<GatewaySession>;
  /** Capture a previously authorized amount (full or partial). */
  capture(gatewayRef: string, amount: Money): Promise<CaptureResult>;
  /** Refund a captured/authorized amount. */
  refund(gatewayRef: string, amount: Money, reason: string): Promise<RefundResult>;
  /** Pay out to a caregiver's bank account. */
  payout(amount: Money, bankDetails: BankDetails, ref: string): Promise<PayoutRef>;
}

/**
 * Development gateway: every operation succeeds instantly with no real money
 * movement. Deterministic refs derived from the escrow `ref` so the flow is
 * idempotent and testable. NEVER use in production.
 */
export class DevGateway implements PaymentGateway {
  authorize(_amount: Money, ref: string, returnUrl: string): Promise<GatewaySession> {
    return Promise.resolve({ gatewayRef: `dev_auth_${ref}`, redirectUrl: returnUrl });
  }

  capture(gatewayRef: string, amount: Money): Promise<CaptureResult> {
    return Promise.resolve({ gatewayRef, capturedAmount: amount });
  }

  refund(gatewayRef: string, amount: Money, _reason: string): Promise<RefundResult> {
    return Promise.resolve({ gatewayRef, refundedAmount: amount });
  }

  payout(amount: Money, _bankDetails: BankDetails, ref: string): Promise<PayoutRef> {
    return Promise.resolve({ payoutRef: `dev_payout_${ref}`, amount });
  }
}

/** The gateway used by the app. v0.1: always Dev. v0.2: swap by env. */
export const gateway: PaymentGateway = new DevGateway();
