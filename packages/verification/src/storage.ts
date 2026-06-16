import { randomUUID } from "node:crypto";
import type { DocumentType } from "@riaya/core";

/**
 * Private document storage abstraction (Module F). v0.1 ships only `DevStorage`
 * (in-memory). The production Cloudflare R2 adapter implements the same interface
 * in v0.2 — same call sites, swapped by env.
 *
 * CRITICAL: this is the PRIVATE bucket. Objects are NEVER publicly readable; the
 * only way to read one is a short-lived signed URL minted server-side by
 * `getSignedUrl`, gated on admin/owner authorization and audit-logged at the call
 * site (see apps/web verification-service).
 */
export interface DocumentStorage {
  /** Store object bytes under `key`. Overwrites are not expected (keys are unique). */
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  /** Mint a signed, expiring URL to read the object. `expiresInSeconds` ≤ 900. */
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
}

/**
 * Build an unguessable private object key. Includes the caregiver + doc type for
 * operability, plus a random UUID so the key can't be predicted/enumerated from
 * the caregiver id alone.
 */
export function buildDocumentKey(caregiverId: string, type: DocumentType, ext: string): string {
  return `verification/${caregiverId}/${type}/${randomUUID()}.${ext}`;
}

/** Default signed-URL lifetime: 15 minutes (Riaya non-negotiable #1). */
export const SIGNED_URL_TTL_SECONDS = 900;

/**
 * Development storage: keeps bytes in memory and mints a fake but well-formed
 * signed URL (with an `expires` query param) so the flow is exercisable end-to-end
 * without R2 credentials. NEVER use in production — bytes are not durable and the
 * "signature" is not verified.
 */
export class DevStorage implements DocumentStorage {
  private readonly objects = new Map<string, { bytes: Uint8Array; contentType: string }>();

  put(key: string, bytes: Uint8Array, contentType: string): Promise<void> {
    this.objects.set(key, { bytes, contentType });
    return Promise.resolve();
  }

  getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
    const ttl = Math.min(expiresInSeconds, SIGNED_URL_TTL_SECONDS);
    const expires = Math.floor(Date.now() / 1000) + ttl;
    const sig = randomUUID().replace(/-/g, "");
    return Promise.resolve(
      `https://dev-storage.riaya.local/${encodeURI(key)}?expires=${expires}&sig=${sig}`
    );
  }

  /** Test/dev helper: read back stored bytes (not part of the prod interface). */
  read(key: string): Uint8Array | undefined {
    return this.objects.get(key)?.bytes;
  }
}

/** The storage used by the app. v0.1: always Dev. v0.2: swap by env (R2). */
export const storage: DocumentStorage = new DevStorage();
