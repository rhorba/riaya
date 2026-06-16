"use server";

import { type ActionResult, fail, ok } from "@/lib/action-result";
import { withRoleTx } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { getDocumentSignedUrl, uploadVerificationDocument } from "@/lib/verification-service";
import { DocumentTypeSchema } from "@riaya/core";
import { caregiverProfiles, verificationDocuments } from "@riaya/db";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/** A caregiver's own document row (no fileKey — that never reaches the client). */
export type MyDocument = {
  id: string;
  type: (typeof verificationDocuments.$inferSelect)["type"];
  status: (typeof verificationDocuments.$inferSelect)["status"];
  adminNote: string | null;
  uploadedAt: Date;
  reviewedAt: Date | null;
  expiresAt: Date | null;
};

export type MyVerification = {
  level: (typeof caregiverProfiles.$inferSelect)["verificationLevel"];
  hasProfile: boolean;
  documents: MyDocument[];
};

/** Load the signed-in caregiver's verification level + documents (RLS-scoped). */
export const getMyVerification = withRoleTx(
  ["caregiver"],
  async (tx, user): Promise<MyVerification> => {
    const [profile] = await tx
      .select({ id: caregiverProfiles.id, level: caregiverProfiles.verificationLevel })
      .from(caregiverProfiles)
      .where(eq(caregiverProfiles.userId, user.id))
      .limit(1);
    if (!profile) return { level: "unverified", hasProfile: false, documents: [] };

    const docs = await tx
      .select({
        id: verificationDocuments.id,
        type: verificationDocuments.type,
        status: verificationDocuments.status,
        adminNote: verificationDocuments.adminNote,
        uploadedAt: verificationDocuments.uploadedAt,
        reviewedAt: verificationDocuments.reviewedAt,
        expiresAt: verificationDocuments.expiresAt,
      })
      .from(verificationDocuments)
      .where(eq(verificationDocuments.caregiverId, profile.id))
      .orderBy(desc(verificationDocuments.uploadedAt));

    return { level: profile.level, hasProfile: true, documents: docs };
  }
);

/** Caregiver uploads a verification document (multipart form). */
export async function uploadDocument(formData: FormData): Promise<ActionResult> {
  const user = await requireRole(["caregiver"]);

  const typeParsed = DocumentTypeSchema.safeParse(formData.get("type"));
  if (!typeParsed.success) return fail("invalidInput");

  const consent = formData.get("consent") === "on" || formData.get("consent") === "true";
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("file_empty");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const res = await uploadVerificationDocument(user, typeParsed.data, bytes, file.type, consent);
  if (!res.ok) return res;

  revalidatePath("/caregiver/verification");
  return ok(undefined);
}

/** Caregiver requests a short-lived signed URL to view their own document. */
export async function requestMyDocumentUrl(
  documentId: string
): Promise<ActionResult<{ url: string }>> {
  const user = await requireRole(["caregiver"]);
  return getDocumentSignedUrl(user, documentId);
}
