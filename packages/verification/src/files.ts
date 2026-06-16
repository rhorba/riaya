/**
 * Document file validation (Module F). CIN scans + certificates are Category A
 * PII, so the upload surface is deliberately narrow: a short allow-list of image
 * / PDF types and a hard size cap. PURE — no I/O.
 */

/** Allowed MIME types for verification document uploads. */
export const ALLOWED_DOC_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
} as const;

export type AllowedDocMime = keyof typeof ALLOWED_DOC_MIME;

/** Hard upload size cap (5 MB) — generous for a phone photo of a CIN, bounded. */
export const MAX_DOC_BYTES = 5 * 1024 * 1024;

export class FileValidationError extends Error {
  /** Stable code for i18n on the client (never leaks file contents). */
  readonly code: "type_not_allowed" | "too_large" | "empty";
  constructor(code: "type_not_allowed" | "too_large" | "empty") {
    super(`Invalid document file: ${code}`);
    this.name = "FileValidationError";
    this.code = code;
  }
}

export function isAllowedDocMime(mime: string): mime is AllowedDocMime {
  return mime in ALLOWED_DOC_MIME;
}

/** File extension (no dot) for an allowed MIME type. */
export function extForMime(mime: AllowedDocMime): string {
  return ALLOWED_DOC_MIME[mime];
}

/**
 * Validate an uploaded document by size + declared MIME type. Throws
 * `FileValidationError` (with a stable code) on rejection. Returns the resolved
 * extension on success.
 */
export function validateDocumentFile(sizeBytes: number, mimeType: string): string {
  if (sizeBytes <= 0) throw new FileValidationError("empty");
  if (sizeBytes > MAX_DOC_BYTES) throw new FileValidationError("too_large");
  if (!isAllowedDocMime(mimeType)) throw new FileValidationError("type_not_allowed");
  return extForMime(mimeType);
}
