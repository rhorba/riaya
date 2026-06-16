import "server-only";

import type { ActionResult } from "@/lib/action-result";
import { fail, ok } from "@/lib/action-result";
import { notif, notifyUser } from "@/lib/notification-service";
import type { SessionUser } from "@/lib/session";
import type { DocumentType, VerificationLevel } from "@riaya/core";
import {
  type Tx,
  accessAuditLogs,
  auditLogs,
  caregiverProfiles,
  db,
  verificationDocuments,
  withUserContext,
} from "@riaya/db";
import {
  FileValidationError,
  SIGNED_URL_TTL_SECONDS,
  buildDocumentKey,
  computeVerificationLevel,
  storage,
  validateDocumentFile,
} from "@riaya/verification";
import { eq } from "drizzle-orm";

/**
 * Verification document orchestration (Module F, Sprint 5).
 *
 * CIN scans + police clearances are Category A PII (Riaya non-negotiable #1):
 *   - bytes live in the PRIVATE bucket; the table stores only the object KEY
 *   - the only read path is a 15-min signed URL, gated on owner/admin
 *   - EVERY signed-URL mint writes an `access_audit_logs` row (mandatory)
 *   - the verification level is never set directly — it is recomputed from the
 *     document set on every approval/rejection
 *
 * Upload + the dashboard read run under the caregiver's own RLS context (the
 * `docs_insert`/`docs_select` policies already restrict to the owner). Admin
 * review runs under an admin context (`docs_update` is admin-only).
 */

type ReviewableDoc = typeof verificationDocuments.$inferSelect;

/** Resolve the caregiver profile id owned by `userId` (RLS-scoped read). */
async function caregiverIdFor(tx: Tx, userId: string): Promise<string | null> {
  const [row] = await tx
    .select({ id: caregiverProfiles.id })
    .from(caregiverProfiles)
    .where(eq(caregiverProfiles.userId, userId))
    .limit(1);
  return row?.id ?? null;
}

/**
 * Recompute and persist a caregiver's verification level from their current
 * document set. Runs inside the caller's tx so it commits atomically with the
 * status change that triggered it. Returns the new level.
 */
async function recomputeVerificationLevel(tx: Tx, caregiverId: string): Promise<VerificationLevel> {
  const docs = await tx
    .select({ type: verificationDocuments.type, status: verificationDocuments.status })
    .from(verificationDocuments)
    .where(eq(verificationDocuments.caregiverId, caregiverId));

  const level = computeVerificationLevel(docs);
  await tx
    .update(caregiverProfiles)
    .set({ verificationLevel: level, updatedAt: new Date() })
    .where(eq(caregiverProfiles.id, caregiverId));
  return level;
}

/** A caregiver uploads a verification document. */
export async function uploadVerificationDocument(
  user: SessionUser,
  type: DocumentType,
  bytes: Uint8Array,
  mimeType: string,
  consentGiven: boolean
): Promise<ActionResult<{ id: string; level: VerificationLevel }>> {
  if (!consentGiven) return fail("consentRequired");

  let ext: string;
  try {
    ext = validateDocumentFile(bytes.byteLength, mimeType);
  } catch (e) {
    if (e instanceof FileValidationError) return fail(`file_${e.code}`);
    throw e;
  }

  return withUserContext(db, user.id, user.role, async (tx) => {
    const caregiverId = await caregiverIdFor(tx, user.id);
    if (!caregiverId) return fail("profileNotFound");

    // Store bytes in the private bucket FIRST; the row references the key.
    const fileKey = buildDocumentKey(caregiverId, type, ext);
    await storage.put(fileKey, bytes, mimeType);

    const [created] = await tx
      .insert(verificationDocuments)
      .values({
        caregiverId,
        type,
        fileKey,
        status: "pending",
        // Explicit consent timestamp (Law 09-08) recorded at upload.
        consentGivenAt: new Date(),
      })
      .returning({ id: verificationDocuments.id });
    if (!created) return fail("createFailed");

    await tx.insert(auditLogs).values({
      actorUserId: user.id,
      entity: "verification_document",
      entityId: created.id,
      action: "create",
      before: null,
      // Audit the metadata only — never the bytes or the signed URL.
      after: { type, status: "pending" },
    });

    // A newly uploaded CIN moves an unverified caregiver to id_checked.
    const level = await recomputeVerificationLevel(tx, caregiverId);
    return ok({ id: created.id, level });
  });
}

