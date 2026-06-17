"use server";

import "server-only";

import { fail, ok } from "@/lib/action-result";
import type { ActionResult } from "@/lib/action-result";
import { notif, notifyUser } from "@/lib/notification-service";
import { requireRole } from "@/lib/session";
import { getDocumentSignedUrl, reviewDocument } from "@/lib/verification-service";
import { assertTransition } from "@riaya/booking";
import { money } from "@riaya/core";
import {
  auditLogs,
  bookings,
  caregiverProfiles,
  db,
  employerAccounts,
  escrows,
  users,
  verificationDocuments,
  withUserContext,
} from "@riaya/db";
import { assertEscrowTransition, gateway } from "@riaya/payments";
import { and, count, eq, inArray, sql, sum } from "drizzle-orm";

// ─── KPIs ────────────────────────────────────────────────────────────────────

export type AdminKPIs = {
  gmvCentimes: number;
  activeBookings: number;
  caregivers: number;
  employers: number;
  jobsEnabledHours: number;
  pendingDocs: number;
  disputedBookings: number;
  requestedBookings: number;
  totalUsers: number;
};

export async function getAdminKPIs(): Promise<AdminKPIs> {
  const user = await requireRole(["admin"]);

  return withUserContext(db, user.id, "admin", async (tx) => {
    const [gmvRow] = await tx
      .select({ total: sum(escrows.grossAmount) })
      .from(escrows)
      .where(inArray(escrows.status, ["captured", "released"]));

    const [activeRow] = await tx
      .select({ c: count() })
      .from(bookings)
      .where(inArray(bookings.status, ["confirmed", "in_progress"]));

    const [caregiversRow] = await tx.select({ c: count() }).from(caregiverProfiles);

    const [employersRow] = await tx.select({ c: count() }).from(employerAccounts);

    const [hoursRow] = await tx
      .select({
        hours: sql<number>`coalesce(sum(extract(epoch from (${bookings.endTime} - ${bookings.startTime})) / 3600), 0)`,
      })
      .from(bookings)
      .where(eq(bookings.status, "completed"));

    const [pendingDocsRow] = await tx
      .select({ c: count() })
      .from(verificationDocuments)
      .where(eq(verificationDocuments.status, "pending"));

    const [disputedRow] = await tx
      .select({ c: count() })
      .from(bookings)
      .where(eq(bookings.status, "disputed"));

    const [requestedRow] = await tx
      .select({ c: count() })
      .from(bookings)
      .where(eq(bookings.status, "requested"));

    const [usersRow] = await tx.select({ c: count() }).from(users);

    return {
      gmvCentimes: Number(gmvRow?.total ?? 0),
      activeBookings: Number(activeRow?.c ?? 0),
      caregivers: Number(caregiversRow?.c ?? 0),
      employers: Number(employersRow?.c ?? 0),
      jobsEnabledHours: Math.round(Number(hoursRow?.hours ?? 0)),
      pendingDocs: Number(pendingDocsRow?.c ?? 0),
      disputedBookings: Number(disputedRow?.c ?? 0),
      requestedBookings: Number(requestedRow?.c ?? 0),
      totalUsers: Number(usersRow?.c ?? 0),
    };
  });
}

// ─── Verification Queue ───────────────────────────────────────────────────────

export type VerificationQueueItem = {
  id: string;
  type: string;
  status: string;
  caregiverId: string;
  caregiverName: string;
  uploadedAt: Date;
  adminNote: string | null;
};

export async function getVerificationQueue(): Promise<VerificationQueueItem[]> {
  const user = await requireRole(["admin"]);

  return withUserContext(db, user.id, "admin", async (tx) => {
    const rows = await tx
      .select({
        id: verificationDocuments.id,
        type: verificationDocuments.type,
        status: verificationDocuments.status,
        caregiverId: caregiverProfiles.id,
        caregiverName: caregiverProfiles.displayName,
        uploadedAt: verificationDocuments.uploadedAt,
        adminNote: verificationDocuments.adminNote,
      })
      .from(verificationDocuments)
      .innerJoin(caregiverProfiles, eq(verificationDocuments.caregiverId, caregiverProfiles.id))
      .where(eq(verificationDocuments.status, "pending"))
      .orderBy(verificationDocuments.uploadedAt);

    return rows;
  });
}

export async function adminGetDocumentUrl(
  documentId: string
): Promise<ActionResult<{ url: string }>> {
  const user = await requireRole(["admin"]);
  return getDocumentSignedUrl(user, documentId);
}

export async function adminReviewDocument(
  documentId: string,
  decision: "approved" | "rejected",
  adminNote?: string
): Promise<ActionResult<{ caregiverId: string; level: string }>> {
  const user = await requireRole(["admin"]);
  return reviewDocument(user, documentId, decision, adminNote);
}

// ─── Dispute Queue ────────────────────────────────────────────────────────────

export type DisputeQueueItem = {
  bookingId: string;
  caregiverName: string;
  careType: string;
  startTime: Date;
  grossAmountCentimes: number;
  caregiverPayoutCentimes: number;
  escrowId: string;
  escrowStatus: string;
  capturedAt: Date | null;
};

