// Booking state machine + availability + pricing (Module D, Sprint 2).
export {
  type BookingStatus,
  type TransitionActor,
  isTerminal,
  canTransition,
  actorCanTransition,
  assertTransition,
  BookingTransitionError,
} from "./state-machine.js";
export { type AvailabilityResult, checkAvailability } from "./availability.js";
export { type CaregiverRates, computeBookingAmount, durationMinutes } from "./pricing.js";
export {
  type AvailabilitySlot,
  isValidTime,
  timeToMinutes,
  dayOfWeekFor,
  utcDateParts,
  slotsForDate,
  windowCovered,
  openRangesForDate,
  slotsOverlap,
} from "./slots.js";
export {
  type CancellationPolicy,
  DEFAULT_CANCELLATION_POLICY,
  hoursUntil,
  computeCancellationFee,
} from "./cancellation.js";
