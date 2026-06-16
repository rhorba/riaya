import "server-only";

import {
  type Tx,
  caregiverProfiles,
  db,
  familyProfiles,
  notifications,
  withUserContext,
} from "@riaya/db";
import { eq } from "drizzle-orm";

/**
 * In-app notification rows (Module H, Sprint 5).
 *
 * A notification is almost always addressed to the OTHER party of an interaction
 * (a family acts → the caregiver is notified, and vice-versa). The recipient is
 * never the actor, so the insert can't satisfy the `notifications_insert` policy
 * (`user_id = app_user()`) under the actor's own role. These helpers therefore
 * run under an ELEVATED context — the real actor id (audit attribution) with the
 * role forced to admin — exactly like the escrow side-effects.
 *
 * COPY IS FRENCH ONLY for v0.1: notification rows carry no per-user locale (same
 * accepted limitation as the reminder job). Bodies MUST NOT contain children's
 * data — only the counterpart's display name + booking metadata (non-negotiable #2).
 */
type NotificationType = (typeof notifications.$inferSelect)["type"];

export type NotificationInput = {
  type: NotificationType;
  title: string;
  body: string;
  /** Contextual payload — booking id etc. NEVER children PII. */
  data?: Record<string, unknown>;
};

function withSystem<T>(actorUserId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return withUserContext(db, actorUserId, "admin", fn);
}

/** Notify a specific user by id. */
export async function notifyUser(
  actorUserId: string,
  recipientUserId: string,
  n: NotificationInput
): Promise<void> {
  await withSystem(actorUserId, (tx) => insertNotification(tx, recipientUserId, n));
}

/** Notify the user behind a family profile (resolves the user id system-side). */
export async function notifyFamilyProfile(
  actorUserId: string,
  familyProfileId: string,
  n: NotificationInput
): Promise<void> {
  await withSystem(actorUserId, async (tx) => {
    const [f] = await tx
      .select({ userId: familyProfiles.userId })
      .from(familyProfiles)
      .where(eq(familyProfiles.id, familyProfileId))
      .limit(1);
    if (f) await insertNotification(tx, f.userId, n);
  });
}

/** Notify the user behind a caregiver profile (resolves the user id system-side). */
export async function notifyCaregiverProfile(
  actorUserId: string,
  caregiverProfileId: string,
  n: NotificationInput
): Promise<void> {
  await withSystem(actorUserId, async (tx) => {
    const [c] = await tx
      .select({ userId: caregiverProfiles.userId })
      .from(caregiverProfiles)
      .where(eq(caregiverProfiles.id, caregiverProfileId))
      .limit(1);
    if (c) await insertNotification(tx, c.userId, n);
  });
}

async function insertNotification(
  tx: Tx,
  recipientUserId: string,
  n: NotificationInput
): Promise<void> {
  await tx.insert(notifications).values({
    userId: recipientUserId,
    type: n.type,
    title: n.title,
    body: n.body,
    data: n.data ?? {},
  });
}

/**
 * FR notification copy builders. Pure strings — kept here so every call site
 * produces consistent, PII-free wording. `name` is always a caregiver/family
 * DISPLAY name, never a child's.
 */
export const notif = {
  bookingRequested: (familyName: string, bookingId: string): NotificationInput => ({
    type: "booking_requested",
    title: "Nouvelle demande de réservation",
    body: `${familyName} souhaite réserver une garde.`,
    data: { bookingId },
  }),
  bookingConfirmed: (caregiverName: string, bookingId: string): NotificationInput => ({
    type: "booking_confirmed",
    title: "Réservation confirmée",
    body: `${caregiverName} a accepté votre demande.`,
    data: { bookingId },
  }),
  bookingDeclined: (caregiverName: string, bookingId: string): NotificationInput => ({
    type: "booking_declined",
    title: "Demande refusée",
    body: `${caregiverName} ne peut pas honorer cette demande.`,
    data: { bookingId },
  }),
  reviewRequest: (otherName: string, bookingId: string): NotificationInput => ({
    type: "review_request",
    title: "Donnez votre avis",
    body: `Votre garde avec ${otherName} est terminée. Laissez un avis.`,
    data: { bookingId },
  }),
  paymentReleased: (bookingId: string): NotificationInput => ({
    type: "payment_released",
    title: "Paiement versé",
    body: "Le paiement de votre garde a été libéré.",
    data: { bookingId },
  }),
  documentApproved: (documentId: string): NotificationInput => ({
    type: "document_approved",
    title: "Document approuvé",
    body: "Un de vos documents de vérification a été approuvé.",
    data: { documentId },
  }),
  documentRejected: (documentId: string): NotificationInput => ({
    type: "document_rejected",
    title: "Document refusé",
    body: "Un de vos documents de vérification a été refusé.",
    data: { documentId },
  }),
} as const;