export async function getDisputeQueue(): Promise<DisputeQueueItem[]> {
  const user = await requireRole(["admin"]);

  return withUserContext(db, user.id, "admin", async (tx) => {
    const rows = await tx
      .select({
        bookingId: bookings.id,
        caregiverName: caregiverProfiles.displayName,
        careType: bookings.careType,
        startTime: bookings.startTime,
        grossAmountCentimes: escrows.grossAmount,
        caregiverPayoutCentimes: escrows.caregiverPayout,
        escrowId: escrows.id,
        escrowStatus: escrows.status,
        capturedAt: escrows.capturedAt,
      })
      .from(bookings)
      .innerJoin(escrows, eq(escrows.bookingId, bookings.id))
      .innerJoin(caregiverProfiles, eq(bookings.caregiverId, caregiverProfiles.id))
      .where(eq(bookings.status, "disputed"))
      .orderBy(escrows.capturedAt);

    return rows;
  });
}

/**
 * Admin resolves a disputed booking.
 * - "release": pay caregiver  → booking→completed, escrow→released
 * - "refund":  return to family → booking→cancelled, escrow→refunded
 */
export async function resolveDispute(
  bookingId: string,
  resolution: "release" | "refund"
): Promise<ActionResult<{ bookingId: string }>> {
  const user = await requireRole(["admin"]);

  return withUserContext(db, user.id, "admin", async (tx) => {
    const [booking] = await tx
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.status, "disputed")))
      .limit(1);
    if (!booking) return fail("bookingNotFound");

    const [escrow] = await tx
      .select()
      .from(escrows)
      .where(eq(escrows.bookingId, bookingId))
      .limit(1);
    if (!escrow) return fail("escrowNotFound");

    const newEscrowStatus = resolution === "release" ? "released" : "refunded";
    const newBookingStatus = resolution === "release" ? "completed" : "cancelled";

    assertEscrowTransition(escrow.status as "disputed", newEscrowStatus);
    assertTransition(booking.status, newBookingStatus);

    if (resolution === "release") {
      await gateway.payout(
        money(escrow.caregiverPayout),
        { accountRef: "dev_rib", holderName: "caregiver" },
        escrow.id
      );
      await tx
        .update(escrows)
        .set({ status: "released", releasedAt: new Date() })
        .where(eq(escrows.id, escrow.id));
    } else {
      const refundAmount = money(escrow.familyPays);
      await gateway.refund(escrow.gatewayRef ?? bookingId, refundAmount, "dispute_resolved_refund");
      await tx.update(escrows).set({ status: "refunded" }).where(eq(escrows.id, escrow.id));
    }

    await tx
      .update(bookings)
      .set({ status: newBookingStatus, updatedAt: new Date() })
      .where(eq(bookings.id, bookingId));

    await tx.insert(auditLogs).values({
      actorUserId: user.id,
      entity: "escrow",
      entityId: escrow.id,
      action: resolution === "release" ? "release" : "refund",
      before: { escrowStatus: escrow.status, bookingStatus: booking.status },
      after: { escrowStatus: newEscrowStatus, bookingStatus: newBookingStatus, resolution },
    });

    const [cg] = await tx
      .select({ userId: caregiverProfiles.userId })
      .from(caregiverProfiles)
      .where(eq(caregiverProfiles.id, booking.caregiverId))
      .limit(1);

    if (cg?.userId && resolution === "release") {
      await notifyUser(user.id, cg.userId, notif.paymentReleased(booking.id));
    }

    return ok({ bookingId });
  });
}

// ─── Escrow Health ────────────────────────────────────────────────────────────

export type EscrowStatusSummary = {
  status: string;
  count: number;
  totalCentimes: number;
};

export type EscrowHealth = {
  byStatus: EscrowStatusSummary[];
  stuckAuthorized: Array<{
    escrowId: string;
    bookingId: string;
    caregiverName: string;
    authorizedAt: Date | null;
    familyPaysCentimes: number;
  }>;
};

export async function getEscrowHealth(): Promise<EscrowHealth> {
  const user = await requireRole(["admin"]);

  return withUserContext(db, user.id, "admin", async (tx) => {
    const byStatus = await tx
      .select({
        status: escrows.status,
        count: count(),
        totalCentimes: sum(escrows.grossAmount),
      })
      .from(escrows)
      .groupBy(escrows.status)
      .orderBy(escrows.status);

    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48h
    const stuckAuthorized = await tx
      .select({
        escrowId: escrows.id,
        bookingId: bookings.id,
        caregiverName: caregiverProfiles.displayName,
        authorizedAt: escrows.authorizedAt,
        familyPaysCentimes: escrows.familyPays,
      })
      .from(escrows)
      .innerJoin(bookings, eq(escrows.bookingId, bookings.id))
      .innerJoin(caregiverProfiles, eq(escrows.caregiverId, caregiverProfiles.id))
      .where(and(eq(escrows.status, "authorized"), sql`${escrows.authorizedAt} < ${cutoff}`))
      .orderBy(escrows.authorizedAt);

    return {
      byStatus: byStatus.map((r) => ({
        status: r.status,
        count: Number(r.count),
        totalCentimes: Number(r.totalCentimes ?? 0),
      })),
      stuckAuthorized,
    };
  });
}
