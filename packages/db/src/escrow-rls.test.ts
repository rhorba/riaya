import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * S4 — Escrow + employer-invoice RBAC (RLS), driven through the real `riaya_app`
 * connection. Proves the Sprint 4 money tables are SYSTEM-only for writes:
 * escrow/invoice rows can be created/updated only under an admin (system) context
 * (matching the escrow-service `withSystem` path), while booking parties / the
 * owning employer get read access and nothing more.
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
  employerUser: randomUUID(),
  employerAccount: randomUUID(),
  booking1: randomUUID(),
  booking2: randomUUID(),
};

describe.skipIf(!HAS_DB)("Escrow + invoice RBAC (S4)", () => {
  let m: typeof import("./index.js");

  beforeAll(async () => {
    m = await import("./index.js");
    const { authDb, users, caregiverProfiles, familyProfiles, employerAccounts, bookings } = m;
    const tag = Date.now();
    await authDb.insert(users).values([
      { id: id.caregiverUser, email: `cg-${tag}@es.test`, name: "CG", role: "caregiver" },
      { id: id.familyAUser, email: `fa-${tag}@es.test`, name: "FA", role: "family" },
      { id: id.familyBUser, email: `fb-${tag}@es.test`, name: "FB", role: "family" },
      { id: id.employerUser, email: `emp-${tag}@es.test`, name: "EMP", role: "employer" },
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
    await authDb.insert(employerAccounts).values({
      id: id.employerAccount,
      userId: id.employerUser,
      companyName: "Test Corp",
      benefitBudgetPerEmployee: 150000,
    });
    await authDb.insert(bookings).values([
      {
        id: id.booking1,
        caregiverId: id.caregiverProfile,
        familyId: id.familyAProfile,
        careType: "babysitter",
        startTime: new Date("2027-03-01T09:00:00Z"),
        endTime: new Date("2027-03-01T12:00:00Z"),
        childrenCount: 1,
        status: "confirmed",
      },
      {
        id: id.booking2,
        caregiverId: id.caregiverProfile,
        familyId: id.familyAProfile,
        careType: "babysitter",
        startTime: new Date("2027-03-02T09:00:00Z"),
        endTime: new Date("2027-03-02T12:00:00Z"),
        childrenCount: 1,
        status: "confirmed",
      },
    ]);
  });

  afterAll(async () => {
    if (!m) return;
    const {
      authDb,
      users,
      bookings,
      escrows,
      employerInvoices,
      employerAccounts,
      pool,
      adminPool,
    } = m;
    await authDb.delete(escrows).where(eq(escrows.caregiverId, id.caregiverProfile));
    await authDb
      .delete(employerInvoices)
      .where(eq(employerInvoices.employerAccountId, id.employerAccount));
    await authDb.delete(bookings).where(eq(bookings.caregiverId, id.caregiverProfile));
    await authDb.delete(employerAccounts).where(eq(employerAccounts.id, id.employerAccount));
    for (const userId of [id.caregiverUser, id.familyAUser, id.familyBUser, id.employerUser]) {
      await authDb.delete(users).where(eq(users.id, userId));
    }
    await Promise.all([pool.end(), adminPool.end()]);
  });

  const escrowValues = (bookingId: string) => ({
    bookingId,
    familyId: id.familyAProfile,
    caregiverId: id.caregiverProfile,
    grossAmount: 12000,
    employerSubsidy: 0,
    familyPays: 13440,
    platformFeeFromFamily: 1440,
    platformFeeFromCaregiver: 960,
    caregiverPayout: 11040,
    status: "authorized" as const,
  });

  it("a family party CANNOT create an escrow (escrow_insert is system-only)", async () => {
    const { db, withUserContext, escrows } = m;
    await expect(
      withUserContext(db, id.familyAUser, "family", (tx) =>
        tx.insert(escrows).values(escrowValues(id.booking2))
      )
    ).rejects.toThrow();
  });

  it("the system (admin) context CAN create an escrow", async () => {
    const { db, withUserContext, escrows } = m;
    const created = await withUserContext(db, id.caregiverUser, "admin", (tx) =>
      tx.insert(escrows).values(escrowValues(id.booking1)).returning({ id: escrows.id })
    );
    expect(created).toHaveLength(1);
  });

  it("escrow is readable by both booking parties but not an unrelated family", async () => {
    const { db, withUserContext, escrows } = m;
    const aView = await withUserContext(db, id.familyAUser, "family", (tx) =>
      tx.select({ id: escrows.id }).from(escrows).where(eq(escrows.bookingId, id.booking1))
    );
    expect(aView).toHaveLength(1);

    const cgView = await withUserContext(db, id.caregiverUser, "caregiver", (tx) =>
      tx.select({ id: escrows.id }).from(escrows).where(eq(escrows.bookingId, id.booking1))
    );
    expect(cgView).toHaveLength(1);

    const bView = await withUserContext(db, id.familyBUser, "family", (tx) =>
      tx.select({ id: escrows.id }).from(escrows).where(eq(escrows.bookingId, id.booking1))
    );
    expect(bView).toHaveLength(0);
  });

  it("a family party CANNOT move money — escrow_update is system-only (0 rows affected)", async () => {
    const { db, authDb, withUserContext, escrows } = m;
    await withUserContext(db, id.familyAUser, "family", (tx) =>
      tx.update(escrows).set({ status: "released" }).where(eq(escrows.bookingId, id.booking1))
    );
    // Status is unchanged: the family's UPDATE matched no rows under RLS.
    const [row] = await authDb
      .select({ status: escrows.status })
      .from(escrows)
      .where(eq(escrows.bookingId, id.booking1));
    expect(row?.status).toBe("authorized");
  });

  it("an employer CANNOT create an invoice, but the system can and the employer can read it", async () => {
    const { db, withUserContext, employerInvoices } = m;
    const invoice = {
      employerAccountId: id.employerAccount,
      periodYear: 2027,
      periodMonth: 3,
      subsidyTotal: 5000,
      bookingCount: 1,
      tva: 0,
      total: 5000,
    };

    await expect(
      withUserContext(db, id.employerUser, "employer", (tx) =>
        tx.insert(employerInvoices).values(invoice)
      )
    ).rejects.toThrow();

    const created = await withUserContext(db, id.employerUser, "admin", (tx) =>
      tx.insert(employerInvoices).values(invoice).returning({ id: employerInvoices.id })
    );
    expect(created).toHaveLength(1);

    const view = await withUserContext(db, id.employerUser, "employer", (tx) =>
      tx
        .select({ id: employerInvoices.id })
        .from(employerInvoices)
        .where(eq(employerInvoices.employerAccountId, id.employerAccount))
    );
    expect(view).toHaveLength(1);
  });
});
