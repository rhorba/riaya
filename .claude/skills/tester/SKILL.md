---
name: tester
description: QA. AUTO-TRIGGERED after every code task. Vitest + Playwright. Trigger on: "test", "vitest", "playwright", "QA", or after any code task.
---
# Tester — Riaya

## AUTO-TRIGGER
```
ANY code task DONE → Tester runs immediately
ALL PASS → log → trigger next task
FAILURES → fix (≤2 attempts) → BLOCKER → ask user
```

## Tests That Matter Most

### 1. CIN Document Access (CRITICAL — PII)
```typescript
test('family cannot access caregiver CIN document', async () => {
  const doc = await seedVerificationDoc(caregiver)
  await expect(getDocumentSignedUrl(family.userId, 'family', doc.id))
    .rejects.toMatchObject({ status: 403 })
})
test('every signed URL generation writes audit log', async () => {
  await getDocumentSignedUrl(admin.userId, 'admin', doc.id)
  const logs = await getAuditLogs({ entity: 'verification_document', entityId: doc.id })
  expect(logs).toHaveLength(1)
  expect(logs[0].action).toBe('read')
})
```

### 2. Children's Data Isolation
```typescript
test('caregiver cannot read family B children data', async () => {
  const familyB = await seedFamily({ children: [{ name: 'Ali', ageMonths: 24 }] })
  await asUser(caregiver, async () => {
    const profile = await getFamilyProfile(familyB.id)
    expect(profile.children).toBeUndefined()  // RLS filters it
  })
})
```

### 3. Booking State Machine
```typescript
test('booking cannot skip from requested to in_progress', async () => {
  const booking = await createBooking({ status: 'requested' })
  await expect(startSession(booking.id)).rejects.toThrow()
})
test('escrow not captured before booking confirmed', async () => {
  const booking = await createBooking({ status: 'requested' })
  const escrow = await getEscrow(booking.id)
  expect(escrow.status).toBe('pending')
})
```

### 4. Employer Subsidy
```typescript
test('employer subsidy cannot exceed booking gross amount', () => {
  const booking = { grossAmount: Money.fromDirhams(200) }
  expect(() => computeEscrowAmounts(
    booking.grossAmount,
    Money.fromDirhams(300)  // subsidy > gross
  )).toThrow()
})
test('family pays 0 when subsidy covers full booking', () => {
  const amounts = computeEscrowAmounts(
    Money.fromDirhams(200),
    Money.fromDirhams(224)  // covers gross + fee
  )
  expect(amounts.familyPays).toBe(0)
})
```

### 5. Verification Level Computation
```typescript
test('level is unverified with no approved docs', () => {
  expect(computeVerificationLevel([])).toBe('unverified')
})
test('level is certified with all docs approved', () => {
  const docs = ['cin', 'police_clearance', 'health_cert', 'reference']
    .map(type => ({ type, status: 'approved' }))
  expect(computeVerificationLevel(docs)).toBe('certified')
})
```

### 6. E2E Critical Paths (Playwright)
- signup caregiver → upload CIN → admin approves → cin_verified badge appears
- family searches → books certified caregiver → escrow authorized → session completes → review → payout
- employer enrolls employee → employee books → subsidy deducted → employer invoiced
- RTL: `/ar` dir=rtl; booking form mirrors; currency right-aligned

## Coverage Targets
| Area | Target |
|---|---|
| `packages/booking`, `packages/payments`, `packages/verification` | 90%+ |
| Role isolation + RBAC | 100% of mutations have denial test |
| CIN document access | 100% of access paths audited |
| Booking state machine | 100% transition coverage |

## Handoff Points
- **← all code tasks**: auto-triggered
- **→ Backend/Frontend**: bug reports with file:line
- **→ Project Monitor**: test results for sprint metrics
- **→ Deployment**: green light when all pass
