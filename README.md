# Riaya — رعاية

**Votre enfant en bonnes mains. Vous, libre de travailler.**
_Your child in safe hands. You, free to work._

Riaya is a three-sided childcare marketplace connecting Moroccan families with verified
caregivers — directly attacking the #1 structural barrier to female employment (HCP 2026:
19% female activity rate, 2.2% GDP lost annually, childcare access cited as primary barrier).

---

## The Problem We Solve

According to HCP 2026 data:
- Only **19% of Moroccan women** participate in the labor market (vs 69% men)
- The HCP identifies **childcare responsibility** as the primary structural barrier
- Women spend **5 hours/day** on domestic tasks vs < 1 hour for men
- Childcare services are urban-concentrated and **unaffordable** for most households
- **2.2% of GDP** is lost annually due to female economic exclusion

Every booking on Riaya is a macro-economic act.

---

## Quick Start (Development)

### Prerequisites
- Node.js >= 20, pnpm >= 9, Docker + Docker Compose

```bash
git clone https://github.com/your-org/riaya.git && cd riaya
cp .env.example .env   # fill in AUTH_SECRET, R2 keys, etc.
pnpm install
docker compose up -d postgres
pnpm db:migrate
pnpm db:seed
pnpm dev   # http://localhost:3000
```

### Demo Credentials
| Role | Email | Password |
|---|---|---|
| Family | sara@demo.riaya.ma | demo1234 |
| Caregiver (certified) | fatima@demo.riaya.ma | demo1234 |
| Employer (HR) | drh@demo-corp.riaya.ma | demo1234 |

---

## Architecture

```
riaya/
├── apps/web/            Next.js 15 App Router
│   ├── (public)/        Caregiver search + profiles (SSR, no auth)
│   ├── (family)/        Family booking dashboard
│   ├── (caregiver)/     Caregiver management + verification
│   ├── (employer)/      HR benefit management
│   └── (admin)/         Admin verification + disputes + KPIs
└── packages/
    ├── core/            Money type, RBAC, Zod schemas
    ├── db/              Drizzle schema + migrations + RLS
    ├── booking/         Booking state machine + availability
    ├── payments/        Escrow state machine + CMI adapter
    ├── matching/        pgvector caregiver search
    ├── verification/    CIN/document workflow + level computation
    └── notifications/   In-app + Resend email
```

Stack: Next.js 15, TypeScript strict, Tailwind v4, PostgreSQL 16 + pgvector + RLS,
Auth.js v5 (Argon2id + Google OAuth), pg-boss, Resend, Cloudflare R2 (2 buckets)

---

## Security Model

- **Role isolation**: 4 roles (family/caregiver/employer/admin), RLS-enforced
- **CIN documents**: Private R2 bucket. Signed URLs only (15-min expiry). Admin or document owner only. Every access audit-logged.
- **Children's data**: Never in logs, never beyond booking parties scope
- **Escrow**: DB-level state machine. No money moves without AuditLog in same transaction
- **Money**: Integer centimes (Money branded type). No floats anywhere

---

## Key Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm test` | Run Vitest suite |
| `pnpm lint` | Biome lint check |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:seed` | Load demo data |

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres (RLS-bound app role) |
| `AUTH_SECRET` | 32-byte random (openssl rand -hex 32) |
| `GOOGLE_CLIENT_ID` | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `RESEND_API_KEY` | Transactional email |
| `R2_PUBLIC_*` | Cloudflare R2 public bucket (profile photos) |
| `R2_PRIVATE_*` | Cloudflare R2 **private** bucket (CIN, documents) |
| `PAYMENT_GATEWAY` | `mock` (dev) or `cmi` (prod) |

---

## Impact Tracking

Beyond GMV, Riaya tracks a unique KPI: **women's employment hours facilitated** —
the number of hours families were able to work because a Riaya booking was active.
This is reported to platform stakeholders and potential government/NGO partners.

---

v0.1 — Built with Claude Code · Powered by HCP 2026 data
