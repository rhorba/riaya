# Sprint 0 — Scaffold + Auth + RBAC + RLS

**Goal**: `pnpm dev` works. Postgres + pgvector running with RLS. User can sign up as
family OR caregiver OR employer, log in, and **role isolation proven by test**.

**Duration**: 1–2 sessions | **Auto-handoff**: ENABLED

## Must
- [ ] S0-01 — pnpm workspace: `apps/web`, `packages/core|db|booking|payments|verification|matching|notifications` — **Tech Lead**
- [ ] S0-02 — `apps/web` Next.js 15 App Router + TypeScript strict + Biome — **Tech Lead**
- [ ] S0-03 — `packages/core`: `Money` type + helpers, `Role` enum (family/caregiver/employer/admin), RBAC, Zod schemas — **Tech Lead**
- [ ] S0-04 — `packages/db`: Drizzle config + users table — **DBA**
- [ ] S0-05 — RLS: withUserContext helper; RLS on users table — **DBA** → Security Engineer
- [ ] S0-06 — DB init SQL: CREATE EXTENSION vector; RLS-bound app role — **DBA** → DevOps
- [ ] S0-07 — Auth.js v5: email+Argon2id + Google OAuth; session `{ userId, role }` — **Security Engineer**
- [ ] S0-08 — `withRole()` server action factory — **Backend Dev**
- [ ] S0-09 — Signup: choose role (family/caregiver/employer) → create user; login page — **Backend Dev**
- [ ] S0-10 — next-intl fr/ar/en + `[locale]` layout + `dir` switch — **Frontend Dev**
- [ ] S0-11 — Tailwind v4 + terracotta/sage tokens + shadcn/ui — **UI Designer**
- [ ] S0-12 — App shell: role-aware nav (4 roles), top bar — **Frontend Dev**
- [ ] S0-13 — Docker Compose (postgres+pgvector + web + worker + caddy) + .env.example — **DevOps**
- [ ] S0-14 — pg-boss worker: queues (booking.reminders, escrow.sweep, email.digest, employer.invoice) — **DevOps**
- [ ] S0-15 — GitHub Actions CI (pgvector/pgvector:pg16 image) — **DevOps**
- [ ] S0-16 — **Tester**: role isolation — family cannot read caregiver private data; CIN doc endpoint 403 for family role — **Tester**
- [ ] S0-17 — Sprint 0 snapshot — **Project Monitor** → STOP → ask for Sprint 1 approval

## DoD — Sprint 0
- [ ] `pnpm install`/`dev`/`build` pass; Docker works; pgvector extension installed
- [ ] Signup as family/caregiver/employer; login; session carries role
- [ ] Role isolation test passes
- [ ] FR/AR routing; `dir=rtl` on `/ar`; `pnpm test`/`lint` clean
