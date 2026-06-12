---
name: devops-devsecops
description: See Naql/.claude/skills/devops-devsecops/SKILL.md for full patterns. Riaya-specific adaptations below.
---
# Devops Devsecops — Riaya

## Riaya-Specific Context
- Stack: Next.js 15, PostgreSQL + pgvector + RLS, Auth.js v5, pg-boss, Resend, Cloudflare R2 (2 buckets: public + private)
- Four roles: family / caregiver / employer / admin
- Critical packages: booking (state machine), payments (escrow + employer subsidy), verification (CIN docs)
- CIN documents: private R2 bucket, signed URLs only, every access audit-logged
- Children's data: never in logs, never beyond booking parties scope
- Money: integer centimes (MAD), computeEscrowAmounts() in packages/payments

## Apply Naql Patterns
All patterns from Naql's devops-devsecops skill apply: withRole() wrapper, AuditLog on financial mutations,
Biome lint, Vitest, Playwright, Docker Compose with pgvector, GitHub Actions CI with pgvector/pgvector:pg16 image.

## Sprint Snapshot Format (project-monitor only)
```
### [date] SPRINT_SNAPSHOT — Sprint N
- Planned: N | Completed: N | Blocked: N
- Tests: [unit] / [E2E]
- Role isolation tests: PASS/FAIL
- CIN document access tests: PASS/FAIL
- Booking state machine tests: PASS/FAIL
- DoD items: N/22
```
