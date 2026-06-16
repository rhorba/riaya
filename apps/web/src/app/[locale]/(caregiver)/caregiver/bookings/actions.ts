"use server";

import { type ActionResult, fail, ok } from "@/lib/action-result";
import { auditBooking, confirmSessionEnd } from "@/lib/booking-shared";
import { withRoleTx } from "@/lib/db";
import { authorizeEscrowForBooking, openDisputeWindowForBooking } from "@/lib/escrow-service";
import { assertTransition, checkAvailability } from "@riaya/booking";
import { BookingDeclineSchema } from "@riaya/core";
import { type Tx, bookings, caregiverProfiles } from "@riaya/db";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/** Booking rows for the caregiver inbox. No family identity / children PII — only
 * what the caregiver legitimately needs to decide (count, type, time, notes). */
export type CaregiverBooking = typeof bookings.$inferSelect;

/** Resolve the signed-in caregiver's profile id (null if not yet created). */
async function caregiverIdFor(tx: Tx, userId: string): Promise<string | null> {
  const [row] = await tx
    .select({ id: caregiverProfiles.id })
    .from(caregiverProfiles)
    .where(eq(caregiverProfiles.userId, userId))
    .limit(1);
  return row?.id ?? null;
}

/** List bookings addressed to the signed-in caregiver (newest first). */
export const getCaregiverBookings = withRoleTx(
  ["caregiver"],
  async (tx, user): Promise<CaregiverBooking[]> => {
    const caregiverId = await caregiverIdFor(tx, user.id);
    if (!caregiverId) return [];
    return tx
      .select()
      .from(bookings)
      .where(eq(bookings.caregiverId, caregiverId))
      .orderBy(desc(bookings.createdAt));
  }
);

/**
 * Caregiver accepts a requested booking → confirmed, then the payment is
 * pre-authorized and the escrow created (authorize-on-confirm). The booking
 * transition runs under the caregiver's RLS context; the escrow side-effect runs
 * as a system step afterwards (escrows are system-only), keyed on the booking id
 * so it is idempotent.
 */
const acceptBookingTx = withRoleTx(
  ["caregiver"],
  async (tx, user, bookingId: string): Promise<ActionResult<{ actorId: string }>> => {
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!booking) return fail("bookingNotFound");
    if (booking.status !== "requested") return fail("invalidState");
    assertTransition("requested", "confirmed");

    // Reject if this caregiver already has a confirmed/in-progress booking over
    // the window. The `bookings_no_overlap` exclusion constraint is the hard
    // backstop for a true concurrent accept race.
    const availability = await checkAvailability(
      tx,
      booking.caregiverId,
      booking.startTime,
      booking.endTime,
      booking.id
    );
    if (!availability.available) return fail("slotConflict");

    await tx
      .update(bookings)
      .set({ status: "confirmed", updatedAt: new Date() })
      .where(eq(bookings.id, bookingId));
    await auditBooking(
      tx,
      user.id,
      bookingId,
      "update",
      { status: "requested" },
      { status: "confirmed" }
    );

    return ok({ actorId: user.id });
  }
);

export async function acceptBooking(bookingId: string): Promise<ActionResult> {
  const res = await acceptBookingTx(bookingId);
  if (!res.ok) return res;
  await authorizeEscrowForBooking(res.data.actorId, bookingId);
  revalidatePath("/caregiver/bookings");
  return ok(undefined);
}

/** Caregiver declines a requested booking → cancelled (with reason). */
export const declineBooking = withRoleTx(
  ["caregiver"],
  async (tx, user, bookingId: string, input: unknown): Promise<ActionResult> => {
    const parsed = BookingDeclineSchema.safeParse(input);
    if (!parsed.success) return fail("invalidInput");

    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!booking) return fail("bookingNotFound");
    if (booking.status !== "requested") return fail("invalidState");
    assertTransition("requested", "cancelled");

    await tx
      .update(bookings)
      .set({ status: "cancelled", cancelReason: parsed.data.cancelReason, updatedAt: new Date() })
      .where(eq(bookings.id, bookingId));
    await auditBooking(
      tx,
      user.id,
      bookingId,
      "cancel",
      { status: "requested" },
      { status: "cancelled" }
    );

    revalidatePath("/caregiver/bookings");
    return ok(undefined);
  }
);

/** Caregiver confirms the session ended (completes when the family also confirms). */
const caregiverConfirmEndTx = withRoleTx(
  ["caregiver"],
  async (
    tx,
    user,
    bookingId: string
  ): Promise<ActionResult<{ completed: boolean; actorId: string }>> => {
    const result = await confirmSessionEnd(tx, user, bookingId, "caregiver");
    if (!result.ok) return result;
    return ok({ completed: result.data.completed, actorId: user.id });
  }
);

export async function caregiverConfirmEnd(bookingId: string): Promise<ActionResult> {
  const res = await caregiverConfirmEndTx(bookingId);
  if (!res.ok) return res;
  if (res.data.completed) await openDisputeWindowForBooking(res.data.actorId, bookingId);
  revalidatePath("/caregiver/bookings");
  return ok(undefined);
}
