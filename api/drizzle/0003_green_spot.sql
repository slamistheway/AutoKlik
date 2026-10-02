ALTER TABLE "ads" RENAME COLUMN "created_at" TO "date_created";--> statement-breakpoint
ALTER TABLE "ads" RENAME COLUMN "updated_at" TO "date_last_updated";--> statement-breakpoint
ALTER TABLE "saved_ads" RENAME COLUMN "created_at" TO "date_saved";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "created_at" TO "date_created";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "updated_at";