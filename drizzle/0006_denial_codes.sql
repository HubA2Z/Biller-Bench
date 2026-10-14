CREATE TABLE "denial_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"group_code" text DEFAULT 'CO' NOT NULL,
	"slug" text NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"quick_answer" text NOT NULL,
	"body" text NOT NULL,
	"related" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "article_status" DEFAULT 'DRAFT' NOT NULL,
	"reviewed_by_id" text,
	"reviewed_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "denial_codes_code_unique" UNIQUE("code"),
	CONSTRAINT "denial_codes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "denial_codes" ADD CONSTRAINT "denial_codes_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "denial_codes_status_idx" ON "denial_codes" USING btree ("status","category");