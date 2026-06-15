ALTER TABLE "caregiver_profiles" ADD COLUMN "cancellation_free_hours" integer DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE "caregiver_profiles" ADD COLUMN "cancellation_fee_percent" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "reminder_sent_at" timestamp with time zone;
