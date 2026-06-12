import PgBoss from "pg-boss";

/**
 * Riaya background worker (pg-boss).
 *
 * Sprint 0 wires the four queues and their schedules with stub handlers.
 * Real logic lands in later sprints:
 *   - booking.reminders  → Sprint 3/5 (remind family + caregiver 1h before)
 *   - escrow.sweep       → Sprint 4   (release escrow after dispute window)
 *   - email.digest       → Sprint 5   (Resend digests)
 *   - employer.invoice   → Sprint 4/5 (monthly employer invoices)
 */
const QUEUES = {
  bookingReminders: "booking.reminders",
  escrowSweep: "escrow.sweep",
  emailDigest: "email.digest",
  employerInvoice: "employer.invoice",
} as const;

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const boss = new PgBoss({ connectionString });
  boss.on("error", (err) => console.error("[pg-boss] error:", err));

  await boss.start();

  // pg-boss v10 requires queues to exist before work/send/schedule.
  for (const queue of Object.values(QUEUES)) {
    await boss.createQueue(queue);
  }

  await boss.work(QUEUES.bookingReminders, async ([job]) => {
    console.log("[booking.reminders] stub — job", job?.id);
  });
  await boss.work(QUEUES.escrowSweep, async ([job]) => {
    console.log("[escrow.sweep] stub — job", job?.id);
  });
  await boss.work(QUEUES.emailDigest, async ([job]) => {
    console.log("[email.digest] stub — job", job?.id);
  });
  await boss.work(QUEUES.employerInvoice, async ([job]) => {
    console.log("[employer.invoice] stub — job", job?.id);
  });

  // Periodic sweeps (UTC cron). Cadence tuned in later sprints.
  await boss.schedule(QUEUES.escrowSweep, "*/15 * * * *");
  await boss.schedule(QUEUES.emailDigest, "0 8 * * *");
  await boss.schedule(QUEUES.employerInvoice, "0 2 1 * *");

  console.log("[worker] started — queues:", Object.values(QUEUES).join(", "));

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[worker] ${signal} received, stopping…`);
    await boss.stop({ graceful: true });
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
