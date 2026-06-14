import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { notificationTypeEnum } from "./enums";
import { users } from "./users";

// In-app notifications (Module H). Email/SMS delivery is handled separately by
// @riaya/notifications; this table is the in-app inbox. RLS: recipient + admin only.
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Recipient.
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    // Contextual payload (e.g. { bookingId }). MUST NOT contain children PII.
    data: jsonb("data").$type<Record<string, unknown>>().default({}).notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_notifications_user").on(t.userId),
    index("idx_notifications_unread").on(t.userId, t.readAt),
    index("idx_notifications_created").on(t.createdAt),
  ]
);
