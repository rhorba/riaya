import type { Money } from "@riaya/core";
import { auditLogs, authDb, caregiverProfiles, escrows } from "@riaya/db";
import { assertEscrowTransition, gateway } from "@riaya/payments";
import { and, eq, isNotNull, lte } from "drizzle-orm";

/**
 * Escrow release sweep (Module E, Sprint 4). Releases every `captured` escrow
 * whose 24h dispute window has elapsed: pays the caregiver and transitions the
 * escrow to `released`. v0.1 has no reviews yet, so the dispute-window timeout is
 * the sole release trigger (the "OR 24h" branch of "both reviews OR 24h").
 *
 * Runs on the privileged connection (system job, RLS bypassed). The escrow status
 * update and its AuditLog commit in one transaction (Riaya non-negotiable #4); a
 * guarded `WHERE status = 'captured'` makes a concurrent/duplicate sweep a no-op.
 * Payout happens only from the CAPTURED state — never from pending/authorized.
 */
export async function sweepEscrowReleases(now: Date = new Date()): Promise<number> {
  const due = await authDb
    .select({
      id: escrows.id,
      caregiverId: escrows.caregiverId,
      caregiverPayout: escrows.caregiverPayout,
      caregiverUserId: caregiverProfiles.userId,
    })
    .from(escrows)
    .innerJoin(caregiverProfiles, eq(escrows.caregiverId, caregiverProfiles.id))
    .where(
      and(
        eq(escrows.status, "captured"),
        isNotNull(escrows.disputeWindowEndsAt),
        lte(escrows.disputeWindowEndsAt, now)
      )
    );

  let released = 0;
  for (const e of due) {
    assertEscrowTransition("captured", "released");
    await gateway.payout(
      e.caregiverPayout as Money,
      { accountRef: "dev_rib", holderName: "caregiver" },
      e.id
    );

    await authDb.transaction(async (tx) => {
      // Guarded update: skip if another sweep already released this escrow.
      const updated = await tx
        .update(escrows)
        .set({ status: "released", releasedAt: now })
        .where(and(eq(escrows.id, e.id), eq(escrows.status, "captured")))
        .returning({ id: escrows.id });
      if (updated.length === 0) return;

      // System action attributed to the payee caregiver's user (no human actor).
      await tx.insert(auditLogs).values({
        actorUserId: e.caregiverUserId,
        entity: "escrow",
        entityId: e.id,
        action: "release",
        before: { status: "captured" },
        after: { status: "released", payout: e.caregiverPayout },
      });
      released++;
    });
  }

  return released;
}
