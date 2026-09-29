CREATE TYPE "public"."answer_type" AS ENUM('EXPERT', 'FOLLOWUP');--> statement-breakpoint
CREATE TYPE "public"."flag_status" AS ENUM('OPEN', 'RESTORED', 'REMOVED');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('NEW', 'CONTACTED', 'WON', 'LOST');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('FREE', 'BASIC', 'PRO', 'DEDICATED');--> statement-breakpoint
CREATE TYPE "public"."question_status" AS ENUM('PENDING_PAYMENT', 'OPEN', 'ANSWERED', 'SOLVED');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('PROVIDER', 'STAFF', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."tier" AS ENUM('FREE', 'PLAN', 'URGENT');--> statement-breakpoint
CREATE TABLE "answers" (
	"id" text PRIMARY KEY NOT NULL,
	"question_id" text NOT NULL,
	"author_id" text NOT NULL,
	"type" "answer_type" NOT NULL,
	"body" text NOT NULL,
	"vote_count" integer DEFAULT 0 NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"removed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flags" (
	"id" text PRIMARY KEY NOT NULL,
	"reporter_id" text NOT NULL,
	"question_id" text,
	"answer_id" text,
	"reason" text DEFAULT 'PHI' NOT NULL,
	"status" "flag_status" DEFAULT 'OPEN' NOT NULL,
	"resolved_by_id" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"author_id" text NOT NULL,
	"codes" text[] DEFAULT '{}'::text[] NOT NULL,
	"modifiers" text[] DEFAULT '{}'::text[] NOT NULL,
	"payer_group" text NOT NULL,
	"payer_name" text NOT NULL,
	"state" text NOT NULL,
	"specialty" text NOT NULL,
	"ehr" text,
	"tier" "tier" NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"status" "question_status" DEFAULT 'OPEN' NOT NULL,
	"due_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"stripe_session_id" text,
	"first_answered_at" timestamp with time zone,
	"accepted_answer_id" text,
	"hidden" boolean DEFAULT false NOT NULL,
	"removed" boolean DEFAULT false NOT NULL,
	"vote_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "questions_slug_unique" UNIQUE("slug"),
	CONSTRAINT "questions_stripe_session_id_unique" UNIQUE("stripe_session_id")
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"service" text NOT NULL,
	"practice_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"email" text NOT NULL,
	"claims_per_month" text,
	"payers" text,
	"note" text,
	"question_id" text,
	"user_id" text,
	"status" "lead_status" DEFAULT 'NEW' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" "role" DEFAULT 'PROVIDER' NOT NULL,
	"practice_name" text,
	"specialty" text,
	"state" text,
	"npi" text,
	"npi_verified_at" timestamp with time zone,
	"npi_note" text,
	"credentials" text,
	"expert_specialties" text[] DEFAULT '{}'::text[] NOT NULL,
	"expert_payers" text[] DEFAULT '{}'::text[] NOT NULL,
	"expert_ehr" text[] DEFAULT '{}'::text[] NOT NULL,
	"plan" "plan" DEFAULT 'FREE' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"plan_renews_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_stripe_customer_id_unique" UNIQUE("stripe_customer_id"),
	CONSTRAINT "users_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"question_id" text,
	"answer_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flags" ADD CONSTRAINT "flags_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flags" ADD CONSTRAINT "flags_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flags" ADD CONSTRAINT "flags_answer_id_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."answers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flags" ADD CONSTRAINT "flags_resolved_by_id_users_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_answer_id_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."answers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "answers_question_idx" ON "answers" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "answers_author_idx" ON "answers" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "flags_status_idx" ON "flags" USING btree ("status");--> statement-breakpoint
CREATE INDEX "questions_status_due_idx" ON "questions" USING btree ("status","due_at");--> statement-breakpoint
CREATE INDEX "questions_payer_idx" ON "questions" USING btree ("payer_group","payer_name");--> statement-breakpoint
CREATE INDEX "questions_specialty_idx" ON "questions" USING btree ("specialty");--> statement-breakpoint
CREATE INDEX "questions_state_idx" ON "questions" USING btree ("state");--> statement-breakpoint
CREATE INDEX "questions_created_idx" ON "questions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "questions_codes_gin" ON "questions" USING gin ("codes");--> statement-breakpoint
CREATE INDEX "service_requests_status_idx" ON "service_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "votes_user_question_uq" ON "votes" USING btree ("user_id","question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "votes_user_answer_uq" ON "votes" USING btree ("user_id","answer_id");