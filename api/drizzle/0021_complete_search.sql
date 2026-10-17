ALTER TABLE "ads" ADD COLUMN "engine_size" integer;
--> statement-breakpoint
CREATE TABLE "saved_searches" (
  "id" serial PRIMARY KEY,
  "user_id" bigint NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" varchar(100) NOT NULL,
  "filters" jsonb NOT NULL,
  "alerts_enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "saved_searches_user_idx" ON "saved_searches" ("user_id");
--> statement-breakpoint
CREATE TABLE "search_alerts" (
  "id" serial PRIMARY KEY,
  "saved_search_id" integer NOT NULL REFERENCES "saved_searches"("id") ON DELETE CASCADE,
  "ad_id" integer NOT NULL REFERENCES "ads"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "read_at" timestamp with time zone,
  CONSTRAINT "search_alerts_search_ad_key" UNIQUE ("saved_search_id", "ad_id")
);
