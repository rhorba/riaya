---
name: tech-lead
description: Architecture, ADRs, stack enforcement. Trigger on: "architecture", "ADR", "tech stack", "system design", "refactor".
---
# Tech Lead — Riaya

## Stack (FINAL — CLAUDE.md §5)
| Concern | Choice |
|---|---|
| Web | Next.js 15 App Router, TypeScript strict |
| DB | PostgreSQL 16 + Drizzle ORM + RLS + pgvector |
| Auth | Auth.js v5 (email + Google OAuth, Argon2id) |
| Money | Integer centimes, `Money` type in packages/core |
| Booking | DB state machine in packages/booking |
| Payments | Escrow state machine + CMI adapter in packages/payments |
| Matching | pgvector caregiver embeddings in packages/matching |
| Verification | Doc workflow in packages/verification |
| Jobs | pg-boss (reminder sweeps, payout sweep, email digest) |
| Email | Resend via packages/notifications |
| Storage | Cloudflare R2 — **PRIVATE bucket** for CIN/docs, public for profile photos |
| i18n | next-intl (fr/ar/en), RTL mandatory |

## Key ADRs

### ADR-01: Role isolation + RLS (four roles, not org tenancy)
Family / caregiver / employer / admin in a shared schema. RLS scopes reads to user_id or role=admin. Children's data and CIN docs have the strictest policies.

### ADR-02: Two R2 buckets — public + private
Profile photos → public bucket (CDN URL).
CIN scans, police clearance, health certs → PRIVATE bucket. Only served via server-generated signed URLs with 15-min expiry. Admin or document owner only.

### ADR-03: Booking and Escrow are separate state machines
Booking: requested → confirmed → in_progress → completed | cancelled | disputed.
Escrow: pending → authorized → captured → released | refunded | disputed.
They progress together but are decoupled. A booking cancellation triggers an escrow refund — they don't share state.

### ADR-04: Availability as DB time slots (not external calendar)
Caregivers set weekly recurring slots + specific date overrides in DB.
Booking checker validates against slots before confirming. No iCal sync in v0.1.

### ADR-05: Employer subsidy is a ledger, not a gateway flow
Employer subsidy is deducted from the booking total at invoice time. Family pre-authorizes the net amount. Employer is invoiced monthly for all subsidy disbursements. Clean separation.

## Data Flow
```
Public visitor → Search caregivers (SSR) → View profile → Sign up → Book
Caregiver → accepts → Escrow authorized (family card) → Session happens
Both confirm end → 24h dispute window → Escrow released → Caregiver paid
Employer → monthly invoice for all subsidized bookings
pg-boss → booking reminders, payout sweeps, email digests, doc expiry alerts
```

## Code Standards
1. TypeScript strict — no `any`
2. Money = `Money` (centimes); never float
3. Every query role-scoped; RBAC on every mutation
4. All user-facing strings in i18n catalogs; logical Tailwind for RTL
5. Financial mutations write `AuditLog` in same tx
6. CIN/docs: every read of a private document URL writes an access audit log
