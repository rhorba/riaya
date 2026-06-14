import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * S2-11 — Booking RBAC (RLS) + concurrency guarantee, driven through the real
 * `riaya_app` connection (RLS enforced) with `withUserContext`. `authDb`
 * (privileged) seeds fixtures and exercises the DB-level no-overlap constraint.
 *
 * Requires DATABASE_URL (riaya_app) + DATABASE_URL_ADMIN. Skips cleanly without.
 */
const HAS_DB = !!process.env.DATABASE_URL && !!process.env.DATABASE_URL_ADMIN;

const id = {
  caregiverUser: randomUUID(),
  caregiverProfile: randomUUID(),
  familyAUser: randomUUID(),
  familyAProfile: randomUUID(),
  familyBUser: randomUUID(),
  familyBProfile: randomUUID(),
};

// Fixed future window + an overlapping and a disjoint one.
const W1_START = new Date("2027-01-04T09:00:00Z");
const W1_END = new Date("2027-01-04T13:00:00Z");
const OVERLAP_START = new Date("2027-01-04T12:00:00Z");
const OVERLAP_END = new Date("2027-01-04T15:00:00Z");
const DISJOINT_START = new Date("2027-01-04T14:00:00Z");
const DISJOINT_END = new Date("2027-01-04T17:00:00Z");

describe.skipIf(!HAS_DB)("Booking RBAC + concurrency (S2-11)", () => {
  let m: typeof import("./index.js");

  beforeAll(async () => {
    m = await import("./index.js");
    const { authDb, users, caregiverProfiles, familyProfiles } = m;
    const tag = Date.now();
    await authDb.insert(users).values([
      { id: id.caregiverUser, email: `cg-${tag}@bk.test`, name: "CG", role: "caregiver" },
      { id: id.familyAUser, email: `fa-${tag}@bk.test`, name: "FA", role: "family" },
      { id: id.familyBUser, email: `fb-${tag}@bk.test`, name: "FB", role: "family" },
    ]);
    await authDb.insert(caregiverProfiles).values({
      id: id.caregiverProfile,
      userId: id.caregiverUser,
      careTypes: ["babysitter"],
      maxChildren: 3,
    });
    await authDb.insert(familyProfiles).values([
      { id: id.familyAProfile, userId: id.familyAUser, city: "Casablanca", children: [] },
      { id: id.familyBProfile, userId: id.familyBUser, city: "Rabat", children: [] },
    ]);
  });

  afterAll(async () => {
    if (!m) return;
    const { authDb, users, bookings, pool, adminPool } = m;
    // Remove bookings first (no ON DELETE cascade from users → bookings).
    await authDb.delete(bookings).where(eq(bookings.caregiverId, id.caregiverProfile));
    for (const userId of [id.caregiverUser, id.familyAUser, id.familyBUser]) {
      await authDb.delete(users).where(eq(users.id, userId)); // cascades to profiles
    }
    await Promise.all([pool.end(), adminPool.end()]);
  });

  it("a CAREGIVER cannot create a booking (booking_insert is family-only)", async () => {
    const { db, withUserContext, bookings } = m;
    await expect(
      withUserContext(db, id.caregiverUser, "caregiver", (tx) =>
        tx.insert(bookings).values({
          caregiverId: id.caregiverProfile,
          familyId: id.familyAProfile,
          careType: "babysitter",
          startTime: W1_START,
          endTime: W1_END,
          childrenCount: 1,
        })
      )
    ).rejects.toThrow();
  });

  it("a family cannot create a booking for ANOTHER family's profile", async () => {
    const { db, withUserContext, bookings } = m;
    await expect(
      withUserContext(db, id.familyAUser, "family", (tx) =>
        tx.insert(bookings).values({
          caregiverId: id.caregiverProfile,
          familyId: id.familyBProfile, // not familyA's
          careType: "babysitter",
          startTime: W1_START,
          endTime: W1_END,
          childrenCount: 1,
        })
      )
    ).rejects.toThrow();
  });

  it("a family CAN create a booking for its own profile, and the other family cannot read it", async () => {
    const { db, withUserContext, bookings } = m;
    const created = await withUserContext(db, id.familyAUser, "family", (tx) =>
      tx
        .insert(bookings)
        .values({
          caregiverId: id.caregiverProfile,
          familyId: id.familyAProfile,
          careType: "babysitter",
          startTime: W1_START,
          endTime: W1_END,
          childrenCount: 1,
        })
        .returning({ id: bookings.id })
    );
    expect(created).toHaveLength(1);
    const bookingId = created[0]?.id ?? "";
    expect(bookingId).not.toBe("");

    // Counterparty caregiver can see it…
    const cgView = await withUserContext(db, id.caregiverUser, "caregiver", (tx) =>
      tx.select({ id: bookings.id }).from(bookings).where(eq(bookings.id, bookingId))
    );
    expect(cgView).toHaveLength(1);

    // …but an unrelated family cannot.
    const fbView = await withUserContext(db, id.familyBUser, "family", (tx) =>
      tx.select({ id: bookings.id }).from(bookings).where(eq(bookings.id, bookingId))
    );
    expect(fbView).toHaveLength(0);
  });

  it("the no-overlap constraint blocks two confirmed bookings on the same slot", async () => {
    const { authDb, bookings } = m;
    // First confirmed booking holds the W1 window.
    await authDb.insert(bookings).values({
      caregiverId: id.caregiverProfile,
      familyId: id.familyAProfile,
      careType: "babysitter",
      startTime: W1_START,
      endTime: W1_END,
      childrenCount: 1,
      status: "confirmed",
    });

    // A second CONFIRMED booking overlapping the window must be rejected (23P01).
    await expect(
      authDb.insert(bookings).values({
        caregiverId: id.caregiverProfile,
        familyId: id.familyBProfile,
        careType: "babysitter",
        startTime: OVERLAP_START,
        endTime: OVERLAP_END,
        childrenCount: 1,
        status: "confirmed",
      })
    ).rejects.toThrow();

    // A disjoint confirmed booking is fine.
    const okInsert = await authDb
      .insert(bookings)
      .values({
        caregiverId: id.caregiverProfile,
        familyId: id.familyBProfile,
        careType: "babysitter",
        startTime: DISJOINT_START,
        endTime: DISJOINT_END,
        childrenCount: 1,
        status: "confirmed",
      })
      .returning({ id: bookings.id });
    expect(okInsert).toHaveLength(1);
  });

  it("a REQUESTED booking does not block the slot (only confirmed/in_progress do)", async () => {
    const { authDb, bookings } = m;
    // Two requested bookings for the exact same window are allowed — the
    // caregiver picks one to confirm.
    const rows = await authDb
      .insert(bookings)
      .values([
        {
          caregiverId: id.caregiverProfile,
          familyId: id.familyAProfile,
          careType: "babysitter",
          startTime: new Date("2027-02-01T09:00:00Z"),
          endTime: new Date("2027-02-01T12:00:00Z"),
          childrenCount: 1,
          status: "requested",
        },
        {
          caregiverId: id.caregiverProfile,
          familyId: id.familyBProfile,
          careType: "babysitter",
          startTime: new Date("2027-02-01T09:00:00Z"),
          endTime: new Date("2027-02-01T12:00:00Z"),
          childrenCount: 1,
          status: "requested",
        },
      ])
      .returning({ id: bookings.id });
    expect(rows).toHaveLength(2);
  });
});
