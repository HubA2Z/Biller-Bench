CREATE TABLE "content_imports" (
	"file" text PRIMARY KEY NOT NULL,
	"article_id" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
