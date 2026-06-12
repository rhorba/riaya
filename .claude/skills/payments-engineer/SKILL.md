---
name: payments-engineer
description: Escrow, employer subsidy, payout, CMI adapter. Trigger on: "payment", "escrow", "payout", "subsidy", "fee", "CMI", "refund", "dispute", "money", "MAD".
---
# Payments Engineer — Riaya

## Money Type (same as Naql/Mahara)
```typescript
type Money = number // integer centimes. NEVER a float.
```

## Fee Structure
```typescript
export function computeEscrowAmounts(
  grossAmount: Money,        // booking amount
  employerSubsidy: Money,    // 0 if no employer benefit
  config = { familyFeeRate: 0.12, caregiverFeeRate: 0.08 }
): EscrowAmounts {
  const platformFeeFromFamily    = Money.mul(grossAmount, config.familyFeeRate)
  const platformFeeFromCaregiver = Money.mul(grossAmount, config.caregiverFeeRate)
  const caregiverPayout          = Money.add(grossAmount, -platformFeeFromCaregiver)
  const familyGross              = Money.add(grossAmount, platformFeeFromFamily)
  const familyPays               = Math.max(0, Money.add(familyGross, -employerSubsidy)) as Money
  // Validate: employerSubsidy cannot exceed familyGross
  if (employerSubsidy > familyGross) throw new Error('Subsidy exceeds booking amount')
  return { grossAmount, employerSubsidy, familyPays, platformFeeFromFamily,
           platformFeeFromCaregiver, caregiverPayout, familyGross }
}
```

## Escrow State Machine
```
PENDING ──[gateway authorization OK]──→ AUTHORIZED  (family card pre-auth)
AUTHORIZED ──[session starts]──────────→ CAPTURED    (charge captured)
CAPTURED ──[both review + 24h]─────────→ RELEASED    (caregiver paid out)
CAPTURED ──[family raises dispute]─────→ DISPUTED    (admin mediates)
DISPUTED ──[admin: release]────────────→ RELEASED
DISPUTED ──[admin: refund]─────────────→ REFUNDED
AUTHORIZED ──[booking cancelled]────────→ REFUNDED   (no capture)
```

Every transition: AuditLog in same tx.

## Employer Subsidy Ledger
- Employer has a monthly budget per employee
- Each subsidized booking deducts from that budget
- At month end: `employer.sweep` pg-boss job generates monthly invoice
- Invoice = sum of all subsidized bookings for that employer that month
- Employer invoice is Moroccan-compliant (ICE, TVA if applicable)

## Payment Adapter Interface
```typescript
export interface PaymentGateway {
  authorize(amount: Money, ref: string, returnUrl: string): Promise<GatewaySession>
  capture(gatewayRef: string, amount: Money): Promise<CaptureResult>
  refund(gatewayRef: string, amount: Money, reason: string): Promise<RefundResult>
  payout(amount: Money, bankDetails: BankDetails, ref: string): Promise<PayoutRef>
}
// DevGateway: mock — instant success, no real charges
// CMIGateway: production
```

## Checklist
- [ ] No float currency; all via `Money`
- [ ] Employer subsidy capped at familyGross (never negative familyPays)
- [ ] Every escrow transition writes AuditLog in same tx
- [ ] Payout only after CAPTURED state; never from PENDING/AUTHORIZED
- [ ] Gateway idempotency keys prevent double-charge
- [ ] Monthly employer invoice sweep is idempotent

## Handoff Points
- **← DBA**: escrow table, bigint columns
- **← Booking Engine**: booking amount input
- **→ Frontend Dev**: escrow status banner, payment UI
- **→ Test Architect**: double-charge, negative subsidy, failed payout edge cases
