ALTER TABLE "ads" ADD COLUMN IF NOT EXISTS "body_type" text;
--> statement-breakpoint
ALTER TABLE "ads" ADD COLUMN IF NOT EXISTS "air_conditioning" text;
--> statement-breakpoint
ALTER TABLE "ads" ADD COLUMN IF NOT EXISTS "airbags" integer;
--> statement-breakpoint
ALTER TABLE "ads" ADD COLUMN IF NOT EXISTS "car_radio" text;
--> statement-breakpoint
ALTER TABLE "ads" ADD COLUMN IF NOT EXISTS "seat_count" integer;
--> statement-breakpoint
ALTER TABLE "ads" ADD COLUMN IF NOT EXISTS "tire_width" integer;
--> statement-breakpoint
ALTER TABLE "ads" ADD COLUMN IF NOT EXISTS "tire_height" integer;
--> statement-breakpoint
ALTER TABLE "ads" ADD COLUMN IF NOT EXISTS "tire_diameter" integer;
--> statement-breakpoint
ALTER TABLE "ads" ADD COLUMN IF NOT EXISTS "emission_class" text;
