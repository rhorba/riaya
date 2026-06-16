"use server";

import { withRoleTx } from "@/lib/db";
import { bookings, caregiverProfiles, escrows } from "@riaya/db";
import { desc, eq } from "drizzle-orm";

export type EarningRow = {
  id: string;
  status: (typeof escrows.$inferSelect)["status"];
  caregiverPayout: number;
  cancellationFee: number;
  careType: (typeof bookings.$inferSelect)["careType"];
  startTime: Date;
};

export type Earnings = {
  rows: EarningRow[];
  /** Already released to the caregiver. */
  paidOut: number;
  /** Authorized/captured — owed once sessions complete + release. */
  upcoming: number;
  /** Cancellation compensation kept on refunded bookings. */
  compensation: number;
};

/**
 * Caregiver earnings (Module E). Reads the caregiver's own escrow rows (RLS lets
 * a caregiver party read their escrows) and rolls them up by status. All amounts
 * are integer centimes — formatted on display.
 */
export const getCaregiverEarnings = withRoleTx(
  ["caregiver"],
  async (tx, user): Promise<Earnings> => {
    const [profile] = await tx
      .select({ id: caregiverProfiles.id })
      .from(caregiverProfiles)
      .where(eq(caregiverProfiles.userId, user.id))
      .limit(1);
    if (!profile) return { rows: [], paidOut: 0, upcoming: 0, compensation: 0 };

    const rows = await tx
      .select({
        id: escrows.id,
        status: escrows.status,
        caregiverPayout: escrows.caregiverPayout,
        cancellationFee: escrows.cancellationFee,
        careType: bookings.careType,
        startTime: bookings.startTime,
      })
      .from(escrows)
      .innerJoin(bookings, eq(escrows.bookingId, bookings.id))
      .where(eq(escrows.caregiverId, profile.id))
      .orderBy(desc(bookings.startTime));

    let paidOut = 0;
    let upcoming = 0;
    let compensation = 0;
    for (const r of rows) {
      if (r.status === "released") paidOut += r.caregiverPayout;
      else if (r.status === "authorized" || r.status === "captured") upcoming += r.caregiverPayout;
      if (r.status === "refunded") compensation += r.cancellationFee;
    }

    return { rows, paidOut, upcoming, compensation };
  }
);
