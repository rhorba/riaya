import { type Tx, availabilitySlots, bookings } from "@riaya/db";
import { and, eq, gt, inArray, lt, ne } from "drizzle-orm";
import { type AvailabilitySlot, utcDateParts, windowCovered } from "./slots.js";

export type AvailabilityResult =
  | { available: true }
  | {
      available: false;
      reason: "already_booked" | "in_past" | "invalid_range" | "outside_availability";
    };

/** Statuses that hold a caregiver's time and block an overlapping booking. */
const BLOCKING_STATUSES = ["confirmed", "in_progress"] as const;

/**
 * Is the caregiver free for [start, end)? "available" means: the range is valid,
 * in the future, falls inside the caregiver's published availability (if they
 * have set a calendar), and does not overlap any of their CONFIRMED or
 * IN_PROGRESS bookings. Multiple families may still REQUEST the same window; only
 * one can be confirmed, enforced both here and by the `bookings_no_overlap`
 * exclusion constraint.
 *
 * Availability-calendar rule (Sprint 3): if the caregiver has published ANY
 * slots, the window must fall inside an available slot for that date; a caregiver
 * with no slots at all is treated as open (so the marketplace works before a
 * calendar is set). Slot matching is in UTC for v0.1.
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

  // Published-slot enforcement — only when the caregiver has set a calendar.
  const slotRows = (await tx
    .select({
      dayOfWeek: availabilitySlots.dayOfWeek,
      specificDate: availabilitySlots.specificDate,
      startTime: availabilitySlots.startTime,
      endTime: availabilitySlots.endTime,
      available: availabilitySlots.available,
    })
    .from(availabilitySlots)
    .where(eq(availabilitySlots.caregiverId, caregiverId))) as AvailabilitySlot[];

  if (slotRows.length > 0) {
    const s = utcDateParts(start);
    const e = utcDateParts(end);
    // A booking must sit within a single day's slot (v0.1 — no overnight spans).
    if (s.dateStr !== e.dateStr || !windowCovered(slotRows, s.dateStr, s.time, e.time)) {
      return { available: false, reason: "outside_availability" };
    }
  }

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
