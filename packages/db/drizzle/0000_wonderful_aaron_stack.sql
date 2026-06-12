CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'cancel', 'verify', 'release', 'dispute', 'refund');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('requested', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."care_type" AS ENUM('daya', 'nanny', 'after_school', 'nursery_assistant', 'babysitter');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('pending', 'approved', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('cin', 'health_cert', 'police_clearance', 'reference', 'certificate');--> statement-breakpoint
CREATE TYPE "public"."escrow_status" AS ENUM('pending', 'authorized', 'captured', 'released', 'refunded', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('family', 'caregiver', 'employer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."verification_level" AS ENUM('unverified', 'id_checked', 'cin_verified', 'background_cleared', 'certified');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" timestamp with time zone,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token" text NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text,
	"role" "role" NOT NULL,
	"phone" text,
	"city" text,
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "availability_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" uuid NOT NULL,
	"day_of_week" integer,
	"specific_date" text,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"available" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "caregiver_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bio" text,
	"care_types" "care_type"[] DEFAULT '{}' NOT NULL,
	"cities" text[] DEFAULT '{}' NOT NULL,
	"languages" text[] DEFAULT '{}' NOT NULL,
	"hourly_rate" bigint,
	"daily_rate" bigint,
	"monthly_rate" bigint,
	"min_age_months" integer,
	"max_age_years" integer,
	"max_children" integer DEFAULT 1 NOT NULL,
	"has_own_space" boolean DEFAULT false NOT NULL,
	"verification_level" "verification_level" DEFAULT 'unverified' NOT NULL,
	"avg_rating" integer DEFAULT 0 NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"completed_bookings" integer DEFAULT 0 NOT NULL,
	"response_rate" integer DEFAULT 0 NOT NULL,
	"punctuality_score" integer DEFAULT 0 NOT NULL,
	"skill_vector" vector(384),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "caregiver_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "verification_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" uuid NOT NULL,
	"type" text NOT NULL,
	"file_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone,
	"admin_note" text,
	"consent_given_at" timestamp with time zone NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid
);
--> statement-breakpoint
CREATE TABLE "family_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"address" text,
	"neighborhood" text,
	"city" text NOT NULL,
	"children" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"saved_caregiver_ids" uuid[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "family_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "employer_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_name" text NOT NULL,
	"ice" text,
	"sector" text,
	"benefit_budget_per_employee" bigint NOT NULL,
	"total_budget_used" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employer_accounts_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "enrolled_employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_account_id" uuid NOT NULL,
	"employee_email" text NOT NULL,
	"employee_name" text NOT NULL,
	"monthly_benefit" bigint NOT NULL,
	"user_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"employer_account_id" uuid,
	"care_type" "care_type" NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"location_note" text,
	"children_count" integer NOT NULL,
	"status" "booking_status" DEFAULT 'requested' NOT NULL,
	"family_notes" text,
	"cancel_reason" text,
	"urgent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escrows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"caregiver_id" uuid NOT NULL,
	"gross_amount" bigint NOT NULL,
	"employer_subsidy" bigint DEFAULT 0 NOT NULL,
	"family_pays" bigint NOT NULL,
	"platform_fee_from_family" bigint NOT NULL,
	"platform_fee_from_caregiver" bigint NOT NULL,
	"caregiver_payout" bigint NOT NULL,
	"status" "escrow_status" DEFAULT 'pending' NOT NULL,
	"gateway_ref" text,
	"authorized_at" timestamp with time zone,
	"captured_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"dispute_window_ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "escrows_booking_id_unique" UNIQUE("booking_id")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"reviewee_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"reviewer_role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "access_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"file_key" text NOT NULL,
	"action" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"entity" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_caregiver_id_caregiver_profiles_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregiver_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_profiles" ADD CONSTRAINT "caregiver_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_caregiver_id_caregiver_profiles_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregiver_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_profiles" ADD CONSTRAINT "family_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employer_accounts" ADD CONSTRAINT "employer_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolled_employees" ADD CONSTRAINT "enrolled_employees_employer_account_id_employer_accounts_id_fk" FOREIGN KEY ("employer_account_id") REFERENCES "public"."employer_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolled_employees" ADD CONSTRAINT "enrolled_employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_caregiver_id_caregiver_profiles_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregiver_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_family_id_family_profiles_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."family_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_employer_account_id_employer_accounts_id_fk" FOREIGN KEY ("employer_account_id") REFERENCES "public"."employer_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_family_id_family_profiles_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."family_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_caregiver_id_caregiver_profiles_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregiver_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewee_id_users_id_fk" FOREIGN KEY ("reviewee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_audit_logs" ADD CONSTRAINT "access_audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_accounts_user_id" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_accounts_provider" ON "accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_user_id" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_slots_caregiver" ON "availability_slots" USING btree ("caregiver_id");--> statement-breakpoint
CREATE INDEX "idx_slots_date" ON "availability_slots" USING btree ("specific_date");--> statement-breakpoint
CREATE INDEX "idx_caregiver_user_id" ON "caregiver_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_caregiver_verification" ON "caregiver_profiles" USING btree ("verification_level");--> statement-breakpoint
CREATE INDEX "idx_caregiver_rating" ON "caregiver_profiles" USING btree ("avg_rating");--> statement-breakpoint
CREATE INDEX "idx_docs_caregiver_id" ON "verification_documents" USING btree ("caregiver_id");--> statement-breakpoint
CREATE INDEX "idx_docs_status" ON "verification_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_docs_type" ON "verification_documents" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_family_user_id" ON "family_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_family_city" ON "family_profiles" USING btree ("city");--> statement-breakpoint
CREATE INDEX "idx_employer_user_id" ON "employer_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_enrolled_employer" ON "enrolled_employees" USING btree ("employer_account_id");--> statement-breakpoint
CREATE INDEX "idx_enrolled_email" ON "enrolled_employees" USING btree ("employee_email");--> statement-breakpoint
CREATE INDEX "idx_enrolled_user" ON "enrolled_employees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_booking_caregiver" ON "bookings" USING btree ("caregiver_id");--> statement-breakpoint
CREATE INDEX "idx_booking_family" ON "bookings" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "idx_booking_status" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_booking_start_time" ON "bookings" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "idx_escrow_booking" ON "escrows" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_escrow_status" ON "escrows" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_escrow_caregiver" ON "escrows" USING btree ("caregiver_id");--> statement-breakpoint
CREATE INDEX "idx_review_booking" ON "reviews" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_review_reviewee" ON "reviews" USING btree ("reviewee_id");--> statement-breakpoint
CREATE INDEX "idx_access_audit_actor" ON "access_audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "idx_access_audit_doc" ON "access_audit_logs" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_access_audit_at" ON "access_audit_logs" USING btree ("at");--> statement-breakpoint
CREATE INDEX "idx_audit_actor" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_entity" ON "audit_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_at" ON "audit_logs" USING btree ("at");