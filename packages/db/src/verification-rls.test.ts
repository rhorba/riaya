import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * S5 — Verification documents, access-audit, and review RBAC through the real
 * `riaya_app` (RLS-enforced) connection.
 *
 * Proves the policies the Sprint 5 services rely on:
 *   - CIN docs are owner+admin ONLY (the `getDocumentSignedUrl` 403 path) and
 *     write-locked to admin for review (the `reviewDocument` path).
 *   - access_audit_logs are append-only by anyone but readable by admin only.
 *   - reviews can only be written by the reviewer themselves (reviewer_id check).
 *
 * Requires DATABASE_URL (riaya_app) + DATABASE_URL_ADMIN. Skips cleanly without.
 */
const HAS_DB = !!process.env.DATABASE_URL && !!process.env.DATABASE_URL_ADMIN;

const id = {
  caregiverUser: randomUUID(),
  caregiverProfile: randomUUID(),
  doc: randomUUID(),
  familyAUser: randomUUID(),
  familyAProfile: randomUUID(),
  familyBUser: randomUUID(),
  familyBProfile: randomUUID(),
  admin: randomUUID(),
  booking: randomUUID(),
};

describe.skipIf(!HAS_DB)("Verification + review RBAC (S5)", () => {
  let m: typeof import("./index.js");

  beforeAll(async () => {
    m = await import("./index.js");
    const { authDb, users, caregiverProfiles, verificationDocuments, familyProfiles, bookings } = m;
    const tag = Date.now();
    await authDb.insert(users).values([
      { id: id.caregiverUser, email: `cg-${tag}@vf.test`, name: "CG", role: "caregiver" },
      { id: id.familyAUser, email: `fa-${tag}@vf.test`, name: "FA", role: "family" },
      { id: id.familyBUser, email: `fb-${tag}@vf.test`, name: "FB", role: "family" },
      { id: id.admin, email: `ad-${tag}@vf.test`, name: "AD", role: "admin" },
    ]);
    await authDb.insert(caregiverProfiles).values({
      id: id.caregiverProfile,
      userId: id.caregiverUser,
      careTypes: ["daya"],
      maxChildren: 3,
    });
    await authDb.insert(verificationDocuments).values({
      id: id.doc,
      caregiverId: id.caregiverProfile,
      type: "cin",
      fileKey: "verification/secret/cin.pdf",
      status: "pending",
      consentGivenAt: new Date(),
    });
    await authDb.insert(familyProfiles).values([
      { id: id.familyAProfile, userId: id.familyAUser, city: "Casablanca", children: [] },
      { id: id.familyBProfile, userId: id.familyBUser, city: "Rabat", children: [] },
    ]);
    await authDb.insert(bookings).values({
      id: id.booking,
      caregiverId: id.caregiverProfile,
      familyId: id.familyAProfile,
      careType: "daya",
      startTime: new Date("2027-04-01T09:00:00Z"),
      endTime: new Date("2027-04-01T12:00:00Z"),
      childrenCount: 1,
      status: "completed",
    });
  });

  afterAll(async () => {
    if (!m) return;
    const {
      authDb,
      users,
      reviews,
      bookings,
      accessAuditLogs,
      verificationDocuments,
      caregiverProfiles,
      familyProfiles,
      pool,
      adminPool,
    } = m;
    await authDb.delete(reviews).where(eq(reviews.bookingId, id.booking));
    await authDb.delete(accessAuditLogs).where(eq(accessAuditLogs.documentId, id.doc));
    await authDb.delete(bookings).where(eq(bookings.id, id.booking));
    await authDb.delete(verificationDocuments).where(eq(verificationDocuments.id, id.doc));
    await authDb.delete(caregiverProfiles).where(eq(caregiverProfiles.id, id.caregiverProfile));
    await authDb.delete(familyProfiles).where(eq(familyProfiles.id, id.familyAProfile));
    await authDb.delete(familyProfiles).where(eq(familyProfiles.id, id.familyBProfile));
    for (const userId of [id.caregiverUser, id.familyAUser, id.familyBUser, id.admin]) {
      await authDb.delete(users).where(eq(users.id, userId));
    }
    await Promise.all([pool.end(), adminPool.end()]);
  });

  it("CIN doc is readable by the owner caregiver and admin, but NOT by an unrelated family (403 path)", async () => {
    const { db, withUserContext, verificationDocuments } = m;

    const ownerView = await withUserContext(db, id.caregiverUser, "caregiver", (tx) =>
      tx
        .select({ id: verificationDocuments.id })
        .from(verificationDocuments)
        .where(eq(verificationDocuments.id, id.doc))
    );
    expect(ownerView).toHaveLength(1);

    const adminView = await withUserContext(db, id.admin, "admin", (tx) =>
      tx
        .select({ id: verificationDocuments.id })
        .from(verificationDocuments)
        .where(eq(verificationDocuments.id, id.doc))
    );
    expect(adminView).toHaveLength(1);

    const familyView = await withUserContext(db, id.familyAUser, "family", (tx) =>
      tx
        .select({ id: verificationDocuments.id })
        .from(verificationDocuments)
        .where(eq(verificationDocuments.id, id.doc))
    );
    expect(familyView).toHaveLength(0);
  });

  it("a caregiver CANNOT change their own document status (docs_update is admin-only)", async () => {
    const { db, authDb, withUserContext, verificationDocuments } = m;
    await withUserContext(db, id.caregiverUser, "caregiver", (tx) =>
      tx
        .update(verificationDocuments)
        .set({ status: "approved" })
        .where(eq(verificationDocuments.id, id.doc))
    );
    const [row] = await authDb
      .select({ status: verificationDocuments.status })
      .from(verificationDocuments)
      .where(eq(verificationDocuments.id, id.doc));
    expect(row?.status).toBe("pending"); // unchanged — RLS matched no rows

    // Admin CAN update it.
    await withUserContext(db, id.admin, "admin", (tx) =>
      tx
        .update(verificationDocuments)
        .set({ status: "approved" })
        .where(eq(verificationDocuments.id, id.doc))
    );
    const [after] = await authDb
      .select({ status: verificationDocuments.status })
      .from(verificationDocuments)
      .where(eq(verificationDocuments.id, id.doc));
    expect(after?.status).toBe("approved");
  });

  it("access-audit rows are append-only by the actor but readable only by admin", async () => {
    const { db, withUserContext, accessAuditLogs } = m;

    // The owner generating a signed URL writes an audit row (mirrors the service).
    await withUserContext(db, id.caregiverUser, "caregiver", (tx) =>
      tx.insert(accessAuditLogs).values({
        actorUserId: id.caregiverUser,
        documentId: id.doc,
        fileKey: "verification/secret/cin.pdf",
        action: "signed_url_generated",
      })
    );

    // The actor cannot READ the access log (admin-only read).
    const selfRead = await withUserContext(db, id.caregiverUser, "caregiver", (tx) =>
      tx
        .select({ id: accessAuditLogs.id })
        .from(accessAuditLogs)
        .where(eq(accessAuditLogs.documentId, id.doc))
    );
    expect(selfRead).toHaveLength(0);

    // Admin can read it.
    const adminRead = await withUserContext(db, id.admin, "admin", (tx) =>
      tx
        .select({ id: accessAuditLogs.id })
        .from(accessAuditLogs)
        .where(eq(accessAuditLogs.documentId, id.doc))
    );
    expect(adminRead.length).toBeGreaterThanOrEqual(1);
  });

  it("a review can only be written with reviewer_id = the acting user", async () => {
    const { db, withUserContext, reviews } = m;

    // Family A reviews the caregiver as THEMSELVES → allowed.
    const okInsert = await withUserContext(db, id.familyAUser, "family", (tx) =>
      tx
        .insert(reviews)
        .values({
          bookingId: id.booking,
          reviewerId: id.familyAUser,
          revieweeId: id.caregiverUser,
          rating: 5,
          reviewerRole: "family",
        })
        .returning({ id: reviews.id })
    );
    expect(okInsert).toHaveLength(1);

    // Family A tries to forge a review authored by Family B → rejected by RLS.
    await expect(
      withUserContext(db, id.familyAUser, "family", (tx) =>
        tx.insert(reviews).values({
          bookingId: id.booking,
          reviewerId: id.familyBUser,
          revieweeId: id.caregiverUser,
          rating: 1,
          reviewerRole: "family",
        })
      )
    ).rejects.toThrow();

    // Reviews are public (trust signal) — readable without being a party.
    const publicRead = await withUserContext(db, id.familyBUser, "family", (tx) =>
      tx
        .select({ id: reviews.id })
        .from(reviews)
        .where(and(eq(reviews.bookingId, id.booking)))
    );
    expect(publicRead.length).toBeGreaterThanOrEqual(1);
  });
});
