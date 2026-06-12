import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { auditActionEnum } from "./enums";
import { users } from "./users";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id),
    entity: text("entity").notNull(),
    entityId: uuid("entity_id").notNull(),
    action: auditActionEnum("action").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_audit_actor").on(t.actorUserId),
    index("idx_audit_entity").on(t.entity, t.entityId),
    index("idx_audit_at").on(t.at),
  ]
);

// Logs every signed URL generation for CIN/doc access (Law 09-08 compliance)
export const accessAuditLogs = pgTable(
  "access_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id),
    documentId: uuid("document_id").notNull(),
    fileKey: text("file_key").notNull(),
    action: text("action").$type<"signed_url_generated" | "viewed">().notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_access_audit_actor").on(t.actorUserId),
    index("idx_access_audit_doc").on(t.documentId),
    index("idx_access_audit_at").on(t.at),
  ]
);
