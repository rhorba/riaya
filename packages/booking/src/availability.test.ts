import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// NOTE: `./availability.js` transitively imports the @riaya/db client (which
// throws if DATABASE_URL is unset), so it must be imported dynamically inside
// `beforeAll` — never statically — or the suite fails at collection when skipped.
type CheckAvailability = typeof import("./availability.js").checkAvailability;

/**
 * checkAvailability against a live DB, run under the CAREGIVER context (the
 * authoritative view — a caregiver can see all of their own bookings via RLS).
 * Skips cleanly without DATABASE_URL / DATABASE_URL_ADMIN.
 */
const HAS_DB = !!process.env.DATABASE_URL && !!process.env.DATABASE_URL_ADMIN;

const id = {
  caregiverUser: randomUUID(),
  caregiverProfile: randomUUID(),
  familyUser: randomUUID(),
  familyProfile: randomUUID(),
};

const BOOKED_START = new Date("2027-03-10T09:00:00Z");
const BOOKED_END = new Date("2027-03-10T13:00:00Z");

describe.skipIf(!HAS_DB)("checkAvailability", () => {
  let m: typeof import("@riaya/db");
  let checkAvailability: CheckAvailability;

  beforeAll(async () => {
    m = await import("@riaya/db");
    ({ checkAvailability } = await import("./availability.js"));
    const { authDb, users, caregiverProfiles, familyProfiles, bookings } = m;
    const tag = Date.now();
    await authDb.insert(users).values([
      { id: id.caregiverUser, email: `cg-${tag}@av.test`, name: "CG", role: "caregiver" },
      { id: id.familyUser, email: `fa-${tag}@av.test`, name: "FA", role: "family" },
    ]);
    await authDb
      .insert(caregiverProfiles)
      .values({ id: id.caregiverProfile, userId: id.caregiverUser, careTypes: ["babysitter"] });
    await authDb
      .insert(familyProfiles)
      .values({ id: id.familyProfile, userId: id.familyUser, city: "Casablanca", children: [] });
    await authDb.insert(bookings).values({
      caregiverId: id.caregiverProfile,
      familyId: id.familyProfile,
      careType: "babysitter",
      startTime: BOOKED_START,
      endTime: BOOKED_END,
      childrenCount: 1,
      status: "confirmed",
    });
  });

  afterAll(async () => {
    if (!m) return;
    const { authDb, users, bookings, pool, adminPool } = m;
    await authDb.delete(bookings).where(eq(bookings.caregiverId, id.caregiverProfile));
    for (const userId of [id.caregiverUser, id.familyUser]) {
      await authDb.delete(users).where(eq(users.id, userId));
    }
    await Promise.all([pool.end(), adminPool.end()]);
  });

  it("reports a window overlapping a confirmed booking as unavailable", async () => {
    const { db, withUserContext } = m;
    const result = await withUserContext(db, id.caregiverUser, "caregiver", (tx) =>
      checkAvailability(
        tx,
        id.caregiverProfile,
        new Date("2027-03-10T12:00:00Z"),
        new Date("2027-03-10T15:00:00Z")
      )
    );
    expect(result).toEqual({ available: false, reason: "already_booked" });
  });

  it("reports a disjoint future window as available", async () => {
    const { db, withUserContext } = m;
    const result = await withUserContext(db, id.caregiverUser, "caregiver", (tx) =>
      checkAvailability(
        tx,
        id.caregiverProfile,
        new Date("2027-03-10T14:00:00Z"),
        new Date("2027-03-10T17:00:00Z")
      )
    );
    expect(result).toEqual({ available: true });
  });

  it("rejects an invalid range and a past start", async () => {
    const { db, withUserContext } = m;
    const invalid = await withUserContext(db, id.caregiverUser, "caregiver", (tx) =>
      checkAvailability(tx, id.caregiverProfile, BOOKED_END, BOOKED_START)
    );
    expect(invalid).toEqual({ available: false, reason: "invalid_range" });

    const past = await withUserContext(db, id.caregiverUser, "caregiver", (tx) =>
      checkAvailability(
        tx,
        id.caregiverProfile,
        new Date("2000-01-01T09:00:00Z"),
        new Date("2000-01-01T11:00:00Z")
      )
    );
    expect(past).toEqual({ available: false, reason: "in_past" });
  });
});