/**
 * Mint a short-lived signed URL for a document. Authorized for the document's
 * owner (caregiver) or an admin ONLY — RLS hides the row from everyone else, so
 * an out-of-scope caller gets `forbidden`. Every successful mint is recorded in
 * `access_audit_logs` (mandatory; Riaya non-negotiable #1).
 */
export async function getDocumentSignedUrl(
  user: SessionUser,
  documentId: string,
  meta?: { ipAddress?: string; userAgent?: string }
): Promise<ActionResult<{ url: string }>> {
  return withUserContext(db, user.id, user.role, async (tx) => {
    // RLS (docs_select) restricts visibility to owner + admin. If no row comes
    // back, the caller is not authorized to know this document exists.
    const [doc] = await tx
      .select({ id: verificationDocuments.id, fileKey: verificationDocuments.fileKey })
      .from(verificationDocuments)
      .where(eq(verificationDocuments.id, documentId))
      .limit(1);
    if (!doc) return fail("forbidden");

    const url = await storage.getSignedUrl(doc.fileKey, SIGNED_URL_TTL_SECONDS);

    // MANDATORY access audit — written before the URL is handed back.
    await tx.insert(accessAuditLogs).values({
      actorUserId: user.id,
      documentId: doc.id,
      fileKey: doc.fileKey,
      action: "signed_url_generated",
      ipAddress: meta?.ipAddress ?? null,
      userAgent: meta?.userAgent ?? null,
    });

    return ok({ url });
  });
}

/**
 * Admin approves or rejects a document, then the caregiver's verification level
 * is recomputed. Records the reviewer identity + decision; writes a `verify`
 * audit row atomically with the status change.
 */
export async function reviewDocument(
  admin: SessionUser,
  documentId: string,
  decision: "approved" | "rejected",
  adminNote?: string
): Promise<ActionResult<{ caregiverId: string; level: VerificationLevel }>> {
  if (admin.role !== "admin") return fail("forbidden");

  const reviewed = await withUserContext(db, admin.id, "admin", async (tx) => {
    const [doc] = await tx
      .select()
      .from(verificationDocuments)
      .where(eq(verificationDocuments.id, documentId))
      .limit(1);
    if (!doc) return null;

    const before: Pick<ReviewableDoc, "status"> = { status: doc.status };
    await tx
      .update(verificationDocuments)
      .set({
        status: decision,
        adminNote: adminNote ?? null,
        reviewedAt: new Date(),
        reviewedBy: admin.id,
      })
      .where(eq(verificationDocuments.id, documentId));

    await tx.insert(auditLogs).values({
      actorUserId: admin.id,
      entity: "verification_document",
      entityId: documentId,
      action: "verify",
      before,
      after: { status: decision },
    });

    const [cg] = await tx
      .select({ userId: caregiverProfiles.userId })
      .from(caregiverProfiles)
      .where(eq(caregiverProfiles.id, doc.caregiverId))
      .limit(1);

    const level = await recomputeVerificationLevel(tx, doc.caregiverId);
    return { caregiverId: doc.caregiverId, caregiverUserId: cg?.userId ?? null, level };
  });

  if (!reviewed) return fail("documentNotFound");

  // Notify the caregiver of the decision (in-app, FR copy, no PII).
  if (reviewed.caregiverUserId) {
    await notifyUser(
      admin.id,
      reviewed.caregiverUserId,
      decision === "approved"
        ? notif.documentApproved(documentId)
        : notif.documentRejected(documentId)
    );
  }

  return ok({ caregiverId: reviewed.caregiverId, level: reviewed.level });
}
