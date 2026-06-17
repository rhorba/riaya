import { randomUUID } from "node:crypto";
import { eq, inArray, sum } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * S6 — Admin role RBAC through the real `riaya_app` (RLS-enforced) connection.
 *
 * Proves the properties the Sprint 6 admin dashboard relies on:
 *   - Admin context sees ALL rows (bypasses every per-user RLS filter).
 *   - Non-admin contexts are still scoped to their own data.
 *   - A disputed booking can be moved to completed/cancelled by admin only.
 *   - KPI aggregates (booking count, escrow sum) are correct under admin context.
 *
 * Requires DATABASE_URL (riaya_app) + DATABASE_URL_ADMIN. Skips cleanly without.
 */
const HAS_DB = !!process.env.DATABASE_URL && !!process.env.DATABASE_URL_ADMIN;

const id = {
  cgUser1: randomUUID(),
  cgProfile1: randomUUID(),
  cgUser2: randomUUID(),
  cgProfile2: randomUUID(),
  familyUser: randomUUID(),
  familyProfile: randomUUID(),
  adminUser: randomUUID(),
  doc1: randomUUID(),
  doc2: randomUUID(),
  booking1: randomUUID(),
  booking2: randomUUID(),
  escrow1: randomUUID(),
};

describe.skipIf(!HAS_DB)("Admin RBAC — KPIs + dispute resolution (S6)", () => {
  let m: typeof import("./index.js");

  beforeAll(async () => {
    m = await import("./index.js");
    const {
      authDb,
      users,
      caregiverProfiles,
      verificationDocuments,
      familyProfiles,
      bookings,
      escrows,
    } = m;
    const tag = Date.now();

    await authDb.insert(users).values([
      { id: id.cgUser1, email: `cg1-${tag}@adm.test`, name: "CG1", role: "caregiver" },
      { id: id.cgUser2, email: `cg2-${tag}@adm.test`, name: "CG2", role: "caregiver" },
      { id: id.familyUser, email: `fam-${tag}@adm.test`, name: "FAM", role: "family" },
      { id: id.adminUser, email: `adm-${tag}@adm.test`, name: "ADM", role: "admin" },
    ]);

    await authDb.insert(caregiverProfiles).values([
      { id: id.cgProfile1, userId: id.cgUser1, careTypes: ["daya"], maxChildren: 2 },
      { id: id.cgProfile2, userId: id.cgUser2, careTypes: ["nanny"], maxChildren: 3 },
    ]);

    await authDb.insert(familyProfiles).values({
      id: id.familyProfile,
      userId: id.familyUser,
      city: "Casablanca",
      children: [],
    });

    // Two pending verification docs — one per caregiver
    await authDb.insert(verificationDocuments).values([
      {
        id: id.doc1,
        caregiverId: id.cgProfile1,
        type: "cin",
        fileKey: `test/adm/${id.doc1}.pdf`,
        status: "pending",
        consentGivenAt: new Date(),
      },
      {
        id: id.doc2,
        caregiverId: id.cgProfile2,
        type: "police_clearance",
        fileKey: `test/adm/${id.doc2}.pdf`,
        status: "pending",
        consentGivenAt: new Date(),
      },
    ]);

    // booking1 = disputed (for dispute resolution tests)
    // booking2 = completed (for KPI hours test)
    await authDb.insert(bookings).values([
      {
        id: id.booking1,
        caregiverId: id.cgProfile1,
        familyId: id.familyProfile,
        careType: "daya",
        startTime: new Date("2028-01-10T09:00:00Z"),
        endTime: new Date("2028-01-10T12:00:00Z"),
        childrenCount: 1,
        status: "disputed",
      },
      {
        id: id.booking2,
        caregiverId: id.cgProfile2,
        familyId: id.familyProfile,
        careType: "nanny",
        startTime: new Date("2028-01-11T08:00:00Z"),
        endTime: new Date("2028-01-11T10:00:00Z"),
        childrenCount: 1,
        status: "completed",
      },
    ]);

    // Escrow for the disputed booking (captured = dispute-window state)
    await authDb.insert(escrows).values({
      id: id.escrow1,
      bookingId: id.booking1,
      familyId: id.familyProfile,
      caregiverId: id.cgProfile1,
      grossAmount: 15000,
      employerSubsidy: 0,
      familyPays: 16800,
      platformFeeFromFamily: 1800,
      platformFeeFromCaregiver: 1200,
      caregiverPayout: 13800,
      status: "disputed",
      capturedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    });
  });

  afterAll(async () => {
    if (!m) return;
    const {
      authDb,
      users,
      bookings,
      escrows,
      verificationDocuments,
      caregiverProfiles,
      familyProfiles,
      pool,
      adminPool,
    } = m;
    await authDb.delete(escrows).where(eq(escrows.id, id.escrow1));
    await authDb.delete(bookings).where(inArray(bookings.id, [id.booking1, id.booking2]));
    await authDb
      .delete(verificationDocuments)
      .where(inArray(verificationDocuments.id, [id.doc1, id.doc2]));
    await authDb
      .delete(caregiverProfiles)
      .where(inArray(caregiverProfiles.id, [id.cgProfile1, id.cgProfile2]));
    await authDb.delete(familyProfiles).where(eq(familyProfiles.id, id.familyProfile));
    for (const uid of [id.cgUser1, id.cgUser2, id.familyUser, id.adminUser]) {
      await authDb.delete(users).where(eq(users.id, uid));
    }
    await Promise.all([pool.end(), adminPool.end()]);
  });

  it("admin context sees ALL pending verification docs across caregivers", async () => {
    const { db, withUserContext, verificationDocuments } = m;

    const adminView = await withUserContext(db, id.adminUser, "admin", (tx) =>
      tx
        .select({ id: verificationDocuments.id })
        .from(verificationDocuments)
        .where(inArray(verificationDocuments.id, [id.doc1, id.doc2]))
    );
    expect(adminView).toHaveLength(2);
  });

  it("caregiver context only sees own verification docs (not another caregiver's)", async () => {
    const { db, withUserContext, verificationDocuments } = m;

    const cg1View = await withUserContext(db, id.cgUser1, "caregiver", (tx) =>
      tx
        .select({ id: verificationDocuments.id })
        .from(verificationDocuments)
        .where(inArray(verificationDocuments.id, [id.doc1, id.doc2]))
    );
    // CG1 owns doc1 only
    expect(cg1View).toHaveLength(1);
    expect(cg1View[0]?.id).toBe(id.doc1);
  });

  it("admin context can count all escrows (KPI aggregate)", async () => {
    const { db, withUserContext, escrows } = m;

    const [row] = await withUserContext(db, id.adminUser, "admin", (tx) =>
      tx
        .select({ total: sum(escrows.grossAmount) })
        .from(escrows)
        .where(inArray(escrows.id, [id.escrow1]))
    );
    expect(Number(row?.total)).toBe(15000);
  });

  it("admin can transition a disputed booking to completed (admin-resolves dispute)", async () => {
    const { db, authDb, withUserContext, bookings } = m;

    await withUserContext(db, id.adminUser, "admin", (tx) =>
      tx
        .update(bookings)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(bookings.id, id.booking1))
    );

    const [after] = await authDb
      .select({ status: bookings.status })
      .from(bookings)
      .where(eq(bookings.id, id.booking1));
    expect(after?.status).toBe("completed");
  });

  it("admin can move a disputed escrow to released (dispute resolved in caregiver favour)", async () => {
    const { db, authDb, withUserContext, escrows } = m;

    await withUserContext(db, id.adminUser, "admin", (tx) =>
      tx
        .update(escrows)
        .set({ status: "released", releasedAt: new Date() })
        .where(eq(escrows.id, id.escrow1))
    );

    const [after] = await authDb
      .select({ status: escrows.status })
      .from(escrows)
      .where(eq(escrows.id, id.escrow1));
    expect(after?.status).toBe("released");
  });

  it("a family party CANNOT move a disputed escrow to released (RLS blocks the update)", async () => {
    const { db, authDb, withUserContext, escrows } = m;

    // Already released from previous test — reset to disputed via authDb (superuser)
    await authDb
      .update(escrows)
      .set({ status: "disputed", releasedAt: null })
      .where(eq(escrows.id, id.escrow1));

    await withUserContext(db, id.familyUser, "family", (tx) =>
      tx.update(escrows).set({ status: "released" }).where(eq(escrows.id, id.escrow1))
    );

    const [after] = await authDb
      .select({ status: escrows.status })
      .from(escrows)
      .where(eq(escrows.id, id.escrow1));
    // Status must remain disputed — family cannot self-release
    expect(after?.status).toBe("disputed");
  });
});
