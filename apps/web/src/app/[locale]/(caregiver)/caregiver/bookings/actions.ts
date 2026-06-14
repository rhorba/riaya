"use server";

import { type ActionResult, fail, ok } from "@/lib/action-result";
import { auditBooking, confirmSessionEnd } from "@/lib/booking-shared";
import { withRoleTx } from "@/lib/db";
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

/** Caregiver accepts a requested booking → confirmed. */
export const acceptBooking = withRoleTx(
  ["caregiver"],
  async (tx, user, bookingId: string): Promise<ActionResult> => {
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

    revalidatePath("/caregiver/bookings");
    return ok(undefined);
  }
);

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
export const caregiverConfirmEnd = withRoleTx(
  ["caregiver"],
  async (tx, user, bookingId: string): Promise<ActionResult> => {
    const result = await confirmSessionEnd(tx, user, bookingId, "caregiver");
    revalidatePath("/caregiver/bookings");
    return result;
  }
);
