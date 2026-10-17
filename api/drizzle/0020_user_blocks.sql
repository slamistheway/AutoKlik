CREATE TABLE "user_blocks" (
  "blocker_id" bigint NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "blocked_id" bigint NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("blocker_id", "blocked_id"),
  CONSTRAINT "user_blocks_not_self" CHECK ("blocker_id" <> "blocked_id")
);
--> statement-breakpoint
CREATE INDEX "user_blocks_blocked_idx" ON "user_blocks" ("blocked_id");
