---
name: booking-engine
description: Booking state machine, availability calendar, slot validation. Trigger on: "booking", "availability", "calendar", "slot", "schedule", "session", "state machine".
---
# Booking Engine — Riaya

## Role
Own `packages/booking`. The booking lifecycle is the operational heart of Riaya.
Correctness here = caregiver gets paid, family's child is safe, employer's subsidy is accurate.

## Booking State Machine

```
REQUESTED ──[caregiver accepts]──────────────────────→ CONFIRMED
REQUESTED ──[caregiver declines / 48h timeout]───────→ CANCELLED
CONFIRMED ──[family marks session started]───────────→ IN_PROGRESS
CONFIRMED ──[family cancels < policy hours]──────────→ CANCELLED (+ cancellation fee)
IN_PROGRESS ──[both confirm end]─────────────────────→ COMPLETED
IN_PROGRESS ──[dispute raised]───────────────────────→ DISPUTED
COMPLETED ──[24h window passes, no dispute]──────────→ escrow auto-released
DISPUTED ──[admin resolves]──────────────────────────→ COMPLETED | CANCELLED
```

Rules:
- No state can be skipped
- Caregiver acceptance triggers escrow authorization
- `COMPLETED` triggers review request to both parties
- Escrow released only after reviews OR 24h timeout
- All transitions write `AuditLog` in same tx

## Availability Validation

```typescript
// packages/booking/src/availability.ts
export async function checkAvailability(
  tx: DB,
  caregiverId: string,
  requestedStart: Date,
  requestedEnd: Date
): Promise<{ available: boolean; conflictReason?: string }> {
  const dayOfWeek = requestedStart.getDay()
  const dateStr = requestedStart.toISOString().split('T')[0]
  const timeStr = requestedStart.toTimeString().slice(0, 5)

  // 1. Check if caregiver has a slot covering this time
  const slots = await getCaregiverSlots(tx, caregiverId, dayOfWeek, dateStr)
  const coveringSlot = slots.find(s =>
    s.available && s.startTime <= timeStr && s.endTime >= endTimeStr
  )
  if (!coveringSlot) return { available: false, conflictReason: 'no_slot' }

  // 2. Check no conflicting confirmed booking
  const conflict = await getConflictingBooking(tx, caregiverId, requestedStart, requestedEnd)
  if (conflict) return { available: false, conflictReason: 'already_booked' }

  return { available: true }
}
```

## Pricing Calculation

```typescript
export function computeBookingAmount(
  caregiver: CaregiverProfile,
  durationMinutes: number,
  childrenCount: number
): Money {
  const hours = durationMinutes / 60
  const base = caregiver.hourlyRate
    ? Money.mul(caregiver.hourlyRate, hours)
    : Money.mul(caregiver.dailyRate ?? 0, hours / 8)
  // Simple: no per-child surcharge in v0.1
  return base
}
```

## Cancellation Policy
Configurable per caregiver (default: free cancellation > 24h before; 50% fee < 24h).
Stored in `caregiver_profiles.cancellationPolicy`. Applied at cancellation time.

## Handoff Points
- **← DBA**: booking + availability_slots schema
- **← Backend Dev**: action boundaries
- **→ Payments Engineer**: booking amount → escrow computation
- **→ Frontend Dev**: availability calendar display, booking form
- **→ Tester**: state machine coverage, slot conflict tests
