---
name: content-editor
description: FR/AR bilingual content for Riaya. Trigger on: "translation", "i18n", "fr.json", "ar.json", "copy", "label".
---
# Content Editor — Riaya

## Voice
- **For families**: Warm, reassuring. "En bonnes mains" — safety first.
- **For caregivers**: Respectful, professional. "Professionnelle de la petite enfance" not "bonne".
- **For employers**: Business-clear. "Avantage garde d'enfants" — measurable benefit.
- **Morocco-aware**: Use "daya" (not "nourrice" as default), Moroccan city names, MAD.

## Key strings (fr.json)

```json
{
  "nav": {
    "search": "Trouver une garde", "becomeCaregiver": "Proposer mes services",
    "forEmployers": "Pour les employeurs", "dashboard": "Tableau de bord",
    "bookings": "Mes réservations", "availability": "Mes disponibilités",
    "earnings": "Mes revenus", "verification": "Ma vérification"
  },
  "careType": {
    "daya": "Daya (garde à domicile)",
    "nanny": "Nourrice (à votre domicile)",
    "after_school": "Garde parascolaire",
    "nursery_assistant": "Assistante de crèche",
    "babysitter": "Baby-sitter (ponctuel)"
  },
  "verification": {
    "unverified": "Non vérifiée",
    "id_checked": "Vérification en cours",
    "cin_verified": "Identité vérifiée ✓",
    "background_cleared": "Casier judiciaire vérifié ✓",
    "certified": "Certifiée ⭐",
    "uploadCin": "Télécharger ma CIN",
    "uploadPolice": "Télécharger mon extrait de casier judiciaire",
    "uploadHealth": "Télécharger mon certificat médical",
    "consentText": "J'accepte que Riaya vérifie ces documents pour assurer la sécurité des familles.",
    "pendingReview": "En cours d'examen par notre équipe (24-48h)",
    "approved": "Approuvé ✓",
    "rejected": "Non approuvé — {reason}"
  },
  "booking": {
    "status": {
      "requested": "En attente de confirmation",
      "confirmed": "Confirmée ✓",
      "in_progress": "Session en cours",
      "completed": "Terminée",
      "cancelled": "Annulée",
      "disputed": "En litige"
    },
    "request": "Réserver",
    "accept": "Accepter",
    "decline": "Décliner",
    "startSession": "Démarrer la session",
    "endSession": "Terminer la session",
    "cancelBooking": "Annuler la réservation"
  },
  "payment": {
    "grossAmount": "Montant de la garde",
    "platformFee": "Frais de service (12%)",
    "employerSubsidy": "Prise en charge employeur",
    "youPay": "Vous payez",
    "caregiverEarns": "Vos gains nets",
    "escrowProtected": "Paiement sécurisé par escrow",
    "payoutPending": "Versement en attente (24h)",
    "payoutReleased": "Paiement versé ✓"
  },
  "trust": {
    "verifiedCaregiver": "Garde vérifiée",
    "escrowProtected": "Paiement sécurisé",
    "reviewsRequired": "Avis obligatoires avant paiement",
    "childSafety": "Sécurité enfant · Notre priorité absolue"
  },
  "employer": {
    "benefit": "Avantage garde d'enfants",
    "monthlyBudget": "Budget mensuel par employée",
    "enrollEmployee": "Inscrire une employée",
    "monthlyInvoice": "Facture mensuelle",
    "totalSubsidized": "Total subventionné ce mois"
  }
}
```

## Arabic (ar.json) — key strings
```json
{
  "nav": {
    "search": "البحث عن حاضنة", "becomeCaregiver": "تقديم خدماتي",
    "dashboard": "لوحة التحكم", "bookings": "حجوزاتي",
    "earnings": "أرباحي", "verification": "توثيقي"
  },
  "careType": {
    "daya": "داية (رعاية في المنزل)",
    "nanny": "حاضنة (في منزلكم)",
    "after_school": "رعاية ما بعد المدرسة",
    "babysitter": "جليسة أطفال (مؤقتة)"
  },
  "verification": {
    "unverified": "غير موثقة",
    "cin_verified": "الهوية موثقة ✓",
    "certified": "معتمدة ⭐"
  },
  "booking": {
    "status": {
      "requested": "في انتظار التأكيد", "confirmed": "مؤكدة ✓",
      "in_progress": "الجلسة جارية", "completed": "مكتملة"
    },
    "request": "احجز الآن"
  }
}
```

## Rules
- "Daya" is the preferred term for home-based caregiver (culturally correct in Morocco)
- Never use "bonne" — it's demeaning; Riaya treats caregivers as professionals
- Children always referred to with dignity — no clinical or objectifying language
- Consent text for document upload must be explicit and clear in both languages
