---
name: test-architect
description: Test strategy, adversarial, PII + escrow + booking edge cases. Trigger on: "test strategy", "adversarial", "edge case".
---
# Test Architect — Riaya

## Risk Matrix
| Component | Risk Level |
|---|---|
| CIN / background docs unauthorized access | Maximum |
| Children's data exposure | Maximum |
| Escrow double-charge / double-payout | Maximum |
| Role isolation (family A reads family B) | Maximum |
| Admin impersonation | Maximum |
| Booking state skip | High |
| Employer subsidy negative result | High |
| Verification level gaming | High |
| Cancellation fee computation | Standard |

## Adversarial Checklist
- [ ] Family requests signed URL for caregiver's CIN → 403
- [ ] Caregiver calls releaseEscrow → 403
- [ ] Family submits booking with inflated employer subsidy in body → server recomputes, ignores client value
- [ ] Caregiver tries to skip booking state (requested → in_progress) → error
- [ ] Admin endpoint hit by caregiver role → 403
- [ ] CIN upload without consent timestamp → validation error
- [ ] Double booking: two families book same slot → only one succeeds (optimistic lock / unique constraint)

## Concurrency Test
```typescript
test('two families cannot book same caregiver slot simultaneously', async () => {
  const [booking1, booking2] = await Promise.allSettled([
    createBooking(family1, caregiver, slot),
    createBooking(family2, caregiver, slot),
  ])
  const fulfilled = [booking1, booking2].filter(r => r.status === 'fulfilled')
  expect(fulfilled).toHaveLength(1)  // only one wins
})
```

## Handoff Points
- **→ Tester**: strategy + adversarial checklists
- **→ Backend / Payments / Verification**: findings to fix
