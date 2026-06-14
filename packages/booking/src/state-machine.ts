/**
 * Booking state machine (Module D). The lifecycle is strict — no state may be
 * skipped. Every transition in a server action must be guarded by
 * `assertTransition` and written atomically with an AuditLog row.
 *
 *   REQUESTED ──accept──────→ CONFIRMED
 *   REQUESTED ──decline/cancel→ CANCELLED
 *   CONFIRMED ──start session→ IN_PROGRESS
 *   CONFIRMED ──cancel───────→ CANCELLED
 *   IN_PROGRESS ──both end───→ COMPLETED
 *   IN_PROGRESS ──dispute────→ DISPUTED
 *   DISPUTED ──admin resolves→ COMPLETED | CANCELLED
 */

export type BookingStatus =
  | "requested"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed";

/** Legal next states from each status. Empty array = terminal. */
const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  requested: ["confirmed", "cancelled"],
  confirmed: ["in_progress", "cancelled"],
  in_progress: ["completed", "disputed"],
  completed: [],
  cancelled: [],
  disputed: ["completed", "cancelled"],
};

/** Which role is allowed to drive each transition (admin may always act). */
export type TransitionActor = "family" | "caregiver" | "system" | "admin";

const TRANSITION_ACTORS: Record<string, readonly TransitionActor[]> = {
  "requested->confirmed": ["caregiver", "admin"],
  "requested->cancelled": ["caregiver", "family", "admin"],
  "confirmed->in_progress": ["family", "admin"],
  "confirmed->cancelled": ["family", "caregiver", "admin"],
  "in_progress->completed": ["family", "caregiver", "system", "admin"],
  "in_progress->disputed": ["family", "caregiver", "admin"],
  "disputed->completed": ["admin"],
  "disputed->cancelled": ["admin"],
};

export function isTerminal(status: BookingStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** True if `actor` is permitted to perform the (legal) transition from→to. */
export function actorCanTransition(
  from: BookingStatus,
  to: BookingStatus,
  actor: TransitionActor
): boolean {
  if (!canTransition(from, to)) return false;
  return TRANSITION_ACTORS[`${from}->${to}`]?.includes(actor) ?? false;
}

export class BookingTransitionError extends Error {
  constructor(
    public readonly from: BookingStatus,
    public readonly to: BookingStatus
  ) {
    super(`Illegal booking transition: ${from} → ${to}`);
    this.name = "BookingTransitionError";
  }
}

/** Throws BookingTransitionError unless from→to is legal. */
export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) throw new BookingTransitionError(from, to);
}
