import type { Role } from "./types.js";

export class AuthorizationError extends Error {
  constructor(required: Role[], actual: Role) {
    super(`Access denied. Required: [${required.join(", ")}], got: ${actual}`);
    this.name = "AuthorizationError";
  }
}

/**
 * Assert that the given role is in the allowed set.
 * Throws AuthorizationError if not — call this in server actions and API routes.
 */
export function assertRole(role: Role, allowed: Role[]): void {
  if (!allowed.includes(role)) {
    throw new AuthorizationError(allowed, role);
  }
}

/** Type-safe role check (does not throw) */
export function hasRole(role: Role, allowed: Role[]): boolean {
  return allowed.includes(role);
}

/** Capability matrix — mirrors §7 of CLAUDE.md */
export const CAPABILITIES = {
  searchCaregivers: ["family", "employer", "admin"] satisfies Role[],
  requestBooking: ["family", "admin"] satisfies Role[],
  acceptBooking: ["caregiver", "admin"] satisfies Role[],
  confirmSessionEnd: ["family", "caregiver", "admin"] satisfies Role[],
  leaveReview: ["family", "caregiver"] satisfies Role[],
  uploadVerificationDocs: ["caregiver"] satisfies Role[],
  reviewDocs: ["admin"] satisfies Role[],
  manageEmployerBenefits: ["employer", "admin"] satisfies Role[],
  resolveDisputes: ["admin"] satisfies Role[],
  viewPlatformKPIs: ["admin"] satisfies Role[],
  preAuthorizePayment: ["family", "admin"] satisfies Role[],
} as const;

export type Capability = keyof typeof CAPABILITIES;

export function can(role: Role, capability: Capability): boolean {
  return (CAPABILITIES[capability] as readonly Role[]).includes(role);
}
