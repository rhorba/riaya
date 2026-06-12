import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id parameters (OWASP-recommended baseline).
 * memoryCost in KiB. These are intentionally above defaults for credential storage.
 */
const ARGON2ID_OPTIONS = {
  // memoryCost: 19 MiB, timeCost: 2, parallelism: 1 — OWASP minimum for Argon2id
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
} as const;

/** Hash a plaintext password with Argon2id. Never store plaintext. */
export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2ID_OPTIONS);
}

/**
 * Verify a plaintext password against a stored Argon2id hash.
 * Constant-time comparison is handled inside argon2's verify.
 */
export function verifyPassword(storedHash: string, password: string): Promise<boolean> {
  return verify(storedHash, password, ARGON2ID_OPTIONS);
}
