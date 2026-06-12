# Sprint 2 — Caregiver Search + Booking System

**Goal**: Public caregiver search (SSR). Booking request → confirm → complete loop.

**Duration**: 1–2 sessions | **Depends on**: Sprint 1

## Must
- [ ] S2-01 — UX: search page + caregiver card + booking flow wireframes — **UX Designer**
- [ ] S2-02 — Frontend Dev: public caregiver search (SSR, filter by type/city/price/verification level) — **Frontend Dev**
- [ ] S2-03 — Backend Dev: booking request action (check availability, create booking) — **Backend Dev** → Booking Engine
- [ ] S2-04 — Booking Engine: `checkAvailability()` function + booking state machine core — **Booking Engine**
- [ ] S2-05 — Backend Dev: caregiver accept/decline action — **Backend Dev**
- [ ] S2-06 — Backend Dev: session start/end confirmation (both parties) — **Backend Dev**
- [ ] S2-07 — Frontend Dev: booking request form (date/time picker, duration, children count, notes) — **Frontend Dev**
- [ ] S2-08 — Frontend Dev: caregiver booking inbox (accept/decline with reason) — **Frontend Dev**
- [ ] S2-09 — Frontend Dev: family booking tracker (status + session in-progress view) — **Frontend Dev**
- [ ] S2-10 — Content Editor: FR/AR for booking statuses, actions, notifications — **Content Editor**
- [ ] S2-11 — Tester: booking RBAC (caregiver can't book; family can't accept); state machine — **Tester**
- [ ] S2-12 — Sprint 2 snapshot — **Project Monitor** → STOP → ask for Sprint 3 approval

## DoD — Sprint 2
- [ ] Public search works without auth (SSR/cached)
- [ ] Booking lifecycle: requested → confirmed → in_progress → completed
- [ ] Concurrency: two families can't book same slot (unique constraint test)
- [ ] RBAC tests pass; FR + AR; `pnpm build`/`test`/`lint` green
