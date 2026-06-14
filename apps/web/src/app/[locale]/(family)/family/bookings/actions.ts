"use server";

import { type ActionResult, fail, ok } from "@/lib/action-result";
import { auditBooking, confirmSessionEnd } from "@/lib/booking-shared";
import { withRoleTx } from "@/lib/db";
import { assertTransition, checkAvailability } from "@riaya/booking";
import { BookingRequestSchema } from "@riaya/core";
import { bookings, caregiverProfiles, familyProfiles } from "@riaya/db";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/** A booking row enriched with the caregiver's public display name, for the tracker. */
export type FamilyBooking = typeof bookings.$inferSelect & { caregiverName: string };

/** List the signed-in family's bookings (newest first) with caregiver names. */
export const getMyBookings = withRoleTx(["family"], async (tx, user): Promise<FamilyBooking[]> => {
  const [profile] = await tx
    .select({ id: familyProfiles.id })
    .from(familyProfiles)
    .where(eq(familyProfiles.userId, user.id))
    .limit(1);
  if (!profile) return [];

  const rows = await tx
    .select({ booking: bookings, caregiverName: caregiverProfiles.displayName })
    .from(bookings)
    .innerJoin(caregiverProfiles, eq(bookings.caregiverId, caregiverProfiles.id))
    .where(eq(bookings.familyId, profile.id))
    .orderBy(desc(bookings.createdAt));

  return rows.map((r) => ({ ...r.booking, caregiverName: r.caregiverName }));
});

/**
 * Family requests a booking. Validates the caregiver offers the care type, can
 * take this many children, and is free for the window (app-level check; the
 * `bookings_no_overlap` constraint is the hard guarantee at confirm time).
 */
export const requestBooking = withRoleTx(
  ["family"],
  async (tx, user, input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = BookingRequestSchema.safeParse(input);
    if (!parsed.success) return fail("invalidInput");
    const data = parsed.data;

    const [profile] = await tx
      .select({ id: familyProfiles.id })
      .from(familyProfiles)
      .where(eq(familyProfiles.userId, user.id))
      .limit(1);
    if (!profile) return fail("profileNotFound");

    const [caregiver] = await tx
      .select({
        id: caregiverProfiles.id,
        careTypes: caregiverProfiles.careTypes,
        maxChildren: caregiverProfiles.maxChildren,
      })
      .from(caregiverProfiles)
      .where(eq(caregiverProfiles.id, data.caregiverId))
      .limit(1);
    if (!caregiver) return fail("caregiverNotFound");
    if (!caregiver.careTypes.includes(data.careType)) return fail("careTypeNotOffered");
    if (data.childrenCount > caregiver.maxChildren) return fail("tooManyChildren");

    const availability = await checkAvailability(tx, caregiver.id, data.startTime, data.endTime);
    if (!availability.available) {
      return fail(availability.reason === "in_past" ? "startInPast" : "slotUnavailable");
    }

    const [created] = await tx
      .insert(bookings)
      .values({
        caregiverId: caregiver.id,
        familyId: profile.id,
        careType: data.careType,
        startTime: data.startTime,
        endTime: data.endTime,
        locationNote: data.locationNote,
        childrenCount: data.childrenCount,
        familyNotes: data.familyNotes,
        urgent: data.urgent,
        status: "requested",
      })
      .returning({ id: bookings.id });
    if (!created) return fail("createFailed");

    await auditBooking(tx, user.id, created.id, "create", null, { status: "requested" });

    revalidatePath("/family/bookings");
    return ok({ id: created.id });
  }
);

/** Family marks a confirmed session as started → in_progress. */
export const startSession = withRoleTx(
  ["family"],
  async (tx, user, bookingId: string): Promise<ActionResult> => {
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!booking) return fail("bookingNotFound");
    if (booking.status !== "confirmed") return fail("invalidState");
    assertTransition("confirmed", "in_progress");

    await tx
      .update(bookings)
      .set({ status: "in_progress", updatedAt: new Date() })
      .where(eq(bookings.id, bookingId));
    await auditBooking(
      tx,
      user.id,
      bookingId,
      "update",
      { status: "confirmed" },
      { status: "in_progress" }
    );

    revalidatePath("/family/bookings");
    return ok(undefined);
  }
);

/** Family confirms the session ended (completes when the caregiver also confirms). */
export const familyConfirmEnd = withRoleTx(
  ["family"],
  async (tx, user, bookingId: string): Promise<ActionResult> => {
    const result = await confirmSessionEnd(tx, user, bookingId, "family");
    revalidatePath("/family/bookings");
    return result;
  }
);

/** Family cancels a requested or confirmed booking. */
export const cancelBooking = withRoleTx(
  ["family"],
  async (tx, user, bookingId: string, reason: string): Promise<ActionResult> => {
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!booking) return fail("bookingNotFound");
    if (booking.status !== "requested" && booking.status !== "confirmed") {
      return fail("invalidState");
    }
    assertTransition(booking.status, "cancelled");

    await tx
      .update(bookings)
      .set({
        status: "cancelled",
        cancelReason: reason.slice(0, 500) || "cancelled_by_family",
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));
    await auditBooking(
      tx,
      user.id,
      bookingId,
      "cancel",
      { status: booking.status },
      { status: "cancelled" }
    );

    revalidatePath("/family/bookings");
    return ok(undefined);
  }
);
