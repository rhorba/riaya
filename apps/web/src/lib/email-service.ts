import "server-only";

import type { Money } from "@riaya/core";
import {
  type EmailTemplate,
  bookingConfirmationEmail,
  emailProvider,
  payoutReceiptEmail,
  reviewRequestEmail,
  welcomeEmail,
} from "@riaya/notifications";

/**
 * Transactional email (Module H, Sprint 5). Thin wrapper over the
 * `@riaya/notifications` provider + pure templates.
 *
 * Sends are BEST-EFFORT and never throw: a mail failure must not roll back a
 * booking or payment. v0.1 uses the DevEmailProvider (logs), so this is a no-op
 * in practice until `RESEND_API_KEY` is configured.
 */
async function safeSend(to: string, tpl: EmailTemplate): Promise<void> {
  if (!to) return;
  try {
    await emailProvider.send({ to, subject: tpl.subject, text: tpl.text });
  } catch (err) {
    console.error("[email] send failed:", err);
  }
}

export function sendWelcomeEmail(to: string, name: string): Promise<void> {
  return safeSend(to, welcomeEmail(name));
}

export function sendBookingConfirmationEmail(
  to: string,
  familyName: string,
  caregiverName: string,
  startTime: Date,
  familyPays: Money
): Promise<void> {
  return safeSend(to, bookingConfirmationEmail(familyName, caregiverName, startTime, familyPays));
}

export function sendPayoutReceiptEmail(
  to: string,
  caregiverName: string,
  amount: Money
): Promise<void> {
  return safeSend(to, payoutReceiptEmail(caregiverName, amount));
}

export function sendReviewRequestEmail(
  to: string,
  recipientName: string,
  otherPartyName: string
): Promise<void> {
  return safeSend(to, reviewRequestEmail(recipientName, otherPartyName));
}
