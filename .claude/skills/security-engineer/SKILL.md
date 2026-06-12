---
name: security-engineer
description: Auth, RBAC, PII (CIN/children data), escrow integrity, OWASP. Trigger on: "security", "auth", "CIN", "PII", "RBAC", "role", "isolation", "CSP", "secrets", Sprint 7 hardening.
---
# Security Engineer — Riaya

## Threat Surface

| Component | Threat | Mitigation |
|---|---|---|
| **CIN / police clearance docs** | Unauthorized access to Category A PII | Private R2 bucket + admin-gated signed URLs (15min) + every access audit-logged |
| **Children's data** | Exposed beyond booking parties | RLS `family_strict` policy; never in logs; never in non-scoped API responses |
| Role isolation | Family A reads family B's booking history | `withUserContext` GUC + RLS forced on all tables |
| Admin impersonation | Talent self-promotes to admin | Admin provisioned via seed/direct DB only; no self-promotion endpoint |
| Escrow | Double-charge or payout without session | Atomic state machine; gateway idempotency; CAPTURED check before payout |
| File upload | Malicious file in document upload | Validate MIME + size; virus scan stub (real in v0.2); store in R2 not webroot |
| Auth | Credential stuffing, account takeover | Argon2id; rate-limit login; lockout; Google OAuth as safer path |

## CIN Document Access Protocol (MANDATORY)
```typescript
// EVERY signed URL generation must go through getDocumentSignedUrl()
// which (1) checks role/ownership (2) generates URL (3) writes audit log
// There is no other code path to access private documents.
// A direct r2Private.getSignedUrl() call without audit is a STOP-the-line incident.
```

## Pre-Deploy Security Checklist (Sprint 7 gate)
- [ ] RLS enabled+forced on ALL tables; app role cannot bypass
- [ ] Private R2 bucket: no public access; all access via server-generated signed URLs
- [ ] Every signed URL write audits to access_audit_logs
- [ ] Children's data: not in logs, not in non-scoped responses, not in analytics
- [ ] CIN data: same strictness as children's data
- [ ] Role/userId never from client input; from session only
- [ ] Admin endpoints: talent/family/employer role → 403
- [ ] Argon2id; login rate-limit + lockout
- [ ] Employer subsidy cannot go negative (Math.max guard + test)
- [ ] Consent timestamp stored on every document upload
- [ ] Secrets in `.env`; gitleaks passes in CI
- [ ] CSP + security headers; file upload validated (type + size)

## Handoff Points
- **→ DBA**: RLS policy review (mandatory before schema merges)
- **→ Verification Engineer**: R2 private bucket access patterns
- **→ Payments Engineer**: escrow integrity rules
- **→ Tester / Test Architect**: PII + role isolation + escrow edge cases
