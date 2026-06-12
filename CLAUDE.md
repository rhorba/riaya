# Riaya — رعاية — Claude Code Project Bible

> This is the root business document. All specialists read this first.
> `.claude/CLAUDE.md` governs HOW the team works.
>
> **Riaya** (رعاية — "care/welfare") is a three-sided platform connecting Moroccan
> families with affordable, verified childcare — directly attacking the #1 structural
> barrier to female employment in Morocco.

---

## §1 — The Problem (grounded in HCP 2026 data)

Morocco's gender employment gap is one of the worst globally:
- **19% female activity rate** vs 69% male — a 50-point gap (HCP 2023/2026)
- **4 women out of 5** of working age are economically inactive
- HCP identifies **childcare responsibilities** as the primary structural barrier:
  women spend an average of **5 hours/day** on domestic tasks vs < 1 hour for men
- Childcare services are **concentrated in urban areas** and **prohibitively expensive**
  for middle/low-income households
- Cost to Morocco's economy: **2.2% of GDP annually** in unrealized female participation
- Preschool enrollment reached 70% in 2025 — demand exists, supply is the gap

**Riaya's thesis**: Remove the childcare barrier → women can enter/return to work →
GDP grows + families are stronger. Every booking on Riaya is a macro-economic act.

---

## §2 — Project Identity

**Name**: Riaya
**Domain**: riaya.ma
**Tagline (FR)**: "Votre enfant en bonnes mains. Vous, libre de travailler."
**Tagline (AR)**: "طفلك في أيدٍ أمينة. وأنتِ حرة للعمل."
**Type**: Three-sided marketplace SaaS (Families + Caregivers + Employers).
**Audience**:
  - **Families**: Moroccan mothers (and fathers) who need reliable, affordable
    childcare to work, study, or run their business.
  - **Caregivers**: Women offering childcare services (dayas, nannies, after-school
    tutors, nursery assistants) seeking to formalize their income.
  - **Employers**: Companies wanting to offer childcare benefits to retain female
    talent and reduce absenteeism.
  - **Platform Admin**: Internal — verifications, disputes, KPIs.
**Language**: French primary (`fr`), Arabic secondary (`ar`, RTL). English (`en`) optional.
**Tone**: Warm, trustworthy, empowering. Safety is the #1 signal. Not corporate.

### Positioning
> "Not a classifieds site. Not a daycare directory. A verified, bookable, insured
> childcare marketplace — built for Morocco's working mothers."

---

## §3 — Core Features (v0.1 scope)

