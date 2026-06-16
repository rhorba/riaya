import { type ActionResult, fail, ok } from "@/lib/action-result";
import type { SessionUser } from "@/lib/session";
import { type BookingStatus, assertTransition } from "@riaya/booking";
import { type Tx, auditLogs, bookings } from "@riaya/db";
import { eq } from "drizzle-orm";

/**
 * Write an audit row for a booking mutation. MUST run inside the same tx as the
 * mutation so the lifecycle change and its audit trail commit atomically
 * (Riaya non-negotiable #4).
 */
export async function auditBooking(
  tx: Tx,
  actorUserId: string,
  bookingId: string,
  action: "create" | "update" | "cancel" | "dispute",
  before: unknown,
  after: unknown
): Promise<void> {
  await tx.insert(auditLogs).values({
    actorUserId,
    entity: "booking",
    entityId: bookingId,
    action,
    before: before ?? null,
    after: after ?? null,
  });
}

/**
 * Session-end confirmation shared by both parties. `in_progress → completed`
 * requires BOTH the family and the caregiver to confirm the session ended; the
 * transition fires the moment the second confirmation lands. RLS guarantees the
 * caller only sees a booking they're a party to.
 */
export async function confirmSessionEnd(
  tx: Tx,
  user: SessionUser,
  bookingId: string,
  side: "family" | "caregiver"
): Promise<ActionResult<{ completed: boolean }>> {
  const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking) return fail("bookingNotFound");
  if (booking.status !== "in_progress") return fail("invalidState");

  const now = new Date();
  const familyEndedAt = side === "family" ? (booking.familyEndedAt ?? now) : booking.familyEndedAt;
  const caregiverEndedAt =
    side === "caregiver" ? (booking.caregiverEndedAt ?? now) : booking.caregiverEndedAt;

  const bothConfirmed = familyEndedAt != null && caregiverEndedAt != null;
  const nextStatus: BookingStatus = bothConfirmed ? "completed" : "in_progress";
  if (bothConfirmed) assertTransition("in_progress", "completed");

  await tx
    .update(bookings)
    .set({ familyEndedAt, caregiverEndedAt, status: nextStatus, updatedAt: now })
    .where(eq(bookings.id, bookingId));

  await auditBooking(
    tx,
    user.id,
    bookingId,
    "update",
    { status: booking.status },
    { status: nextStatus, endConfirmedBy: side }
  );

  return ok({ completed: bothConfirmed });
}
