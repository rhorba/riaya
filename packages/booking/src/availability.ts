import { type Tx, bookings } from "@riaya/db";
import { and, eq, gt, inArray, lt, ne } from "drizzle-orm";

export type AvailabilityResult =
  | { available: true }
  | { available: false; reason: "already_booked" | "in_past" | "invalid_range" };

/** Statuses that hold a caregiver's time and block an overlapping booking. */
const BLOCKING_STATUSES = ["confirmed", "in_progress"] as const;

/**
 * Is the caregiver free for [start, end)? In v0.1 (no availability calendar yet —
 * that lands in Sprint 3) "available" means: the range is valid, in the future,
 * and does not overlap any of the caregiver's CONFIRMED or IN_PROGRESS bookings.
 * Multiple families may still REQUEST the same window; only one can be confirmed,
 * enforced both here and by the `bookings_no_overlap` exclusion constraint.
 *
 * Runs on the caller's RLS-scoped `tx`. Pass `excludeBookingId` to ignore the
 * booking being transitioned (e.g. when confirming a request).
 */
export async function checkAvailability(
  tx: Tx,
  caregiverId: string,
  start: Date,
  end: Date,
  excludeBookingId?: string
): Promise<AvailabilityResult> {
  if (end <= start) return { available: false, reason: "invalid_range" };
  if (start.getTime() < Date.now()) return { available: false, reason: "in_past" };

  // Overlap: existing.start < requested.end AND existing.end > requested.start
  const conditions = [
    eq(bookings.caregiverId, caregiverId),
    inArray(bookings.status, [...BLOCKING_STATUSES]),
    lt(bookings.startTime, end),
    gt(bookings.endTime, start),
  ];
  if (excludeBookingId) conditions.push(ne(bookings.id, excludeBookingId));

  const conflicts = await tx
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(...conditions))
    .limit(1);

  if (conflicts.length > 0) return { available: false, reason: "already_booked" };
  return { available: true };
}
