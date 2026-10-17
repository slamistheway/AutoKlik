CREATE TABLE "price_drop_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"ad_id" integer NOT NULL,
	"old_price" numeric NOT NULL,
	"new_price" numeric NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "price_drop_notifications" ADD CONSTRAINT "price_drop_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_drop_notifications" ADD CONSTRAINT "price_drop_notifications_ad_id_ads_id_fk" FOREIGN KEY ("ad_id") REFERENCES "public"."ads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "price_drop_notifications_user_idx" ON "price_drop_notifications" USING btree ("user_id","created_at");