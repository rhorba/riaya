import "server-only";

import { type ActionResult, fail, ok } from "@/lib/action-result";
import { sendPayoutReceiptEmail } from "@/lib/email-service";
import { releaseEscrowForBooking } from "@/lib/escrow-service";
import { notif, notifyUser } from "@/lib/notification-service";
import type { SessionUser } from "@/lib/session";
import { ReviewCreateSchema } from "@riaya/core";
import {
  type Tx,
  bookings,
  caregiverProfiles,
  db,
  familyProfiles,
  reviews,
  users,
  withUserContext,
} from "@riaya/db";
import { and, avg, count, eq } from "drizzle-orm";

/**
 * Mutual reviews (Module G, Sprint 5). Reviews are post-completion ONLY and feed
 * both the caregiver's rating and the escrow release branch (Riaya non-negotiable
 * #6: escrow releases once BOTH parties review OR the 24h window elapses).
 *
 * Runs under a system context because a caregiver can't read the family's user
 * row (and vice-versa) to resolve the reviewee. Authorization is enforced
 * MANUALLY here: the caller must actually be the booking party matching their
 * role (the wrapping action already pins the role server-side). The `reviews`
 * insert still satisfies `reviews_write` (reviewer_id = app_user()).
 */
function withSystem<T>(actorUserId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return withUserContext(db, actorUserId, "admin", fn);
}

/** Recompute a caregiver's avgRating (0–500) + reviewCount from family reviews. */
async function recomputeRating(
  tx: Tx,
  caregiverUserId: string,
  caregiverId: string
): Promise<void> {
  const [agg] = await tx
    .select({ avg: avg(reviews.rating), n: count() })
    .from(reviews)
    .where(and(eq(reviews.revieweeId, caregiverUserId), eq(reviews.reviewerRole, "family")));

  const avgStars = agg?.avg ? Number(agg.avg) : 0;
  await tx
    .update(caregiverProfiles)
    .set({ avgRating: Math.round(avgStars * 100), reviewCount: Number(agg?.n ?? 0) })
    .where(eq(caregiverProfiles.id, caregiverId));
}

export async function submitReview(
  user: SessionUser,
  bookingId: string,
  input: unknown,
  reviewerRole: "family" | "caregiver"
): Promise<ActionResult<{ released: boolean }>> {
  const parsed = ReviewCreateSchema.safeParse({
    ...(typeof input === "object" && input !== null ? input : {}),
    bookingId,
  });
  if (!parsed.success) return fail("invalidInput");
  if (user.role !== reviewerRole) return fail("forbidden");

  const result = await withSystem(user.id, async (tx) => {
    const [booking] = await tx
      .select({
        id: bookings.id,
        status: bookings.status,
        caregiverId: bookings.caregiverId,
        familyId: bookings.familyId,
      })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    if (!booking) return fail("bookingNotFound");
    if (booking.status !== "completed") return fail("notCompleted");

    const [cg] = await tx
      .select({ userId: caregiverProfiles.userId })
      .from(caregiverProfiles)
      .where(eq(caregiverProfiles.id, booking.caregiverId))
      .limit(1);
    const [fam] = await tx
      .select({ userId: familyProfiles.userId })
      .from(familyProfiles)
      .where(eq(familyProfiles.id, booking.familyId))
      .limit(1);
    if (!cg || !fam) return fail("bookingNotFound");

    // Authorize: the reviewer must BE the party they claim to be.
    const reviewerUserId = reviewerRole === "family" ? fam.userId : cg.userId;
    if (reviewerUserId !== user.id) return fail("forbidden");
    const revieweeId = reviewerRole === "family" ? cg.userId : fam.userId;

    // One review per party per booking.
    const existing = await tx
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.bookingId, bookingId), eq(reviews.reviewerId, user.id)))
      .limit(1);
    if (existing.length > 0) return fail("alreadyReviewed");

    await tx.insert(reviews).values({
      bookingId,
      reviewerId: user.id,
      revieweeId,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
      reviewerRole,
    });

    // A family review of the caregiver updates the caregiver's public rating.
    if (reviewerRole === "family") {
      await recomputeRating(tx, cg.userId, booking.caregiverId);
    }

    // Both parties reviewed? (distinct roles among this booking's reviews)
    const roles = await tx
      .selectDistinct({ role: reviews.reviewerRole })
      .from(reviews)
      .where(eq(reviews.bookingId, bookingId));
    const bothReviewed = roles.length >= 2;

    return ok({ bothReviewed });
  });

  if (!result.ok) return result;

  // Both reviewed → release escrow early (24h sweep is the fallback otherwise).
  if (result.data.bothReviewed) {
    const released = await releaseEscrowForBooking(user.id, bookingId);
    const payeeUserId = released.caregiverUserId;
    if (released.released && payeeUserId) {
      await notifyUser(user.id, payeeUserId, notif.paymentReleased(bookingId));
      const cgUser = await withSystem(user.id, async (tx) => {
        const [u] = await tx
          .select({ email: users.email, name: users.name })
          .from(users)
          .where(eq(users.id, payeeUserId))
          .limit(1);
        return u;
      });
      if (cgUser) await sendPayoutReceiptEmail(cgUser.email, cgUser.name, released.payout);
    }
    return ok({ released: released.released });
  }

  return ok({ released: false });
}
