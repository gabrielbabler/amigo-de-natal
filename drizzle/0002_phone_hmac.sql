DROP INDEX IF EXISTS "participants_group_phone_uidx";
--> statement-breakpoint
DROP INDEX IF EXISTS "participants_phone_idx";
--> statement-breakpoint
ALTER TABLE "participants" DROP COLUMN IF EXISTS "normalized_phone";
--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "phone_hmac" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "phone_last4" text NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "participants_group_phone_uidx" ON "participants" USING btree ("group_id","phone_hmac");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "participants_phone_idx" ON "participants" USING btree ("phone_hmac");
