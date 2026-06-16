ALTER TABLE "escrows" ADD COLUMN "cancellation_fee" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE TABLE "employer_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_account_id" uuid NOT NULL,
	"period_year" integer NOT NULL,
	"period_month" integer NOT NULL,
	"subsidy_total" bigint NOT NULL,
	"booking_count" integer DEFAULT 0 NOT NULL,
	"tva" bigint DEFAULT 0 NOT NULL,
	"total" bigint NOT NULL,
	"ice" text,
	"status" text DEFAULT 'issued' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employer_invoices" ADD CONSTRAINT "employer_invoices_employer_account_id_employer_accounts_id_fk" FOREIGN KEY ("employer_account_id") REFERENCES "public"."employer_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_employer_invoice_period" ON "employer_invoices" USING btree ("employer_account_id","period_year","period_month");--> statement-breakpoint
CREATE INDEX "idx_employer_invoice_employer" ON "employer_invoices" USING btree ("employer_account_id");
