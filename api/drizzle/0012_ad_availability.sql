ALTER TABLE "ads" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "ads" ADD COLUMN "expires_at" timestamp with time zone DEFAULT now() + interval '3 days' NOT NULL;--> statement-breakpoint
UPDATE "ads" SET "expires_at" = COALESCE("date_created", now()::timestamp) + interval '3 days';
