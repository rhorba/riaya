import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core";
import { careTypeEnum, verificationLevelEnum } from "./enums";
import { users } from "./users";

export const caregiverProfiles = pgTable(
  "caregiver_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    // Public display name + photo (denormalized so the public SSR profile never
    // needs to read the RLS-protected users table). Photo lives in the PUBLIC R2 bucket.
    displayName: text("display_name").notNull().default(""),
    photoUrl: text("photo_url"),
    bio: text("bio"),
    careTypes: careTypeEnum("care_types").array().notNull().default([]),
    cities: text("cities").array().notNull().default([]),
    languages: text("languages").array().notNull().default([]),
    // Rates in integer centimes (MAD). bigint for safety on large values.
    hourlyRate: bigint("hourly_rate", { mode: "number" }),
    dailyRate: bigint("daily_rate", { mode: "number" }),
    monthlyRate: bigint("monthly_rate", { mode: "number" }),
    minAgeMonths: integer("min_age_months"),
    maxAgeYears: integer("max_age_years"),
    maxChildren: integer("max_children").default(1).notNull(),
    hasOwnSpace: boolean("has_own_space").default(false).notNull(),
    verificationLevel: verificationLevelEnum("verification_level").default("unverified").notNull(),
    // avgRating: 0–500 (1–5 stars × 100 for integer precision)
    avgRating: integer("avg_rating").default(0).notNull(),
    reviewCount: integer("review_count").default(0).notNull(),
    completedBookings: integer("completed_bookings").default(0).notNull(),
    // responseRate 0–100, punctualityScore 0–100
    responseRate: integer("response_rate").default(0).notNull(),
    punctualityScore: integer("punctuality_score").default(0).notNull(),
    // pgvector: 384-dim embedding (all-MiniLM-L6-v2 compatible)
    skillVector: vector("skill_vector", { dimensions: 384 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_caregiver_user_id").on(t.userId),
    index("idx_caregiver_verification").on(t.verificationLevel),
    index("idx_caregiver_rating").on(t.avgRating),
    // pgvector ANN index for caregiver matching (cosine distance). Used by @riaya/matching.
    index("idx_caregiver_skill_vector").using("hnsw", t.skillVector.op("vector_cosine_ops")),
  ]
);

export const verificationDocuments = pgTable(
  "verification_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caregiverId: uuid("caregiver_id")
      .notNull()
      .references(() => caregiverProfiles.id, { onDelete: "cascade" }),
    type: text("type")
      .$type<"cin" | "health_cert" | "police_clearance" | "reference" | "certificate">()
      .notNull(),
    // R2 object key ONLY — never a public URL. Signed URLs generated server-side.
    fileKey: text("file_key").notNull(),
    status: text("status")
      .$type<"pending" | "approved" | "rejected" | "expired">()
      .default("pending")
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    adminNote: text("admin_note"),
    // Explicit consent timestamp (required by Law 09-08 for biometric/ID data)
    consentGivenAt: timestamp("consent_given_at", { withTimezone: true }).notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
  },
  (t) => [
    index("idx_docs_caregiver_id").on(t.caregiverId),
    index("idx_docs_status").on(t.status),
    index("idx_docs_type").on(t.type),
  ]
);

export const availabilitySlots = pgTable(
  "availability_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caregiverId: uuid("caregiver_id")
      .notNull()
      .references(() => caregiverProfiles.id, { onDelete: "cascade" }),
    // dayOfWeek: 0 (Sun) – 6 (Sat), null if specificDate is set
    dayOfWeek: integer("day_of_week"),
    specificDate: text("specific_date"), // ISO date string "YYYY-MM-DD"
    startTime: text("start_time").notNull(), // "08:00"
    endTime: text("end_time").notNull(), // "18:00"
    available: boolean("available").default(true).notNull(),
  },
  (t) => [
    index("idx_slots_caregiver").on(t.caregiverId),
    index("idx_slots_date").on(t.specificDate),
  ]
);
