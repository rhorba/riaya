import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * S0-16 — Role isolation proven through the REAL app code paths:
 *   - `db` connects as the non-superuser `riaya_app` → RLS enforced.
 *   - `withUserContext()` sets the GUCs and runs the query on the SAME tx
 *     connection (verifies the Sprint-1 fix to the connection-binding bug).
 *   - `authDb` (privileged) seeds fixtures, bypassing RLS.
 *
 * Requires a live DB with both DATABASE_URL (riaya_app) and DATABASE_URL_ADMIN.
 * `@riaya/db` is imported dynamically so the suite SKIPS cleanly (no client
 * construction) when the DB env is absent.
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
};

describe.skipIf(!HAS_DB)("RLS role isolation (S0-16)", () => {
  let m: typeof import("./index.js");

  beforeAll(async () => {
    m = await import("./index.js");
    const { authDb, users, caregiverProfiles, verificationDocuments, familyProfiles } = m;

    const tag = Date.now();
    await authDb.insert(users).values([
      { id: id.caregiverUser, email: `cg-${tag}@rls.test`, name: "CG", role: "caregiver" },
      { id: id.familyAUser, email: `fa-${tag}@rls.test`, name: "FA", role: "family" },
      { id: id.familyBUser, email: `fb-${tag}@rls.test`, name: "FB", role: "family" },
      { id: id.admin, email: `ad-${tag}@rls.test`, name: "AD", role: "admin" },
    ]);
    await authDb
      .insert(caregiverProfiles)
      .values({ id: id.caregiverProfile, userId: id.caregiverUser });
    await authDb.insert(verificationDocuments).values({
      id: id.doc,
      caregiverId: id.caregiverProfile,
      type: "cin",
      fileKey: "private/cin/secret.pdf",
      consentGivenAt: new Date(),
    });
    await authDb.insert(familyProfiles).values([
      {
        id: id.familyAProfile,
        userId: id.familyAUser,
        city: "Casablanca",
        children: [{ id: "c1", name: "Yasmine", ageMonths: 24 }],
      },
      { id: id.familyBProfile, userId: id.familyBUser, city: "Rabat", children: [] },
    ]);
  });

  afterAll(async () => {
    if (!m) return;
    const { authDb, users, adminPool, pool } = m;
    for (const userId of [id.caregiverUser, id.familyAUser, id.familyBUser, id.admin]) {
      await authDb.delete(users).where(eq(users.id, userId)); // cascades
    }
    await Promise.all([pool.end(), adminPool.end()]);
  });

  it("family CANNOT read a caregiver's CIN document", async () => {
    const { db, withUserContext, verificationDocuments } = m;
    const rows = await withUserContext(db, id.familyAUser, "family", (tx) =>
      tx
        .select({ id: verificationDocuments.id })
        .from(verificationDocuments)
        .where(eq(verificationDocuments.id, id.doc))
    );
    expect(rows).toHaveLength(0);
  });

  it("caregiver owner CAN read their own CIN document", async () => {
    const { db, withUserContext, verificationDocuments } = m;
    const rows = await withUserContext(db, id.caregiverUser, "caregiver", (tx) =>
      tx
        .select({ id: verificationDocuments.id })
        .from(verificationDocuments)
        .where(eq(verificationDocuments.id, id.doc))
    );
    expect(rows).toHaveLength(1);
  });

  it("admin CAN read any CIN document", async () => {
    const { db, withUserContext, verificationDocuments } = m;
    const rows = await withUserContext(db, id.admin, "admin", (tx) =>
      tx
        .select({ id: verificationDocuments.id })
        .from(verificationDocuments)
        .where(eq(verificationDocuments.id, id.doc))
    );
    expect(rows).toHaveLength(1);
  });

  it("family CANNOT read another family's profile (children data)", async () => {
    const { db, withUserContext, familyProfiles } = m;
    const rows = await withUserContext(db, id.familyAUser, "family", (tx) =>
      tx
        .select({ id: familyProfiles.id })
        .from(familyProfiles)
        .where(eq(familyProfiles.id, id.familyBProfile))
    );
    expect(rows).toHaveLength(0);
  });

  it("family CAN read their own profile", async () => {
    const { db, withUserContext, familyProfiles } = m;
    const rows = await withUserContext(db, id.familyAUser, "family", (tx) =>
      tx
        .select({ id: familyProfiles.id })
        .from(familyProfiles)
        .where(eq(familyProfiles.id, id.familyAProfile))
    );
    expect(rows).toHaveLength(1);
  });

  it("RLS denies users.role = 'admin' self-signup via the app role", async () => {
    const { db, withUserContext, users } = m;
    // No user context → not admin → users_insert WITH CHECK (role <> 'admin') fails.
    await expect(
      withUserContext(db, id.familyAUser, "family", (tx) =>
        tx.insert(users).values({
          email: `evil-${Date.now()}@rls.test`,
          name: "Evil",
          role: "admin",
        })
      )
    ).rejects.toThrow();
  });
});
