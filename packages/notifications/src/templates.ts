import { type Money, formatMoney } from "@riaya/core";

/**
 * Transactional email templates (Module H, Sprint 5). PURE: each returns a
 * `{ subject, text }` pair, no I/O. v0.1 copy is French only (matching the
 * in-app notification rows, which carry no per-user locale — accepted for v0.1).
 *
 * Templates MUST NOT embed children's data (names/ages/special needs) — only the
 * caregiver/family display name and booking metadata are allowed (Riaya
 * non-negotiable #2).
 */
export type EmailTemplate = { subject: string; text: string };

const SIGNOFF = "\n\nL'équipe Riaya · رعاية";

/** Sent on signup. */
export function welcomeEmail(name: string): EmailTemplate {
  return {
    subject: "Bienvenue sur Riaya",
    text: `Bonjour ${name},

Bienvenue sur Riaya — la plateforme qui connecte les familles marocaines à des assistantes de garde d'enfants vérifiées.

Vous pouvez dès maintenant compléter votre profil et explorer la plateforme.${SIGNOFF}`,
  };
}

/** Sent to the family when a caregiver accepts a booking. */
export function bookingConfirmationEmail(
  familyName: string,
  caregiverName: string,
  startTime: Date,
  familyPays: Money
): EmailTemplate {
  const when = startTime.toLocaleString("fr-MA");
  return {
    subject: "Votre réservation est confirmée",
    text: `Bonjour ${familyName},

${caregiverName} a accepté votre demande de réservation.
Date : ${when}
Montant à payer : ${formatMoney(familyPays)}

Le paiement a été pré-autorisé et sera débité au début de la session.${SIGNOFF}`,
  };
}

/** Sent to the caregiver when escrow is released after a completed booking. */
export function payoutReceiptEmail(caregiverName: string, amount: Money): EmailTemplate {
  return {
    subject: "Votre paiement a été versé",
    text: `Bonjour ${caregiverName},

Le paiement de votre garde a été libéré : ${formatMoney(amount)}.

Merci pour votre travail au service des familles marocaines.${SIGNOFF}`,
  };
}

/** Sent to a party after a session is completed, requesting their review. */
export function reviewRequestEmail(recipientName: string, otherPartyName: string): EmailTemplate {
  return {
    subject: "Donnez votre avis sur votre garde",
    text: `Bonjour ${recipientName},

Votre session avec ${otherPartyName} est terminée. Merci de laisser un avis — il renforce la confiance sur Riaya et permet de libérer le paiement.

Rendez-vous dans « Mes réservations » pour évaluer cette garde.${SIGNOFF}`,
  };
}
