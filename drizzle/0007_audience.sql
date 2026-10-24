CREATE TABLE "audience_responses" (
	"id" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"path" text,
	"wants_help" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audience_responses_created_idx" ON "audience_responses" USING btree ("created_at");