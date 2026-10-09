CREATE TABLE "audit" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint,
	"action" text NOT NULL,
	"path" text NOT NULL,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "audit_user_created_idx" ON "audit" USING btree ("user_id","created_at");
