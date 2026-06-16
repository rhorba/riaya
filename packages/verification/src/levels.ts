import type { DocumentStatus, DocumentType, VerificationLevel } from "@riaya/core";

/**
 * Minimal shape needed to compute a verification level. Accepts the full DB row
 * or any subset carrying `type` + `status`.
 */
export type LevelDoc = { type: DocumentType; status: DocumentStatus };

/**
 * Compute a caregiver's verification level from their documents (Module F).
 *
 * Progressive trust ladder — each rung requires the rungs below it:
 *   unverified        → no CIN on file
 *   id_checked        → CIN uploaded, still pending admin review
 *   cin_verified      → CIN approved (can take bookings)
 *   background_cleared→ CIN + police clearance approved
 *   certified         → CIN + police clearance + health cert + ≥1 reference approved
 *
 * PURE: deterministic from the document set. Recomputed on every doc
 * approval/rejection — never set directly. A rejected/expired CIN drops the
 * caregiver back down the ladder, so trust is never sticky.
 */
export function computeVerificationLevel(docs: readonly LevelDoc[]): VerificationLevel {
  const has = (type: DocumentType, status: DocumentStatus): boolean =>
    docs.some((d) => d.type === type && d.status === status);

  const cinApproved = has("cin", "approved");
  if (!cinApproved) {
    // CIN uploaded but not yet approved (and not rejected) → identity on file.
    return has("cin", "pending") ? "id_checked" : "unverified";
  }

  // CIN approved → at least cin_verified.
  if (!has("police_clearance", "approved")) return "cin_verified";

  // Background cleared. Full certification additionally needs health + reference.
  const certified = has("health_cert", "approved") && has("reference", "approved");
  return certified ? "certified" : "background_cleared";
}

/** Ordered ladder, lowest → highest. Useful for "at least" comparisons in search. */
export const VERIFICATION_LADDER: readonly VerificationLevel[] = [
  "unverified",
  "id_checked",
  "cin_verified",
  "background_cleared",
  "certified",
] as const;

/** Rank of a level on the ladder (0 = unverified). */
export function levelRank(level: VerificationLevel): number {
  return VERIFICATION_LADDER.indexOf(level);
}
