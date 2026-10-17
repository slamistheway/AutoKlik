CREATE TABLE "ad_views" (
	"ad_id" integer NOT NULL,
	"viewer_id" bigint NOT NULL,
	"first_viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ad_views_pkey" PRIMARY KEY("ad_id","viewer_id")
);
--> statement-breakpoint
ALTER TABLE "ad_views" ADD CONSTRAINT "ad_views_ad_id_ads_id_fk" FOREIGN KEY ("ad_id") REFERENCES "public"."ads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_views" ADD CONSTRAINT "ad_views_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_views_viewer_idx" ON "ad_views" USING btree ("viewer_id");