### Module A — Caregiver Profiles
- Registration: name, city, type of care offered, languages, bio, photo
- Care types: **daya** (home-based), **nanny** (at family's home), **after-school tutor**,
  **nursery assistant** (works at registered nursery), **babysitter** (occasional)
- Hourly/daily/monthly rates (MAD)
- Availability calendar: set available slots per day/week
- Verification level: **Unverified → ID Checked → CIN Verified → Background Cleared → Certified**
- Documents: CIN scan, health certificate, reference letters, certificates
- Portfolio: photos of work environment (for dayas), testimonials
- Reviews + ratings from completed bookings
- Response rate + punctuality score

### Module B — Family Profiles
- Registration: parents' names, children (age, special needs notes), address/neighborhood
- Booking history + reviews left
- Saved caregivers list
- Payment methods on file

### Module C — Employer Accounts
- Company profile + HR contact
- Childcare benefit budget (MAD/employee/month)
- Employee enrollment: add employees to the benefit program
- Usage tracking: how many employees booked, total subsidy disbursed
- Invoice generation (Moroccan-compliant, monthly)
- This is Riaya's B2B revenue lever — higher value, more predictable

### Module D — Booking System
- Search + filter: by care type, city/neighborhood, price range, availability, verification level
- Booking request: pick caregiver → select date/time/duration → add notes
- Caregiver accepts/declines (with reason)
- Recurring booking: daily/weekly repeat with one request
- Booking states: requested → confirmed → in_progress → completed → cancelled
- Location: family's home, caregiver's home, or agreed location
- Last-minute bookings (urgent flag)

### Module E — Payments & Escrow
- Family pre-authorizes payment at booking confirmation
- Escrow holds until booking completed (caregiver confirms end of session)
- Platform fee: 12% from family + 8% from caregiver (negotiable in v0.2 per tier)
- Employer subsidy: employer contribution auto-deducted from benefit budget; family pays remainder
- Payout to caregiver: after session confirmed + 24h dispute window
- Cancellation policy: configurable per caregiver (free / fee if < X hours)
- Invoice: generated per completed booking for family + employer

### Module F — Safety & Verification
- **CIN verification**: ID number cross-checked (mock API in dev, real Ministère in prod)
- **Background check**: police clearance certificate upload + admin review
- **References**: past employer/client contacts, admin-verified
- **Health certificate**: annual, admin-reviewed
- **In-progress safety**: family can mark session started/ended; caregiver confirms
- **Incident reporting**: family or caregiver can flag an issue → admin queue
- **Insurance (v0.2)**: Riaya accident insurance for bookings (RMA Watanya partnership)

### Module G — Reviews & Trust
- Mutual reviews post-completion (family reviews caregiver + caregiver reviews family)
- Reviews are mandatory before payment released
- Review feeds verification level progression
- Response rate + punctuality tracked automatically

### Module H — Notifications
- In-app: booking request, confirmation, reminder 1h before, session ended, payment released
- Email (Resend): welcome, booking confirmation, payout receipt, review request
- SMS (v0.2): booking reminders + alerts via Infobip

### Module I — Admin Dashboard
- Verification queue: CIN + background check + health cert review
- Dispute resolution queue
- Escrow health monitor
- Platform KPIs: GMV, active bookings, caregivers enrolled, employers signed
- Employer account management

### Cross-cutting (v0.1, non-negotiable)
- **Auth + RBAC** (family / caregiver / employer / admin)
- **Bilingual FR/AR with RTL**
- **Moroccan payment rails** (CMI/HPS)
- Audit log on all financial mutations
- Demo seed for instant onboarding

---

## §4 — Out of Scope (v0.1)

| Deferred | Feature |
|---|---|
| **v0.2** | Native mobile app (React Native) — web-first for v0.1 |
| **v0.2** | SMS notifications (Infobip) |
| **v0.2** | Real-time CIN verification via Ministère API |
| **v0.2** | Riaya accident insurance integration (RMA Watanya) |
| **v0.2** | Video caregiver interviews / proctored background check |
| **v0.2** | Recurring booking with calendar sync (iCal/Google) |
| **v0.2** | GPS check-in / check-out confirmation |
| **v0.3** | Nursery/crèche institutional accounts |
| **v0.3** | Government subsidy integration (AMO Daman) |
| **out** | Babysitting agency franchise model, adult care, pet care |

---

## §5 — Tech Stack (FINAL)

| Concern | Choice | Why |
|---|---|---|
| Web | Next.js 15 App Router, TypeScript strict | SSR for caregiver discovery SEO |
| Styling | Tailwind v4 + shadcn/ui | |
| DB | PostgreSQL 16 + Drizzle ORM + RLS | Relational, RLS for role isolation |
| Auth | Auth.js v5 (email+password + Google OAuth) | |
| Money | Integer centimes (MAD) via `Money` type | Never floats |
| Booking state machine | DB-level in `packages/booking` | Safe, auditable |
| Payments | CMI adapter + Escrow state machine in `packages/payments` | |
| Matching | pgvector (caregiver skill/location embeddings) in `packages/matching` | |
| Calendar/availability | DB-level time slots + `packages/booking` | No external calendar in v0.1 |
| Jobs | pg-boss (reminder sweeps, payout sweeps, email digests) | |
| Email | Resend via `packages/notifications` | |
| File storage | Cloudflare R2 (CIN scans, certificates, photos — private bucket) | |
| i18n | next-intl (fr/ar/en), RTL mandatory | |
| Testing | Vitest + Playwright | |
| Container | Docker Compose (postgres + web + worker + caddy) | |
| PM | pnpm workspaces | |
| Linting | Biome | |
| CI | GitHub Actions | |

> **CRITICAL**: CIN scans and background check documents are **highly sensitive PII**.
> They are stored in a **private** R2 bucket, served only via signed URLs, accessible
> only to admin role + the document owner. Never publicly accessible.

---

## §6 — Data Model (core entities)

```typescript
// packages/core/src/types.ts

type Money = number  // integer centimes (MAD). 1 dirham = 100. NEVER a float.

type Role = 'family' | 'caregiver' | 'employer' | 'admin'

type CareType = 'daya' | 'nanny' | 'after_school' | 'nursery_assistant' | 'babysitter'

type VerificationLevel =
  | 'unverified'      // just signed up
  | 'id_checked'      // CIN uploaded, pending review
  | 'cin_verified'    // CIN confirmed by admin
  | 'background_cleared'  // police clearance confirmed
  | 'certified'       // full package: CIN + background + health cert + references

type BookingStatus =
  | 'requested'     // family requests, caregiver not yet responded
  | 'confirmed'     // caregiver accepted, payment pre-authorized
  | 'in_progress'   // session actively underway
  | 'completed'     // session ended, pending reviews
  | 'cancelled'     // cancelled by either party
  | 'disputed'      // dispute raised, escrow held

type User = {
  id: string; email: string; name: string; role: Role
  phone?: string; city?: string; avatarUrl?: string
  isActive: boolean; emailVerified: boolean; createdAt: Date
}

type CaregiverProfile = {
  id: string; userId: string
  bio?: string; careTypes: CareType[]
  cities: string[]                  // neighborhoods served
  languages: string[]
  hourlyRate?: Money; dailyRate?: Money; monthlyRate?: Money
  minAgeMonths?: number; maxAgeYears?: number    // age range served
  maxChildren: number               // how many children at once
  hasOwnSpace: boolean              // daya has home workspace
  verificationLevel: VerificationLevel
  documents: VerificationDocument[]
  avgRating: number                 // 0–500 (x100)
  reviewCount: number
  completedBookings: number
  responseRate: number              // 0–100
  punctualityScore: number          // 0–100
  skillVector?: number[]            // pgvector: care experience embedding
  createdAt: Date; updatedAt: Date
}

type VerificationDocument = {
  id: string; caregiverId: string
  type: 'cin' | 'health_cert' | 'police_clearance' | 'reference' | 'certificate'
  fileUrl: string                   // signed R2 URL — PRIVATE bucket
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  expiresAt?: Date
  adminNote?: string
  uploadedAt: Date; reviewedAt?: Date
}

type FamilyProfile = {
  id: string; userId: string
  address?: string; neighborhood?: string; city: string
  children: ChildRecord[]
  savedCaregiverIds: string[]
  createdAt: Date
}

type ChildRecord = {
  id: string; name: string
  ageMonths: number
  specialNeeds?: string             // allergies, conditions — sensitive PII
}

type EmployerAccount = {
  id: string; userId: string
  companyName: string; ice?: string; sector?: string
  benefitBudgetPerEmployee: Money   // monthly subsidy per enrolled employee
  enrolledEmployees: EnrolledEmployee[]
  totalBudgetUsed: Money
  createdAt: Date
}

type EnrolledEmployee = {
  id: string; employerAccountId: string
  employeeEmail: string; employeeName: string
  monthlyBenefit: Money
  userId?: string                   // linked to family user if they signed up
  active: boolean
}

type Booking = {
  id: string
  caregiverId: string; familyId: string
  employerAccountId?: string        // set if employer subsidy applies
  careType: CareType
  startTime: Date; endTime: Date
  locationNote?: string
  childrenCount: number
  status: BookingStatus
  familyNotes?: string
  cancelReason?: string
  urgent: boolean
  createdAt: Date; updatedAt: Date
}

type Escrow = {
  id: string; bookingId: string
  familyId: string; caregiverId: string
  grossAmount: Money                // total family owes
  employerSubsidy: Money            // employer contribution (0 if no benefit)
  familyPays: Money                 // grossAmount - employerSubsidy
  platformFeeFromFamily: Money      // 12%
  platformFeeFromCaregiver: Money   // 8%
  caregiverPayout: Money            // grossAmount - platformFeeFromCaregiver
  status: 'pending' | 'authorized' | 'captured' | 'released' | 'refunded' | 'disputed'
  gatewayRef?: string
  authorizedAt?: Date; capturedAt?: Date
  releasedAt?: Date; disputeWindowEndsAt?: Date
  createdAt: Date
}

type AvailabilitySlot = {
  id: string; caregiverId: string
  dayOfWeek?: number                // 0-6 for recurring
  date?: Date                       // specific date override
  startTime: string                 // "08:00"
  endTime: string                   // "18:00"
  available: boolean
}

type Review = {
  id: string; bookingId: string
  reviewerId: string; revieweeId: string
  rating: number                    // 1–5
  comment?: string
  reviewerRole: 'family' | 'caregiver'
  createdAt: Date
}

type AuditLog = {
  id: string; actorUserId: string
  entity: string; entityId: string
  action: 'create' | 'update' | 'cancel' | 'verify' | 'release' | 'dispute' | 'refund'
  before?: unknown; after?: unknown; at: Date
}
```

---

## §7 — Roles & Permissions

| Capability | family | caregiver | employer | admin |
|---|---|---|---|---|
| Create / edit own profile | ✅ | ✅ | ✅ | — |
| Search caregivers (public) | ✅ | read | ✅ | ✅ |
| Request booking | ✅ | — | — | ✅ |
| Accept / decline booking | — | ✅ | — | ✅ |
| View booking details | own | own | own employees' | ✅ |
| Pre-authorize payment | ✅ | — | ✅ (subsidy) | ✅ |
| Confirm session end | ✅ + ✓ | ✅ | — | ✅ |
| Release escrow | — | — | — | auto/admin |
| Leave review | ✅ (post-booking) | ✅ (post-booking) | — | — |
| Upload verification docs | — | ✅ | — | — |
| Review/approve docs | — | — | — | ✅ |
| Manage employer benefits | — | — | ✅ | ✅ |
| Resolve disputes | — | — | — | ✅ |
| View platform KPIs | — | — | own | ✅ |

---

## §8 — Seed / Demo Data

- 8 caregiver profiles across all care types (2 certified, 3 cin_verified, 2 id_checked, 1 unverified)
  — cities: Casablanca, Rabat, Marrakech, Fès
- 4 family profiles with children (different ages, one with special needs note)
- 2 employer accounts (1 manufacturing company, 1 bank) with enrolled employees
- 10 bookings across statuses (3 completed with reviews + escrow released, 2 confirmed, 2 requested, 1 disputed)
- Demo: family: sara@demo.riaya.ma / demo1234 (Casablanca, 2 children)
- Demo: caregiver: fatima@demo.riaya.ma / demo1234 (certified daya, Casablanca)
- Demo: employer: drh@demo-corp.riaya.ma / demo1234

---

## §9 — Design Identity

- **Aesthetic**: Warm, safe, maternal. Terracotta + cream + sage green. Zellige-inspired
  geometry as subtle texture. Nothing clinical or corporate.
- **Colors**: Warm terracotta primary (trust, Moroccan culture), sage green secondary
  (safety, growth), cream/off-white surfaces. Red only for urgent/danger signals.
- **Typography**: "Lora" (serif) for headings — warmth, trustworthiness. "Plus Jakarta Sans"
  for body — readable, friendly. "Noto Kufi Arabic" for AR.
- **Imagery**: Authentic Moroccan family photography, not stock photos of generic white families.
- **Verification badges**: Prominent, color-coded by level. Safety is the hero signal.
- **Mobile-first**: Primary users (mothers) are mostly on phones. 375px first.

---

## §10 — UX Principles

1. **Safety first** — verification badges are the biggest design element on caregiver cards
2. **Search in under 30 seconds** — from landing to results with no account required
3. **Morocco-aware** — neighborhoods (not just cities), Arabic names normalized, local care culture respected
4. **Mother's peace of mind** — session tracker, confirmation, review = visible throughout
5. **Caregiver dignity** — caregivers are professionals, not servants. UX reflects this.
6. **Employer simplicity** — HR should set up benefits in < 10 minutes
7. **RTL is equal** — Arabic is designed, not translated
8. **Works on 3G** — target users are often on mobile data

---

## §11 — Legal, Privacy & Financial Integrity

1. **CIN / police clearance are Category A PII** (Law 09-08). Encrypted at rest in private
   R2 bucket. Served only via short-lived signed URLs. Accessible only to admin + document owner.
   Access audit-logged on every read.
2. **Children's data** (names, ages, special needs) is the most sensitive data on the platform.
   Visible only to the booking parties. Never indexed, never in logs.
3. **Escrow safety**: funds held until both parties confirm session end + 24h dispute window.
   State machine is strict; no shortcuts.
4. **Invoice compliance**: family and employer invoices include ICE (if employer), TVA if applicable.
5. **CNSS for caregivers (forward-looking)**: Riaya's long-term social mission is to formalize
   domestic workers. v0.2 will offer CNSS enrollment assistance. Model the data now.
6. **No data sold, ever.** Family children's data especially — this is non-negotiable.
7. **Caregiver consent**: background check upload requires explicit consent; stored with timestamp.

---

## §12 — Definition of Done (v0.1 — 22 items)

- [ ] Auth: signup/login for family + caregiver + employer + admin; email verification
- [ ] Caregiver profile: create, edit, care types, rates, availability calendar
- [ ] Family profile: create, edit, children records
- [ ] Employer account: create, add employees, set benefit budget
- [ ] Caregiver search: public, filterable by type/city/price/verification (SSR + SEO)
- [ ] Caregiver public profile page (SSR)
- [ ] Booking request: family → caregiver with date/time/duration/notes
- [ ] Booking accept/decline by caregiver
- [ ] Booking state machine: requested → confirmed → in_progress → completed
- [ ] Availability calendar: caregiver sets slots; booking checks against slots
- [ ] Payments & escrow: pre-authorize on confirm, capture on start, release post-review
- [ ] Employer subsidy: deducted from booking amount; employer invoiced monthly
- [ ] Reviews: mutual mandatory post-completion; feed rating + verification level
- [ ] Verification document upload (caregiver): CIN, health cert, police clearance
- [ ] Admin verification queue: approve/reject documents → update verification level
- [ ] Incident reporting + dispute queue (admin)
- [ ] Notifications: in-app for all key events
- [ ] Email: welcome, booking confirmation, payout receipt, review request (Resend)
- [ ] Money stored as integer centimes everywhere; formatted on display
- [ ] Audit log on all financial mutations
- [ ] French fully translated; Arabic fully translated + RTL correct
- [ ] `pnpm build` passes, zero TS errors; `pnpm test` all green; `pnpm lint` clean
- [ ] Demo seed loads; new user sees populated marketplace
- [ ] Deploy: Vercel + managed Postgres OR `docker compose up -d` end-to-end

---

## §13 — Sprint Roadmap

| Sprint | Goal |
|---|---|
| **Sprint 0** | Scaffold: monorepo, Postgres+Drizzle+RLS, Auth.js (email + Google), Docker, CI |
| **Sprint 1** | Data model + RBAC + Caregiver & Family profiles + Employer accounts + demo seed |
| **Sprint 2** | Caregiver search (public SSR) + booking system (request → confirm → complete) |
| **Sprint 3** | Availability calendar + booking state machine + AI matching |
| **Sprint 4** | Payments & Escrow + Employer subsidy |
| **Sprint 5** | Verification system (docs upload + admin queue) + Reviews + Notifications + Email |
| **Sprint 6** | Admin dashboard + i18n FR/AR complete + RTL + a11y |
| **Sprint 7** | Security hardening (PII, CIN docs, escrow) + performance + deploy → v0.1 ship |

---

## §14 — Repository Structure

```
riaya/
├── CLAUDE.md                         ← this file
├── .claude/                          ← AI team config
├── apps/
│   └── web/                          ← Next.js 15
│       └── src/app/
│           ├── [locale]/(public)/    ← caregiver search + profiles (SSR, no auth)
│           ├── [locale]/(family)/    ← family dashboard
│           ├── [locale]/(caregiver)/ ← caregiver dashboard
│           ├── [locale]/(employer)/  ← employer HR dashboard
│           └── [locale]/(admin)/     ← admin dashboard
├── packages/
│   ├── core/       ← Money, Role, RBAC, Zod schemas
│   ├── db/         ← Drizzle schema, migrations, RLS, seed
│   ├── booking/    ← booking state machine + availability logic
│   ├── payments/   ← escrow state machine + CMI adapter
│   ├── matching/   ← pgvector caregiver matching
│   ├── verification/ ← document workflow + level computation
│   └── notifications/ ← in-app + Resend email
├── docker-compose.yml
└── .env.example
```

---

## §15 — Auth & Access Model

- **Auth.js v5**: email+password (Argon2id) + Google OAuth
- Session: `{ userId, role }` — role server-side only, never from client
- Four roles: family / caregiver / employer / admin
- `withRole(session, allowedRoles, handler)` server action factory
- CIN/document signed URLs generated server-side with 15-minute expiry; admin-gated
- Admin accounts provisioned via seed or direct DB only — no self-promotion endpoint
