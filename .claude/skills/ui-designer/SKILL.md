---
name: ui-designer
description: Design tokens, terracotta/sage palette, warmth, RTL. Trigger on: "design tokens", "colors", "typography", "visual design", "theme".
---
# UI Designer — Riaya

## Design Direction
**Concept**: Warm, safe, Moroccan-maternal. Terracotta + cream + sage green.
Zellige-inspired subtle geometry. Verification badges are the hero element.
NOT: cold blue fintech, NOT: generic pink "mom app".

## Design Tokens (Tailwind v4)

```css
@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600&family=Noto+Kufi+Arabic:wght@400;500;600&display=swap');

@theme {
  /* PRIMARY — warm terracotta (trust, Moroccan culture) */
  --color-primary:      oklch(0.52 0.12 40);    /* #C1613A terracotta */
  --color-primary-mid:  oklch(0.62 0.10 40);    /* lighter terracotta */
  --color-primary-fg:   oklch(0.98 0 0);
  /* SECONDARY — sage green (safety, care, growth) */
  --color-secondary:    oklch(0.55 0.09 150);   /* #4A7C6A sage */
  --color-secondary-fg: oklch(0.98 0 0);
  /* NEUTRAL */
  --color-bg:           oklch(0.99 0.005 60);   /* warm cream */
  --color-surface:      oklch(1.00 0 0);
  --color-border:       oklch(0.90 0.01 60);
  --color-foreground:   oklch(0.20 0.02 50);
  --color-muted:        oklch(0.55 0.01 50);
  /* SEMANTIC */
  --color-ok:           oklch(0.55 0.09 150);   /* certified / confirmed */
  --color-warn:         oklch(0.72 0.14 75);    /* pending verification */
  --color-danger:       oklch(0.52 0.20 25);    /* urgent / disputed */
  --color-info:         oklch(0.55 0.12 250);   /* cin_verified */
  /* TYPOGRAPHY */
  --font-display: "Lora", Georgia, serif;          /* warm, trustworthy headings */
  --font-body:    "Plus Jakarta Sans", sans-serif; /* readable body */
  --font-arabic:  "Noto Kufi Arabic", "Tahoma", sans-serif;
  --radius-card:  0.875rem;
}
```

## Verification Badge Colors
```
unverified:        gray pill "Non vérifié"
id_checked:        amber pill "Vérification en cours ⏳"
cin_verified:      blue pill "Identité vérifiée ✓"
background_cleared: sage green pill "Casier vérifié ✓"
certified:         rich terracotta pill with star "Certifiée ⭐"
```

## Component Specs
- **Caregiver card**: photo (circle), name, care types, city, price/hr, verification badge (prominent), star rating, "Réserver" CTA button
- **Booking status bar**: horizontal step tracker visible throughout booking lifecycle
- **Session tracker**: large clock + caregiver avatar when in_progress — family sees this live
- **Employer benefit badge**: green "Votre employeur couvre X MAD" shown at checkout

## Handoff Points
- **← UX Designer**: wireframes
- **→ Frontend Dev / Content Editor**: tokens + component specs
