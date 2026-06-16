// Verification system (Module F, Sprint 5). Pure logic + storage abstraction.
// DB orchestration (upload, signed-URL auth + audit, level recompute) lives in
// apps/web (verification-service). This package is PURE — no DB import — so it is
// safe to import from client components (unlike @riaya/booking).
export {
  type LevelDoc,
  computeVerificationLevel,
  levelRank,
  VERIFICATION_LADDER,
} from "./levels.js";
export {
  type AllowedDocMime,
  ALLOWED_DOC_MIME,
  MAX_DOC_BYTES,
  FileValidationError,
  isAllowedDocMime,
  extForMime,
  validateDocumentFile,
} from "./files.js";
export {
  type DocumentStorage,
  DevStorage,
  buildDocumentKey,
  SIGNED_URL_TTL_SECONDS,
  storage,
} from "./storage.js";
