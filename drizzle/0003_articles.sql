CREATE TYPE "public"."article_kind" AS ENUM('ARTICLE', 'CODING_UPDATE', 'PAYER_UPDATE');--> statement-breakpoint
CREATE TYPE "public"."article_status" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TABLE "articles" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"kind" "article_kind" DEFAULT 'ARTICLE' NOT NULL,
	"status" "article_status" DEFAULT 'DRAFT' NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"body" text NOT NULL,
	"codes" text[] DEFAULT '{}'::text[] NOT NULL,
	"payers" text[] DEFAULT '{}'::text[] NOT NULL,
	"specialty" text,
	"effective_date" timestamp with time zone,
	"source_url" text,
	"author_id" text NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "articles_status_published_idx" ON "articles" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "articles_codes_gin" ON "articles" USING gin ("codes");