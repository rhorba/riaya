---
name: ux-designer
description: UX flows and wireframes. Mobile-first. Trigger on: "user flow", "wireframe", "UX", "screen design", "navigation".
---
# UX Designer — Riaya

## UX Principles (CLAUDE.md §10)
1. Safety first — verification badges are hero element
2. Search in under 30 seconds from landing
3. Morocco-aware — neighborhoods, Arabic names, local care culture
4. Mother's peace of mind throughout
5. Caregiver dignity — professional framing
6. Employer simplicity — < 10 min setup
7. RTL equal; works on 3G

## Landing Page Wireframe
```
┌──────────────────────────────────────────────────────────────┐
│  riaya.ma          [Je suis parent] [Je suis daya] [Connexion]│
│────────────────────────────────────────────────────────────── │
│  Votre enfant en bonnes mains.                               │
│  Vous, libre de travailler.                                  │
│  [Trouver une garde] ← primary CTA                           │
│────────────────────────────────────────────────────────────── │
│  19% taux d'activité féminin · 2.2% PIB perdu · HCP 2026    │
│  [Daya] [Nourrice] [Après-école] [Baby-sitter]               │
│────────────────────────────────────────────────────────────── │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │ Fatima ⭐  │ │ Khadija ✓  │ │ Amina ✓    │               │
│  │ Certifiée  │ │ CIN vérifié│ │ CIN vérifié│               │
│  │ 60 MAD/h   │ │ 50 MAD/h   │ │ 45 MAD/h   │               │
│  └────────────┘ └────────────┘ └────────────┘               │
└──────────────────────────────────────────────────────────────┘
```

## Family Booking Flow
```
Search (type + neighborhood + date/time) → Results (sorted by: verified first, rating)
  → Caregiver profile (bio + verification + reviews + calendar) → [Réserver]
  → Date/time picker → Duration → Children count → Notes
  → Price summary: [Garde: 200 MAD] [Frais: 24 MAD] [Votre employeur: -100 MAD] [Vous payez: 124 MAD]
  → Payment → Confirmation email → Session in-progress tracker
  → Session end → Review prompt → Payout released
```

## Caregiver Onboarding Flow
```
Sign up → "Je propose de la garde" → 
  Care types (checkbox: daya/nourrice/après-école) →
  City + neighborhoods →
  Rates (hourly/daily/monthly) →
  Min/max age served →
  Profile photo →
  [Commencer à recevoir des demandes]
  → Dashboard: "Complétez votre vérification pour apparaître en tête de recherche"
```

## Empty States
- No caregivers found: "Aucune garde disponible dans ce quartier. [Étendre la recherche] [S'inscrire comme daya]"
- Caregiver: no bookings yet: "Votre profil est prêt. Partagez votre lien pour attirer vos premiers clients."

## Handoff Points
- **→ UI Designer**: wireframes for visual treatment
- **→ Frontend Dev**: flows + screen specs
