import "server-only";

import { sendBookingConfirmationEmail, sendReviewRequestEmail } from "@/lib/email-service";
import { notif, notifyUser } from "@/lib/notification-service";
import { money } from "@riaya/core";
import {
  bookings,
  caregiverProfiles,
  db,
  escrows,
  familyProfiles,
  users,
  withUserContext,
} from "@riaya/db";
import { eq } from "drizzle-orm";

/**
 * Booking lifecycle side-effects: in-app notifications + transactional email
 * (Module H, Sprint 5). These run AFTER the booking transition (and its escrow
 * side-effect) have committed, so a notification/email failure can never roll
 * back the state change. Party resolution happens under a system (admin) context
 * because a caregiver action can't read the family's user row and vice-versa.
 *
 * Only counterpart DISPLAY NAMES + booking metadata cross into copy — never a
 * child's data (Riaya non-negotiable #2).
 */
type Parties = {
  bookingId: string;
  startTime: Date;
  caregiverUserId: string;
  caregiverName: string;
  caregiverEmail: string;
  familyUserId: string;
  familyName: string;
  familyEmail: string;
  familyPays: number;
};

/** Resolve both parties (+ escrow amount) for a booking under a system context. */
async function loadParties(actorUserId: string, bookingId: string): Promise<Parties | null> {
  return withUserContext(db, actorUserId, "admin", async (tx) => {
    const [row] = await tx
      .select({
        bookingId: bookings.id,
        startTime: bookings.startTime,
        caregiverUserId: caregiverProfiles.userId,
        caregiverName: caregiverProfiles.displayName,
        familyUserId: familyProfiles.userId,
        familyPays: escrows.familyPays,
      })
      .from(bookings)
      .innerJoin(caregiverProfiles, eq(bookings.caregiverId, caregiverProfiles.id))
      .innerJoin(familyProfiles, eq(bookings.familyId, familyProfiles.id))
      .leftJoin(escrows, eq(escrows.bookingId, bookings.id))
      .where(eq(bookings.id, bookingId))
      .limit(1);
    if (!row) return null;

    const [cgUser] = await tx
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, row.caregiverUserId))
      .limit(1);
    const [famUser] = await tx
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, row.familyUserId))
      .limit(1);

    return {
      bookingId: row.bookingId,
      startTime: row.startTime,
      caregiverUserId: row.caregiverUserId,
      caregiverName: row.caregiverName || cgUser?.name || "L'assistante",
      caregiverEmail: cgUser?.email ?? "",
      familyUserId: row.familyUserId,
      familyName: famUser?.name ?? "La famille",
      familyEmail: famUser?.email ?? "",
      familyPays: row.familyPays ?? 0,
    };
  });
}

/** Family requested a booking → notify the caregiver. */
export async function onBookingRequested(actorUserId: string, bookingId: string): Promise<void> {
  const p = await loadParties(actorUserId, bookingId);
  if (!p) return;
  await notifyUser(actorUserId, p.caregiverUserId, notif.bookingRequested(p.familyName, bookingId));
}

/** Caregiver accepted → notify + email the family. */
export async function onBookingConfirmed(actorUserId: string, bookingId: string): Promise<void> {
  const p = await loadParties(actorUserId, bookingId);
  if (!p) return;
  await notifyUser(actorUserId, p.familyUserId, notif.bookingConfirmed(p.caregiverName, bookingId));
  await sendBookingConfirmationEmail(
    p.familyEmail,
    p.familyName,
    p.caregiverName,
    p.startTime,
    money(p.familyPays)
  );
}

/** Caregiver declined → notify the family. */
export async function onBookingDeclined(actorUserId: string, bookingId: string): Promise<void> {
  const p = await loadParties(actorUserId, bookingId);
  if (!p) return;
  await notifyUser(actorUserId, p.familyUserId, notif.bookingDeclined(p.caregiverName, bookingId));
}

/** Session completed → request a review from BOTH parties (in-app + email). */
export async function onBookingCompleted(actorUserId: string, bookingId: string): Promise<void> {
  const p = await loadParties(actorUserId, bookingId);
  if (!p) return;
  await notifyUser(actorUserId, p.familyUserId, notif.reviewRequest(p.caregiverName, bookingId));
  await notifyUser(actorUserId, p.caregiverUserId, notif.reviewRequest(p.familyName, bookingId));
  await sendReviewRequestEmail(p.familyEmail, p.familyName, p.caregiverName);
  await sendReviewRequestEmail(p.caregiverEmail, p.caregiverName, p.familyName);
}
