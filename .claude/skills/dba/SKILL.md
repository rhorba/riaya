---
name: dba
description: Schema, migrations, Drizzle, RLS, pgvector. Trigger on: "schema", "migration", "drizzle", "postgres", "RLS", "index", "db migrate".
---
# DBA — Riaya

## RLS Policies (critical examples)

```sql
-- Caregivers: public profile visible to all; private fields only to owner/admin
ALTER TABLE caregiver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY caregiver_read ON caregiver_profiles FOR SELECT
  USING (true);   -- public profile
CREATE POLICY caregiver_write ON caregiver_profiles FOR ALL
  USING (user_id = current_setting('app.current_user', true)::uuid
         OR current_setting('app.current_role', true) = 'admin');

-- Verification documents: STRICT — owner + admin only
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents FORCE ROW LEVEL SECURITY;
CREATE POLICY docs_strict ON verification_documents
  USING (caregiver_id IN (
    SELECT id FROM caregiver_profiles
    WHERE user_id = current_setting('app.current_user', true)::uuid
  ) OR current_setting('app.current_role', true) = 'admin');

-- Children records: family owner + admin + caregiver with active booking
ALTER TABLE family_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY family_strict ON family_profiles
  USING (user_id = current_setting('app.current_user', true)::uuid
         OR current_setting('app.current_role', true) = 'admin');

-- Bookings: family, caregiver in booking, employer, admin
CREATE POLICY booking_parties ON bookings
  USING (
    family_id IN (SELECT id FROM family_profiles WHERE user_id = current_setting('app.current_user',true)::uuid)
    OR caregiver_id IN (SELECT id FROM caregiver_profiles WHERE user_id = current_setting('app.current_user',true)::uuid)
    OR current_setting('app.current_role', true) IN ('employer', 'admin')
  );
```

## Schema highlights

```typescript
// pgvector for caregiver matching
export const caregiverProfiles = pgTable('caregiver_profiles', {
  // ... all fields from CLAUDE.md §6
  careTypes: text('care_types').array().notNull().default([]),
  cities: text('cities').array().notNull().default([]),
  hourlyRate: bigint('hourly_rate', { mode: 'number' }),   // centimes
  dailyRate:  bigint('daily_rate',  { mode: 'number' }),
  monthlyRate: bigint('monthly_rate', { mode: 'number' }),
  avgRating: integer('avg_rating').default(0).notNull(),   // 0–500 (x100)
  skillVector: vector('skill_vector', { dimensions: 384 }), // pgvector
  verificationLevel: verificationLevelEnum('verification_level').default('unverified').notNull(),
})

// Verification docs — strict RLS, private R2 URLs
export const verificationDocuments = pgTable('verification_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  caregiverId: uuid('caregiver_id').notNull(),
  type: docTypeEnum('type').notNull(),
  fileKey: text('file_key').notNull(),    // R2 object key (NOT public URL)
  status: docStatusEnum('status').default('pending').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  adminNote: text('admin_note'),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  consentGivenAt: timestamp('consent_given_at', { withTimezone: true }).notNull(),
})

// Availability slots
export const availabilitySlots = pgTable('availability_slots', {
  id: uuid('id').primaryKey().defaultRandom(),
  caregiverId: uuid('caregiver_id').notNull(),
  dayOfWeek: integer('day_of_week'),     // 0-6 recurring, null if specific date
  specificDate: date('specific_date'),   // specific override
  startTime: text('start_time').notNull(), // "08:00"
  endTime: text('end_time').notNull(),     // "18:00"
  available: boolean('available').default(true).notNull(),
}, (t) => ({
  idxCaregiver: index('idx_slots_caregiver').on(t.caregiverId),
  idxDate: index('idx_slots_date').on(t.specificDate),
}))

// IMPORTANT: fileKey not fileUrl in verificationDocuments
// URLs generated server-side via getSignedUrl(fileKey, { expiresIn: 900 })
// EVERY signed URL generation writes to access_audit_logs
```

## Rule: Two R2 buckets, never mixed
- `RIAYA_PUBLIC_BUCKET`: profile photos, nursery photos → CDN public URL
- `RIAYA_PRIVATE_BUCKET`: CIN, police clearance, health certs → signed URL ONLY

## Handoff Points
- **→ Backend Dev**: schema exports, `withUserContext`
- **→ Security Engineer**: RLS policy review (mandatory before merge)
- **→ Verification Engineer**: doc schema + access patterns
- **→ Payments Engineer**: escrow schema
