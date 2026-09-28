ALTER TABLE "ads" ADD COLUMN "preview_img" text;
--> statement-breakpoint
UPDATE "ads" AS ad
SET "preview_img" = (
  SELECT image."image_url"
  FROM "ad_images" AS image
  WHERE image."ad_id" = ad."id"
  ORDER BY image."created_at" ASC NULLS LAST, image."id" ASC
  LIMIT 1
)
WHERE ad."preview_img" IS NULL;
