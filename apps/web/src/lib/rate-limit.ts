/**
 * In-memory sliding-window login rate limiter.
 * 5 failures per email within 15 minutes → 15-minute lockout.
 *
 * NOTE: resets on server restart. Multi-instance deployments (Vercel scale-out)
 * need Redis or a DB-backed store — swap the Map for that in v0.2.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILURES = 5;

type Bucket = { failures: number; lockedUntil: number | null };

const store = new Map<string, Bucket>();

export function isRateLimited(key: string): boolean {
  const b = store.get(key);
  if (!b?.lockedUntil) return false;
  if (Date.now() < b.lockedUntil) return true;
  store.delete(key); // lockout expired
  return false;
}

export function recordLoginFailure(key: string): void {
  const b = store.get(key) ?? { failures: 0, lockedUntil: null };
  b.failures += 1;
  if (b.failures >= MAX_FAILURES) {
    b.lockedUntil = Date.now() + WINDOW_MS;
  }
  store.set(key, b);
}

export function clearLoginFailures(key: string): void {
  store.delete(key);
}
