/**
 * Availability-slot helpers (Module D, Sprint 3). PURE — no `@riaya/db` import —
 * so the booking form can import them client-side via the `@riaya/booking/slots`
 * subpath, and they are unit-testable without a database.
 *
 * Times are "HH:MM" 24h. Dates are "YYYY-MM-DD". A booking window is matched
 * against slots in UTC (v0.1 — full timezone handling is a v0.2 refinement).
 */

export type AvailabilitySlot = {
  /** 0 (Sun)–6 (Sat) for a recurring weekly slot; null when `specificDate` is set. */
  dayOfWeek: number | null;
  /** "YYYY-MM-DD" for a date override; null for a recurring slot. */
  specificDate: string | null;
  startTime: string; // "08:00"
  endTime: string; // "18:00"
  available: boolean;
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTime(s: string): boolean {
  return TIME_RE.test(s);
}

/** "08:30" → 510 (minutes since midnight). Throws on malformed input. */
export function timeToMinutes(hhmm: string): number {
  if (!TIME_RE.test(hhmm)) throw new Error(`Invalid time: ${hhmm}`);
  const [h, m] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}

/** Weekday 0 (Sun)–6 (Sat) for a "YYYY-MM-DD" date, interpreted in UTC. */
export function dayOfWeekFor(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

/** Split a timestamp into its UTC "YYYY-MM-DD" date and "HH:MM" time. */
export function utcDateParts(d: Date): { dateStr: string; time: string } {
  const iso = d.toISOString();
  return { dateStr: iso.slice(0, 10), time: iso.slice(11, 16) };
}

/**
 * The slots that govern a given calendar date. A date-specific override (rows
 * with `specificDate === dateStr`) fully replaces the recurring weekly slots for
 * that date — so a caregiver can block a day or set special hours. With no
 * override, the recurring slots for that weekday apply.
 */
export function slotsForDate(slots: AvailabilitySlot[], dateStr: string): AvailabilitySlot[] {
  const overrides = slots.filter((s) => s.specificDate === dateStr);
  if (overrides.length > 0) return overrides;
  const dow = dayOfWeekFor(dateStr);
  return slots.filter((s) => s.specificDate == null && s.dayOfWeek === dow);
}

/**
 * Is the window [startTime, endTime) on `dateStr` fully inside a single available
 * slot? A booking can't straddle two separate slots in v0.1.
 */
export function windowCovered(
  slots: AvailabilitySlot[],
  dateStr: string,
  startTime: string,
  endTime: string
): boolean {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return slotsForDate(slots, dateStr).some(
    (s) => s.available && timeToMinutes(s.startTime) <= start && timeToMinutes(s.endTime) >= end
  );
}

/** Available open ranges for a date — for the family-side picker display (sorted). */
export function openRangesForDate(
  slots: AvailabilitySlot[],
  dateStr: string
): { startTime: string; endTime: string }[] {
  return slotsForDate(slots, dateStr)
    .filter((s) => s.available)
    .map((s) => ({ startTime: s.startTime, endTime: s.endTime }))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/** True if two slots overlap in time (used to reject contradictory editor input). */
export function slotsOverlap(a: AvailabilitySlot, b: AvailabilitySlot): boolean {
  return (
    timeToMinutes(a.startTime) < timeToMinutes(b.endTime) &&
    timeToMinutes(b.startTime) < timeToMinutes(a.endTime)
  );
}
