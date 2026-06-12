import { describe, expect, it } from "vitest";
import { AuthorizationError, CAPABILITIES, assertRole, can, hasRole } from "./rbac.js";
import type { Role } from "./types.js";

const ALL_ROLES: Role[] = ["family", "caregiver", "employer", "admin"];

describe("assertRole", () => {
  it("passes when the role is allowed", () => {
    expect(() => assertRole("admin", ["admin"])).not.toThrow();
    expect(() => assertRole("family", ["family", "admin"])).not.toThrow();
  });

  it("throws AuthorizationError when the role is not allowed", () => {
    expect(() => assertRole("family", ["admin"])).toThrow(AuthorizationError);
    expect(() => assertRole("caregiver", ["family", "employer"])).toThrow(AuthorizationError);
  });
});

describe("hasRole", () => {
  it("is a non-throwing membership check", () => {
    expect(hasRole("employer", ["employer", "admin"])).toBe(true);
    expect(hasRole("employer", ["family"])).toBe(false);
  });
});

describe("capability matrix (§7)", () => {
  it("only family/admin can request a booking", () => {
    expect(can("family", "requestBooking")).toBe(true);
    expect(can("admin", "requestBooking")).toBe(true);
    expect(can("caregiver", "requestBooking")).toBe(false);
    expect(can("employer", "requestBooking")).toBe(false);
  });

  it("only caregiver can upload verification docs", () => {
    expect(can("caregiver", "uploadVerificationDocs")).toBe(true);
    for (const role of ["family", "employer", "admin"] as Role[]) {
      expect(can(role, "uploadVerificationDocs")).toBe(false);
    }
  });

  it("only admin can review docs / resolve disputes", () => {
    for (const role of ALL_ROLES) {
      expect(can(role, "reviewDocs")).toBe(role === "admin");
      expect(can(role, "resolveDisputes")).toBe(role === "admin");
    }
  });

  it("never grants a capability to an empty/undefined role set by accident", () => {
    for (const cap of Object.keys(CAPABILITIES) as (keyof typeof CAPABILITIES)[]) {
      expect(CAPABILITIES[cap].length).toBeGreaterThan(0);
    }
  });
});
