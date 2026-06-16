import { authDb, bookings, employerAccounts, employerInvoices, escrows } from "@riaya/db";
import { and, eq, gte, lt } from "drizzle-orm";

/**
 * Monthly employer invoice sweep (Module E / §11.4). For each employer, sums the
 * subsidies disbursed during the previous calendar month and writes one invoice
 * row. Runs on the 1st of each month (system job, privileged connection). The
 * unique (employer, year, month) index + `onConflictDoNothing` make it idempotent
 * — re-running never double-invoices. TVA is 0 in v0.1; ICE is snapshotted.
 */
export async function sweepEmployerInvoices(now: Date = new Date()): Promise<number> {
  // Target = the calendar month before `now`.
  const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const month = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth(); // 1–12
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const accounts = await authDb
    .select({ id: employerAccounts.id, ice: employerAccounts.ice })
    .from(employerAccounts);

  let created = 0;
  for (const acc of accounts) {
    const rows = await authDb
      .select({ subsidy: escrows.employerSubsidy })
      .from(escrows)
      .innerJoin(bookings, eq(escrows.bookingId, bookings.id))
      .where(
        and(
          eq(bookings.employerAccountId, acc.id),
          gte(bookings.startTime, start),
          lt(bookings.startTime, end)
        )
      );

    const subsidyTotal = rows.reduce((sum, r) => sum + (r.subsidy ?? 0), 0);
    if (subsidyTotal <= 0) continue;

    const inserted = await authDb
      .insert(employerInvoices)
      .values({
        employerAccountId: acc.id,
        periodYear: year,
        periodMonth: month,
        subsidyTotal,
        bookingCount: rows.length,
        tva: 0,
        total: subsidyTotal,
        ice: acc.ice,
        status: "issued",
      })
      .onConflictDoNothing({
        target: [
          employerInvoices.employerAccountId,
          employerInvoices.periodYear,
          employerInvoices.periodMonth,
        ],
      })
      .returning({ id: employerInvoices.id });

    if (inserted.length > 0) created++;
  }

  return created;
}
