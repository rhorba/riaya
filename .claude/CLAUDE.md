# Riaya — Claude Code Team Framework

> Read `../CLAUDE.md` for full business rules, data model, and tech stack.
> This file governs HOW the AI team works.

---

## Autonomous Mode (default)

- **Design choices**: Always pick 🟡 **BALANCED** unless user says otherwise.
- **Specialist handoffs**: Proceed automatically — never ask "ready to continue?"
- **Sprint execution**: Work top-to-bottom without pausing between tasks.
- **Testing**: After ANY code task, auto-invoke Tester — never wait for user.

### When to STOP and ask
Only these five reasons:
1. Genuine **blocker** (missing CMI API creds, broken dep, schema can't migrate)
2. **Scope question** not answered in `../CLAUDE.md`
3. **DB schema change** that breaks existing migrations or weakens role isolation
4. **Security/PII risk** that can't be resolved within the team's rules
5. **Sprint boundary** (all tasks done — present summary, ask for Sprint N+1 approval)

---

## Sprint System

| Sprint | Goal |
|---|---|
| **Sprint 0** | Scaffold + Auth + RBAC + RLS — `pnpm dev` + login + role isolation proven |
| **Sprint 1** | Data model + profiles (caregiver, family, employer) + demo seed |
| **Sprint 2** | Caregiver search (public SSR) + booking system (request → confirm → complete) |
| **Sprint 3** | Availability calendar + booking state machine + AI matching |
| **Sprint 4** | Payments & Escrow + Employer subsidy |
| **Sprint 5** | Verification system + Reviews + Notifications + Email |
| **Sprint 6** | Admin dashboard + i18n FR/AR + RTL + a11y |
| **Sprint 7** | Security hardening (PII/CIN docs) + performance + deploy → v0.1 ship |

---

## Auto-Handoff Protocol

| When | Auto-trigger |
|---|---|
| Backend/Frontend task DONE | → Tester |
| DB schema change planned | → DBA review, then Security Engineer before Backend |
| Anything touching money/escrow | → Payments Engineer + Test Architect |
| Anything touching auth, RBAC, PII, CIN docs | → Security Engineer **immediately** |
| Booking/availability logic | → Booking Engine Engineer |
| Verification workflow | → Verification Engineer, then Security |
| Tests PASS for sprint | → Deployment check |
| Sprint all-green | → Project Monitor: generate sprint snapshot |

### Handoff note format (log to `.claude/.logs/communications.md`)
```
HANDOFF: [From] → [To]
Task: [task]
Context: [1 sentence]
Need: [what next specialist must do]
Constraints: [decisions locked in]
```

---

## Specialist Skills

| Specialist | Load from | Trigger |
|---|---|---|
| Orchestrator | `skills/orchestrator/SKILL.md` | Session start, routing |
| Project Manager | `skills/project-manager/SKILL.md` | Scope, charter, PRD, risk |
| Scrum Master | `skills/scrum-master/SKILL.md` | Sprint planning, backlog |
| Tech Lead | `skills/tech-lead/SKILL.md` | Architecture, ADRs, stack |
| DBA | `skills/dba/SKILL.md` | Schema, migrations, Drizzle, RLS |
| Backend Dev | `skills/backend-dev/SKILL.md` | API routes, server actions |
| Frontend Dev | `skills/frontend-dev/SKILL.md` | All web pages, RTL |
| Booking Engine | `skills/booking-engine/SKILL.md` | State machine, calendar, slots |
| Payments Engineer | `skills/payments-engineer/SKILL.md` | Escrow, employer subsidy |
| Verification Engineer | `skills/verification-engineer/SKILL.md` | Doc upload, admin review, levels |
| Tester | `skills/tester/SKILL.md` | Vitest, Playwright |
| Test Architect | `skills/test-architect/SKILL.md` | Strategy, adversarial |
| Security Engineer | `skills/security-engineer/SKILL.md` | Auth, RBAC, PII, CIN docs |
| DevOps/DevSecOps | `skills/devops-devsecops/SKILL.md` | Docker, CI/CD, secrets |
| Deployment | `skills/deployment/SKILL.md` | Vercel + Docker Compose |
| UX Designer | `skills/ux-designer/SKILL.md` | Flows, wireframes, mobile-first |
| UI Designer | `skills/ui-designer/SKILL.md` | Terracotta/sage palette, RTL |
| Content Editor | `skills/content-editor/SKILL.md` | FR/AR copy, care terminology |
| Project Monitor | `skills/project-monitor/SKILL.md` | Logs, KPIs, sprint reports |

---

## Riaya-Specific Non-Negotiables

1. **CIN and background check documents are Category A PII** — private R2 bucket, signed URLs only (15-min expiry), admin-gated, every access audit-logged. ANY code path that could expose these without admin role or document owner role → STOP-the-line incident.
2. **Children's data (names, ages, special needs) is the most sensitive** — visible only to booking parties; never in logs, never in API responses not explicitly scoped.
3. **Money is integer centimes** — never a float. Escrow amounts stored, never recomputed.
4. **Booking state machine is strict** — no skipping states. Escrow transitions atomic with AuditLog.
5. **Employer subsidy is always capped** — family never pays more than (grossAmount - employerSubsidy). Subsidy cannot exceed grossAmount.
6. **Reviews before release** — escrow release requires both parties completing review OR 24h timeout. No bypass.
7. **Role is server-side** — never from client input.
8. **RTL is equal** — Arabic designed, not translated.
9. **Caregiver dignity** — UI/copy treats caregivers as professionals. No "servant" framing.
10. **Impact tracking** — every completed booking is logged as "jobs_enabled". Platform KPI tracks women's employment hours facilitated, not just GMV.

---

## YAGNI Gate

```
"Does Riaya v0.1 need this for the DoD (../CLAUDE.md §12)?"
  YES → Build it
  NO  → v0.2 backlog. Do not build, plan, or mention.
```

## 3-Option Pattern (always pick 🟡 BALANCED)

```
🟢 SIMPLE:        [fastest, maybe limited]
🟡 BALANCED:      [moderate effort, good tradeoffs] ← SELECTED (autonomous mode)
🔴 COMPREHENSIVE: [most robust, highest effort]
→ "Proceeding with 🟡 BALANCED approach: [description]"
```
