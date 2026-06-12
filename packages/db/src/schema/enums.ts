import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["family", "caregiver", "employer", "admin"]);

export const careTypeEnum = pgEnum("care_type", [
  "daya",
  "nanny",
  "after_school",
  "nursery_assistant",
  "babysitter",
]);

export const verificationLevelEnum = pgEnum("verification_level", [
  "unverified",
  "id_checked",
  "cin_verified",
  "background_cleared",
  "certified",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "requested",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "disputed",
]);

export const documentTypeEnum = pgEnum("document_type", [
  "cin",
  "health_cert",
  "police_clearance",
  "reference",
  "certificate",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "pending",
  "approved",
  "rejected",
  "expired",
]);

export const escrowStatusEnum = pgEnum("escrow_status", [
  "pending",
  "authorized",
  "captured",
  "released",
  "refunded",
  "disputed",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "update",
  "cancel",
  "verify",
  "release",
  "dispute",
  "refund",
]);
