# Sprint 5 — Verification System + Reviews + Notifications + Email

**Duration**: 1–2 sessions | **Depends on**: Sprint 4

## Must
- [ ] S5-01 — Verification Engineer: document upload flow (CIN, police clearance, health cert) — consent timestamp, private R2, audit log on upload — **Verification Engineer** → Security
- [ ] S5-02 — Verification Engineer: `computeVerificationLevel()` function + recompute on doc approval/rejection — **Verification Engineer**
- [ ] S5-03 — Backend Dev: `getDocumentSignedUrl()` (admin or owner only, 15min expiry, audit log MANDATORY) — **Backend Dev** → Security
- [ ] S5-04 — Frontend Dev: caregiver verification dashboard (upload form + status per doc + level badge) — **Frontend Dev**
- [ ] S5-05 — Backend Dev: mutual review actions (post-booking only; feeds rating + verification) — **Backend Dev**
- [ ] S5-06 — Frontend Dev: post-session review prompt (both sides) — **Frontend Dev**
- [ ] S5-07 — Backend Dev: notifications system (in-app rows + unread count) — **Backend Dev**
- [ ] S5-08 — Backend Dev: Resend email integration (welcome, booking confirm, payout receipt, review request) — **Backend Dev**
- [ ] S5-09 — Content Editor: FR/AR for verification steps, reviews, notifications, email subjects — **Content Editor**
- [ ] S5-10 — Tester: CIN doc 403 for family role; audit log on every signed URL; review RBAC; verification level math — **Tester**
- [ ] S5-11 — Sprint 5 snapshot — **Project Monitor** → STOP → ask for Sprint 6 approval

---

# Sprint 6 — Admin Dashboard + i18n + RTL + a11y

**Duration**: 1–2 sessions | **Depends on**: Sprint 5

## Must
- [ ] S6-01 — Frontend Dev: admin dashboard — KPIs (GMV, active bookings, caregivers enrolled, employers, jobs_enabled hours) — **Frontend Dev**
- [ ] S6-02 — Frontend Dev: admin verification queue (view docs via signed URL, approve/reject) — **Frontend Dev**
- [ ] S6-03 — Frontend Dev: admin dispute queue — **Frontend Dev**
- [ ] S6-04 — Frontend Dev: admin escrow health monitor — **Frontend Dev**
- [ ] S6-05 — Content Editor: complete fr.json + ar.json sweep — zero gaps — **Content Editor**
- [ ] S6-06 — Frontend Dev: i18n audit + RTL audit (grep hardcoded strings; logical Tailwind everywhere) — **Frontend Dev**
- [ ] S6-07 — Frontend Dev: a11y — focus states, labels, contrast, keyboard nav — **Frontend Dev**
- [ ] S6-08 — Tester: i18n parity test, RTL E2E, admin doc signing audit — **Tester**
- [ ] S6-09 — Sprint 6 snapshot → ask for Sprint 7 approval

---

# Sprint 7 — Security Hardening + Performance + Deploy → v0.1 SHIP

**Duration**: 1–2 sessions | **Depends on**: Sprint 6

## Must
- [ ] S7-01 — Security Engineer: adversarial tests — CIN doc access, children's data, role isolation, admin impersonation — **Security Engineer**
- [ ] S7-02 — Security Engineer: R2 private bucket policy verification — no public access possible — **Security Engineer**
- [ ] S7-03 — Security Engineer: auth hardening — rate-limit, lockout, Google OAuth redirect URI — **Security Engineer**
- [ ] S7-04 — Security Engineer: PII pass — children's data + CIN never in logs/errors; consent timestamps stored — **Security Engineer**
- [ ] S7-05 — Backend Dev: audit-log coverage — every financial mutation + every signed URL — **Backend Dev**
- [ ] S7-06 — Tech Lead: performance — SSR caregiver search cached; images via R2 CDN; bundle lean — **Tech Lead**
- [ ] S7-07 — DevOps: deploy path A (Vercel + Neon/Supabase pgvector + worker) — **DevOps**
- [ ] S7-08 — DevOps: deploy path B (`docker compose up -d` end-to-end) — **DevOps**
- [ ] S7-09 — Deployment: verify both paths; CIN doc 403 in prod; escrow state machine in prod — **Deployment**
- [ ] S7-10 — Tester: full regression + CIN access suite + E2E critical paths — **Tester**
- [ ] S7-11 — README.md + .env.example complete — **Project Manager**
- [ ] S7-12 — Final DoD: all 22 items ✅ — **Project Monitor** → v0.1 SHIPPED

## DoD — Sprint 7 (= v0.1 SHIPPED)
- [ ] CIN docs: private R2 only; every access audited; family role 403 proven
- [ ] Children's data: never in logs; scoped only to booking parties
- [ ] Escrow state machine 100% tested; double-payout impossible
- [ ] Role isolation adversarial tests green
- [ ] Booking state machine: no state skip possible
- [ ] Employer subsidy: never negative; audit trail complete
- [ ] Deploys: managed cloud AND `docker compose up -d`
- [ ] `pnpm build` 0 TS errors; `pnpm test` green; `pnpm lint` clean; gitleaks passes
