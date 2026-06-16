# Sprint 5 Snapshot — Verification + Reviews + Notifications + Email

**Date:** 2026-06-16 · **Status:** COMPLETE ✅ · **Tests:** 116/116

Module F (Verification) + Module G (Reviews) + Module H (Notifications + Email) built end-to-end.
**No DB migration needed** — the schema (`verification_documents`, `reviews`, `notifications`,
`access_audit_logs`) + RLS + enums were already laid down in Sprints 0–1, and
`ReviewCreateSchema`/`DocumentTypeSchema` already existed in `@riaya/core`. Sprint 5 was purely
packages + services + actions + UI + adapters.

## Packages
- **@riaya/verification** (now PURE — dropped its `@riaya/db` dep, like `@riaya/payments`):
  `levels.ts` (`computeVerificationLevel` — progressive ladder, recomputed never set; `levelRank`),
  `files.ts` (`validateDocumentFile`, JPEG/PNG/PDF allow-list, 5 MB cap, stable error codes),
  `storage.ts` (`DocumentStorage` interface + `DevStorage` in-memory + `buildDocumentKey`
  unguessable keys + `SIGNED_URL_TTL_SECONDS=900`). Subpaths `.`/`./levels`/`./files`/`./storage`
  all client-safe. R2 adapter is the v0.2 swap behind the same interface.
- **@riaya/notifications**: `email.ts` (`EmailProvider` + `DevEmailProvider` (records/logs) +
  `ResendEmailProvider` (lazy `import("resend")`) + `createEmailProvider()` env-selected),
  `templates.ts` (PURE FR templates: welcome / booking confirmation / payout receipt / review
  request — no children PII). Subpaths `.`/`./email`/`./templates`.

## apps/web services (DB orchestration — mirror the escrow-service `withSystem` pattern)
- **verification-service.ts**: `uploadVerificationDocument` (consent → validate → `storage.put`
  PRIVATE → insert row (key only) + audit + recompute level), `getDocumentSignedUrl`
  (owner/admin only via RLS visibility → `forbidden` otherwise; **MANDATORY `access_audit_logs`
  write** on every mint), `reviewDocument` (admin approve/reject → recompute level + notify
  caregiver). Level recompute runs in the same tx as the status change.
- **notification-service.ts**: `notifyUser`/`notifyFamilyProfile`/`notifyCaregiverProfile` run
  under an elevated (admin) context so cross-user inserts pass `notifications_insert`
  (recipient ≠ actor). `notif` = FR copy builders (PII-free; bookingId/documentId only).
- **email-service.ts**: best-effort wrappers (never throw) over `emailProvider` + templates.
- **review-service.ts**: `submitReview(user, bookingId, input, role)` — post-completion ONLY,
  manual authorization under system context (resolves the reviewee the actor's RLS can't see),
  one review per party, family review recomputes caregiver `avgRating`(×100)+`reviewCount`.
  When BOTH parties have reviewed → `releaseEscrowForBooking` early.
- **booking-events.ts**: lifecycle side-effects (notify + email) resolved system-side and fired
  AFTER the booking transition + escrow side-effect commit.

## Escrow release branch (Riaya non-negotiable #6 now fully implemented)
- Added `releaseEscrowForBooking` to escrow-service: guarded `captured → released` + payout +
  audit, returns payee for notification. Called from `submitReview` when both parties reviewed.
- Worker `escrow.sweep` remains the **24h fallback** (guarded `WHERE status='captured'` → the two
  paths never double-pay). Worker now also writes a `payment_released` notification + payout email.

## Lifecycle wiring (in-app + email)
- request → notify caregiver · accept → notify + email family (booking confirmation) ·
  decline → notify family · both-confirm-end → review_request to both + emails ·
  release (early via reviews OR worker 24h) → payment_released notify + payout email ·
  doc approve/reject → notify caregiver · signup → welcome email.
- `requestBooking`/`declineBooking` split into `*Tx` + thin wrapper (same pattern as accept).

## UI
- `/caregiver/verification` (level badge + per-doc status + upload form with consent gate;
  `verification-upload.tsx` client). Nav link added.
- `/notifications` (list + mark-all-read; unread badge in `AppHeader` for all logged-in roles).
- `ReviewForm` (shared client component, action injected) on completed bookings — family tracker
  + caregiver inbox. `reviewed` flag added to both bookings queries (left join on own review).

## i18n
- fr/ar/en: `nav.verification`/`nav.notifications`, `documentTypes`, `documentStatus`,
  `verificationDash`, `verificationErrors`, `reviews`(+`errors`), `notifications`.

## Tests (+18 → 116/116)
- `@riaya/verification` `levels.test.ts` (14 pure): level ladder edge cases + file validation.
- `packages/db/verification-rls.test.ts` (4 live): CIN doc owner/admin-only (family 403 path);
  docs_update admin-only; access-audit append-by-actor / admin-read-only; review reviewer_id RBAC.

## Seed (idempotent additions)
- 13 verification documents consistent with each caregiver's hardcoded level (certified→4 docs …
  id_checked→pending CIN). 4 reviews on the 2 completed bookings + a demo notification for Sara.

## VERIFIED
`pnpm lint` (149 files) clean · `pnpm -r typecheck` (9) clean · `pnpm test` **116/116** ·
`pnpm --filter @riaya/web build` (webpack) passes (new `/caregiver/verification` + `/notifications`)
· fresh `down -v` → migrate(0000–0006)+RLS+seed(8/4/2 + 6 bookings + 13 docs + 4 reviews)+embed(8) clean.

## Carry-forward
- Admin verification queue UI (view docs via signed URL, approve/reject) + dispute queue = **Sprint 6**
  (`reviewDocument` service already built + tested; just needs the admin pages).
- Notification rows + email copy are **FR-only** (rows carry no per-user locale — v0.1 accepted).
- `DevStorage`/`DevEmailProvider` are in-memory/log only; R2 + Resend are the v0.2 swap behind the
  same interfaces (no real creds in dev).
- Early-release recompute of `avgRating` from the reviews table will override the seed's hardcoded
  illustrative counts once a demo user reviews via the app (acceptable demo artifact).
