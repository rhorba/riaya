import { authDb, bookings, caregiverProfiles, familyProfiles, notifications } from "@riaya/db";
import { and, eq, gte, isNull, lte } from "drizzle-orm";

/** Send the reminder when the session starts within this lead time. */
const REMINDER_LEAD_MS = 60 * 60 * 1000; // 1 hour

/**
 * Reminder sweep (Sprint 3, Module H). Finds CONFIRMED bookings starting within
 * the next hour that have not been reminded, and inserts an in-app
 * `booking_reminder` notification for both the family and the caregiver. Sets
 * `reminder_sent_at` so each booking is reminded at most once (idempotent — safe
 * to run on a frequent schedule).
 *
 * Uses the privileged (authDb) connection: a system sweep with no per-user RLS
 * context, writing notifications across users. Notification bodies are PII-free
 * (no child names, no cross-party identity) per Riaya non-negotiable #2.
 */
export async function sendBookingReminders(now: Date = new Date()): Promise<number> {
  const horizon = new Date(now.getTime() + REMINDER_LEAD_MS);

  const due = await authDb
    .select({
      id: bookings.id,
      startTime: bookings.startTime,
      familyUserId: familyProfiles.userId,
      caregiverUserId: caregiverProfiles.userId,
    })
    .from(bookings)
    .innerJoin(familyProfiles, eq(bookings.familyId, familyProfiles.id))
    .innerJoin(caregiverProfiles, eq(bookings.caregiverId, caregiverProfiles.id))
    .where(
      and(
        eq(bookings.status, "confirmed"),
        isNull(bookings.reminderSentAt),
        gte(bookings.startTime, now),
        lte(bookings.startTime, horizon)
      )
    );

  for (const b of due) {
    const time = b.startTime.toISOString().slice(11, 16);
    const title = "Rappel de réservation";
    const body = `Votre session de garde commence bientôt (à ${time}).`;
    await authDb.insert(notifications).values([
      { userId: b.familyUserId, type: "booking_reminder", title, body, data: { bookingId: b.id } },
      {
        userId: b.caregiverUserId,
        type: "booking_reminder",
        title,
        body,
        data: { bookingId: b.id },
      },
    ]);
    await authDb.update(bookings).set({ reminderSentAt: now }).where(eq(bookings.id, b.id));
  }

  return due.length;
}
