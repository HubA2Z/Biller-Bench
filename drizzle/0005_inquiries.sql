CREATE TYPE "public"."inquiry_kind" AS ENUM('CONTACT', 'CAREER');--> statement-breakpoint
CREATE TYPE "public"."inquiry_status" AS ENUM('NEW', 'REVIEWED', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "inquiry_kind" NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"organization" text,
	"topic" text,
	"role" text,
	"experience" text,
	"link" text,
	"message" text NOT NULL,
	"status" "inquiry_status" DEFAULT 'NEW' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "inquiries_status_idx" ON "inquiries" USING btree ("status","kind");