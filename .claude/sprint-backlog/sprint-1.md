# Sprint 1 — Data Model + Profiles + Demo Seed

**Goal**: Full schema with RLS. Caregiver, family, employer profiles. Demo data.

**Duration**: 1–2 sessions | **Depends on**: Sprint 0

## Must
- [ ] S1-01 — DBA: full schema — `caregiver_profiles`, `family_profiles`, `employer_accounts`, `enrolled_employees`, `verification_documents` (fileKey not fileUrl), `availability_slots`, `bookings`, `escrows`, `reviews`, `notifications`, `audit_logs`, `access_audit_logs` — all with RLS — **DBA** → Security Engineer
- [ ] S1-02 — DBA: pgvector column on `caregiver_profiles.skill_vector`; indexes — **DBA** → Matching
- [ ] S1-03 — Security Engineer: RLS review — CIN docs strictest policy (owner + admin only) — **Security Engineer**
- [ ] S1-04 — Backend Dev: caregiver profile actions (create, update, get own) — **Backend Dev**
- [ ] S1-05 — Backend Dev: family profile actions (create, update, manage children) — **Backend Dev**
- [ ] S1-06 — Backend Dev: employer account actions (create, enroll employee, set budget) — **Backend Dev**
- [ ] S1-07 — Frontend Dev: caregiver profile create/edit (care types, rates, cities, photo) — **Frontend Dev**
- [ ] S1-08 — Frontend Dev: family profile create/edit + children management (sensitive fields handled carefully) — **Frontend Dev**
- [ ] S1-09 — Frontend Dev: employer account create + employee enrollment — **Frontend Dev**
- [ ] S1-10 — Frontend Dev: public caregiver profile (SSR) + verification badge — **Frontend Dev**
- [ ] S1-11 — DBA + Backend Dev: idempotent demo seed (8 caregivers, 4 families, 2 employers) — **DBA**
- [ ] S1-12 — Content Editor: FR/AR for care types, verification levels, profile fields — **Content Editor**
- [ ] S1-13 — Tester: role isolation; family cannot edit caregiver profile; CIN doc 403 tests — **Tester**
- [ ] S1-14 — Sprint 1 snapshot — **Project Monitor** → STOP → ask for Sprint 2 approval

## DoD — Sprint 1
- [ ] All tables with RLS; CIN docs table with strictest policy
- [ ] Caregiver, family, employer profiles create/edit/view
- [ ] Demo seed loads; all 4 roles have demo credentials
- [ ] Verification badge renders correctly for all 5 levels
- [ ] FR + AR; `pnpm build`/`test`/`lint` green
