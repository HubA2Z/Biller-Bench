ALTER TABLE "inquiries" ADD COLUMN "share_ok" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "question_id" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "source" text DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "draft" boolean DEFAULT false NOT NULL;