import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

// ChildRecord stored as JSONB — encrypted at rest by postgres + R2 bucket policy.
// Never logged, never returned in list endpoints. Only visible to booking parties.
type ChildRecord = {
  id: string;
  name: string;
  ageMonths: number;
  specialNeeds?: string | undefined;
};

export const familyProfiles = pgTable(
  "family_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    address: text("address"),
    neighborhood: text("neighborhood"),
    city: text("city").notNull(),
    // Stored as JSONB — most sensitive data on platform. RLS enforces owner-only.
    children: jsonb("children").$type<ChildRecord[]>().default([]).notNull(),
    savedCaregiverIds: uuid("saved_caregiver_ids").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_family_user_id").on(t.userId), index("idx_family_city").on(t.city)]
);
