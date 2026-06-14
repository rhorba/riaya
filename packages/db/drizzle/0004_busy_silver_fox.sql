ALTER TABLE "bookings" ADD COLUMN "family_ended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "caregiver_ended_at" timestamp with time zone;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap" EXCLUDE USING gist ("caregiver_id" WITH =, tstzrange("start_time", "end_time") WITH &&) WHERE ("status" IN ('confirmed', 'in_progress'));
