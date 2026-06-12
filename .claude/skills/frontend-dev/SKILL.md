---
name: frontend-dev
description: All web pages — public caregiver search, booking flow, dashboards, RTL. Trigger on: "component", "page", "dashboard", "form", "UI", "RTL", "search", or any web interface work.
---
# Frontend Developer — Riaya

## Page Architecture

```
Public (SSR, no auth):
  /                   → Landing: hero + stats (HCP data) + CTA + featured caregivers
  /search             → Caregiver search (filter by type/city/price/verification)
  /caregivers/[id]    → Public caregiver profile + availability + reviews + booking CTA

Family Dashboard (/[locale]/family/):
  /dashboard          → upcoming bookings, recent activity, saved caregivers
  /bookings           → booking history + status
  /bookings/[id]      → booking detail + session tracker + review
  /profile            → family profile + children management
  /payments           → payment history

Caregiver Dashboard (/[locale]/caregiver/):
  /dashboard          → booking requests, upcoming sessions, earnings, verification status
  /bookings           → booking list + accept/decline
  /availability       → availability calendar editor
  /profile            → profile edit, rates, care types
  /verification       → document upload + status tracker
  /earnings           → payout history

Employer Dashboard (/[locale]/employer/):
  /dashboard          → employees enrolled, benefit usage, monthly spend
  /employees          → manage enrolled employees
  /invoices           → monthly invoices
  /profile            → company profile

Admin (/[locale]/admin/):
  /dashboard          → KPIs + pending queue counts
  /verifications      → document review queue
  /disputes           → dispute resolution
  /escrow             → escrow health
  /users              → user management
```

## Key UI Components

### Verification Badge (the most important component)
```tsx
// Prominent on every caregiver card + profile header
<VerificationBadge level={caregiver.verificationLevel} />
// unverified: gray "Non vérifié"
// id_checked: amber "Vérification en cours"
// cin_verified: blue "Identité vérifiée ✓"
// background_cleared: green "Casier vérifié ✓"
// certified: green star "Certifiée ⭐"
```

### Booking Flow (mobile-first)
```
Search → Card → Profile → [Réserver] → Date/Time picker → Duration → Notes
→ Price summary (family pays = gross + 12% fee - employer subsidy) → Confirm → 
Payment auth → Confirmation page
```

### RTL (MANDATORY)
```tsx
<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
// Logical Tailwind only: text-start · ms-* · me-* · ps-* · pe-*
```

### Mobile-first
Primary users are mothers on phones. All forms at 375px first. Calendar widget touch-friendly.

## Handoff Points
- **← Backend Dev**: server-action contracts
- **← UX Designer**: wireframes
- **← UI Designer**: terracotta/sage tokens
- **← Booking Engine**: booking form + state display contracts
- **→ Tester**: components + E2E critical paths
