CREATE INDEX "ad_images_sha256_idx" ON "ad_images" USING btree ("sha256");--> statement-breakpoint
CREATE INDEX "ads_vin_idx" ON "ads" USING btree ("vin");--> statement-breakpoint
CREATE INDEX "ads_moderation_idx" ON "ads" USING btree ("moderation_status");--> statement-breakpoint
CREATE INDEX "ads_created_idx" ON "ads" USING btree ("date_created");--> statement-breakpoint
ALTER TABLE "ads" ADD CONSTRAINT "ads_moderation_check" CHECK ("ads"."moderation_status" is null or "ads"."moderation_status" in ('pending', 'approved', 'rejected', 'changes', 'removed'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("users"."role" in ('user', 'moderator', 'admin'));