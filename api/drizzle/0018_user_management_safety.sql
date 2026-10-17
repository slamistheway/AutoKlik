CREATE TABLE "safety_appeals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "safety_blocklist" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"value" text NOT NULL,
	"reason" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "safety_blocklist_value_key" UNIQUE("kind","value")
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_role_check";--> statement-breakpoint
ALTER TABLE "admin_actions" ADD COLUMN "target_user_id" bigint;--> statement-breakpoint
ALTER TABLE "moderation_reports" ADD COLUMN "subject_user_id" bigint;--> statement-breakpoint
ALTER TABLE "moderation_reports" ADD COLUMN "source" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "moderation_reports" ADD COLUMN "signals" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "moderation_reports" ADD COLUMN "violation_confirmed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "restriction_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "seller_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "badges" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "dealer_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "dealer_profile" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "moderation_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "safety_appeals" ADD CONSTRAINT "safety_appeals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_blocklist" ADD CONSTRAINT "safety_blocklist_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "safety_appeals_open_user_idx" ON "safety_appeals" USING btree ("user_id") WHERE "safety_appeals"."status" = 'open';--> statement-breakpoint
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_reports" ADD CONSTRAINT "moderation_reports_subject_user_id_users_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_registered_idx" ON "users" USING btree ("date_created");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_status_check" CHECK ("users"."account_status" in ('active', 'suspended', 'banned', 'deleted'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_dealer_check" CHECK ("users"."dealer_status" in ('none', 'pending', 'approved', 'rejected'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("users"."role" in ('user', 'dealer', 'moderator', 'admin'));
--> statement-breakpoint
UPDATE moderation_reports r SET subject_user_id = CASE WHEN r.target_type = 'user' THEN (SELECT id FROM users WHERE id = r.target_id) WHEN r.target_type = 'ad' THEN (SELECT user_id FROM ads WHERE id = r.target_id) WHEN r.target_type = 'message' THEN (SELECT sender_id FROM messages WHERE id = r.target_id) END;
