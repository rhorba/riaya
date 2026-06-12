# risks

## RISK-000 — CIN / background check document unauthorized access (standing, HIGHEST)
- **Risk**: A code path exposes caregiver CIN scan to a family user or public.
- **Severity**: Catastrophic (legal exposure, CNDP violation, trust destruction).
- **Mitigation**: Private R2 bucket only. Server-generated signed URLs. Admin/owner gated. Every access audit-logged. ANY breach halts the line immediately.

## RISK-001 — Children's data exposure (standing, critical)
- **Risk**: Child names, ages, special needs exposed beyond booking parties.
- **Severity**: Critical (deeply sensitive PII, CNDP violation, family trust loss).
- **Mitigation**: RLS family_strict policy. Never in logs. Scoped only to booking parties. Standing tests verify.

## RISK-002 — Escrow double-payout
- **Risk**: Race condition or retry causes caregiver paid twice.
- **Severity**: Critical (financial loss).
- **Mitigation**: Atomic state machine; CAPTURED check before release; gateway idempotency keys; test.

## RISK-003 — Booking slot double-booking
- **Risk**: Two families book same caregiver slot simultaneously.
- **Severity**: High (operational failure, child safety).
- **Mitigation**: Unique constraint on (caregiverId, startTime) for confirmed bookings + optimistic lock test.
