# decisions
<!-- append-only log — architecture decisions (ADRs) -->

## ADR-01: Role-scoped shared schema + RLS (4 roles)
family / caregiver / employer / admin. Children's data and CIN docs have strictest RLS policies.

## ADR-02: Two R2 buckets — public + private
Profile photos → public CDN. CIN/police clearance/health certs → private bucket, signed URLs only (15-min expiry), every access audit-logged.

## ADR-03: Booking and Escrow are separate state machines
Booking: requested → confirmed → in_progress → completed | cancelled | disputed.
Escrow: pending → authorized → captured → released | refunded | disputed.
Decoupled but progress together.

## ADR-04: Availability as DB time slots
Weekly recurring + specific date overrides in DB. No external calendar in v0.1.

## ADR-05: Employer subsidy as ledger, not gateway flow
Employer subsidizes at invoice time; family pre-authorizes net amount; employer invoiced monthly by pg-boss sweep.
