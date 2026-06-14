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
import { caregiverProfiles } from "./caregivers";
import { employerAccounts } from "./employers";
import { bookingStatusEnum, careTypeEnum, escrowStatusEnum } from "./enums";
import { familyProfiles } from "./families";
import { users } from "./users";

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caregiverId: uuid("caregiver_id")
      .notNull()
      .references(() => caregiverProfiles.id),
    familyId: uuid("family_id")
      .notNull()
      .references(() => familyProfiles.id),
    // Set when employer subsidy applies to this booking
    employerAccountId: uuid("employer_account_id").references(() => employerAccounts.id),
    careType: careTypeEnum("care_type").notNull(),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    locationNote: text("location_note"),
    childrenCount: integer("children_count").notNull(),
    status: bookingStatusEnum("status").default("requested").notNull(),
    familyNotes: text("family_notes"),
    cancelReason: text("cancel_reason"),
    urgent: boolean("urgent").default(false).notNull(),
    // Session-end confirmation: in_progress → completed requires BOTH parties to
    // confirm the session ended. Set when each side confirms; completion is the
    // moment the second timestamp lands.
    familyEndedAt: timestamp("family_ended_at", { withTimezone: true }),
    caregiverEndedAt: timestamp("caregiver_ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_booking_caregiver").on(t.caregiverId),
    index("idx_booking_family").on(t.familyId),
    index("idx_booking_status").on(t.status),
    index("idx_booking_start_time").on(t.startTime),
    // NOTE: a GiST EXCLUDE constraint `bookings_no_overlap` (migration 0004)
    // forbids two CONFIRMED/IN_PROGRESS bookings for the same caregiver from
    // overlapping in time — the DB-level guarantee that one slot can't be
    // double-booked. Drizzle can't express EXCLUDE, so it lives in raw SQL.
  ]
);

export const escrows = pgTable(
  "escrows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .unique()
      .references(() => bookings.id),
    familyId: uuid("family_id")
      .notNull()
      .references(() => familyProfiles.id),
    caregiverId: uuid("caregiver_id")
      .notNull()
      .references(() => caregiverProfiles.id),
    // All amounts in integer centimes. Stored, never recomputed.
    grossAmount: bigint("gross_amount", { mode: "number" }).notNull(),
    employerSubsidy: bigint("employer_subsidy", { mode: "number" }).default(0).notNull(),
    familyPays: bigint("family_pays", { mode: "number" }).notNull(),
    platformFeeFromFamily: bigint("platform_fee_from_family", {
      mode: "number",
    }).notNull(),
    platformFeeFromCaregiver: bigint("platform_fee_from_caregiver", {
      mode: "number",
    }).notNull(),
    caregiverPayout: bigint("caregiver_payout", { mode: "number" }).notNull(),
    status: escrowStatusEnum("status").default("pending").notNull(),
    gatewayRef: text("gateway_ref"),
    authorizedAt: timestamp("authorized_at", { withTimezone: true }),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    disputeWindowEndsAt: timestamp("dispute_window_ends_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_escrow_booking").on(t.bookingId),
    index("idx_escrow_status").on(t.status),
    index("idx_escrow_caregiver").on(t.caregiverId),
  ]
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => users.id),
    revieweeId: uuid("reviewee_id")
      .notNull()
      .references(() => users.id),
    // 1–5 stars
    rating: integer("rating").notNull(),
    comment: text("comment"),
    reviewerRole: text("reviewer_role").$type<"family" | "caregiver">().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_review_booking").on(t.bookingId),
    index("idx_review_reviewee").on(t.revieweeId),
  ]
);
