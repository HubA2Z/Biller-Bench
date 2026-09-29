ALTER TABLE "password_reset_tokens" ADD COLUMN "purpose" text DEFAULT 'reset' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "disabled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;