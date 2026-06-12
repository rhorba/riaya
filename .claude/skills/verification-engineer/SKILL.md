---
name: verification-engineer
description: Document upload, admin review queue, verification level computation. Trigger on: "verification", "CIN", "document", "background check", "police clearance", "health cert", "badge".
---
# Verification Engineer — Riaya

## Role
Own `packages/verification`. This is the trust engine. A caregiver's verification level
is the #1 signal families use to make decisions. It must be accurate, auditable, and never
gameable. CIN documents are Category A PII — treat every line of this code with that gravity.

## Verification Levels (progressive)
```
unverified     → just signed up; can appear in search but with clear "unverified" badge
id_checked     → CIN uploaded, pending admin review
cin_verified   → CIN confirmed; can take bookings
background_cleared → police clearance confirmed; higher in search ranking
certified      → CIN + background + health cert + ≥1 reference approved + ≥3 reviews
```

## Document Upload Flow
```typescript
// packages/verification/src/upload.ts
export async function uploadVerificationDocument(
  userId: string,
  caregiverId: string,
  type: DocType,
  file: Buffer,
  mimeType: string,
  consentTimestamp: Date
): Promise<VerificationDocument> {
  // 1. Validate file type (JPEG/PNG/PDF only) + size (max 5MB)
  validateDocumentFile(file, mimeType)
  // 2. Generate private R2 key (never predictable)
  const fileKey = `verification/${caregiverId}/${type}/${ulid()}.${ext(mimeType)}`
  // 3. Upload to PRIVATE bucket
  await r2Private.put(fileKey, file)
  // 4. Save record with consent timestamp
  const doc = await db.insert(verificationDocuments).values({
    caregiverId, type, fileKey, status: 'pending', consentGivenAt: consentTimestamp
  }).returning()
  // 5. Audit log the upload
  await writeAudit({ entity: 'verification_document', entityId: doc.id, action: 'create' })
  // 6. Notify admin queue
  await scheduleJob('verification.admin_notify', { documentId: doc.id })
  return doc
}
```

## Signed URL Generation (admin or owner only — ALWAYS audited)
```typescript
export async function getDocumentSignedUrl(
  actorUserId: string,
  actorRole: string,
  documentId: string
): Promise<string> {
  const doc = await getDocument(documentId)
  // Authorization check
  const isOwner = await isDocumentOwner(actorUserId, doc.caregiverId)
  if (!isOwner && actorRole !== 'admin') throw new HttpError(403)
  // Generate signed URL
  const url = await r2Private.getSignedUrl(doc.fileKey, { expiresIn: 900 }) // 15 min
  // ALWAYS audit
  await writeAudit({ entity: 'verification_document', entityId: documentId,
    action: 'read', after: { actorUserId, expiresIn: 900 } })
  return url
}
```

## Verification Level Recomputation
Called after each document status change:
```typescript
export function computeVerificationLevel(docs: VerificationDocument[]): VerificationLevel {
  const approved = (type: DocType) => docs.some(d => d.type === type && d.status === 'approved')
  if (!approved('cin')) return 'unverified'
  // If CIN uploaded but not yet approved
  const cinPending = docs.some(d => d.type === 'cin' && d.status === 'pending')
  if (cinPending) return 'id_checked'
  if (!approved('police_clearance')) return 'cin_verified'
  const hasHealthCert = approved('health_cert')
  const hasReference = approved('reference')
  return hasHealthCert && hasReference ? 'certified' : 'background_cleared'
}
```

## Checklist
- [ ] CIN stored in PRIVATE R2 bucket only (never public)
- [ ] Every signed URL generation writes access audit log
- [ ] Consent timestamp stored on upload
- [ ] Verification level recomputed on every doc approval/rejection
- [ ] Document expiry tracked (health cert expires annually)
- [ ] Admin reviewer identity recorded on each approval/rejection
- [ ] No PII in logs, error messages, or API responses beyond what role allows

## Handoff Points
- **← DBA**: verification_documents schema (fileKey not fileUrl)
- **← Security Engineer**: R2 private bucket policy review
- **→ Backend Dev**: action integration
- **→ Frontend Dev**: upload UI + verification badge display
- **→ Tester**: upload flow, signed URL auth, level computation logic
