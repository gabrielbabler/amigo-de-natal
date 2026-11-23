CREATE TYPE "public"."ai_generation_type" AS ENUM('CHAOS_REVEAL', 'VIP_GIFTS');--> statement-breakpoint
CREATE TYPE "public"."group_mode" AS ENUM('SECRETO', 'ONCA', 'CHOCOLATE');--> statement-breakpoint
CREATE TYPE "public"."payment_product" AS ENUM('CHAOS_MODE', 'VIP_CONSULTANT');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'PAID', 'EXPIRED', 'FAILED');--> statement-breakpoint
CREATE TABLE "ai_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"giver_id" uuid NOT NULL,
	"receiver_id" uuid NOT NULL,
	"generation_type" "ai_generation_type" NOT NULL,
	"model" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"giver_id" uuid NOT NULL,
	"receiver_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exclusions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"giver_id" uuid NOT NULL,
	"excluded_receiver_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"mode" "group_mode" NOT NULL,
	"budget_cents" integer NOT NULL,
	"reveal_date" text NOT NULL,
	"admin_token" text NOT NULL,
	"chaos_unlocked" boolean DEFAULT false NOT NULL,
	"draw_completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"normalized_phone" text NOT NULL,
	"pin_hash" text,
	"pin_attempts" integer DEFAULT 0 NOT NULL,
	"pin_locked_until" timestamp with time zone,
	"participant_token" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_organizer" boolean DEFAULT false NOT NULL,
	"is_participating" boolean DEFAULT true NOT NULL,
	"vip_unlocked" boolean DEFAULT false NOT NULL,
	"revealed_at" timestamp with time zone,
	"push_subscription" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"participant_id" uuid,
	"product_type" "payment_product" NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"pix_code" text NOT NULL,
	"pix_qr_base64" text,
	"expires_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_giver_id_participants_id_fk" FOREIGN KEY ("giver_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_receiver_id_participants_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_giver_id_participants_id_fk" FOREIGN KEY ("giver_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_receiver_id_participants_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exclusions" ADD CONSTRAINT "exclusions_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exclusions" ADD CONSTRAINT "exclusions_giver_id_participants_id_fk" FOREIGN KEY ("giver_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exclusions" ADD CONSTRAINT "exclusions_excluded_receiver_id_participants_id_fk" FOREIGN KEY ("excluded_receiver_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_generations_cache_uidx" ON "ai_generations" USING btree ("group_id","giver_id","receiver_id","generation_type");--> statement-breakpoint
CREATE UNIQUE INDEX "assignments_giver_uidx" ON "assignments" USING btree ("group_id","giver_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assignments_receiver_uidx" ON "assignments" USING btree ("group_id","receiver_id");--> statement-breakpoint
CREATE INDEX "assignments_group_idx" ON "assignments" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exclusions_pair_uidx" ON "exclusions" USING btree ("group_id","giver_id","excluded_receiver_id");--> statement-breakpoint
CREATE INDEX "exclusions_group_idx" ON "exclusions" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "groups_slug_uidx" ON "groups" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "participants_group_phone_uidx" ON "participants" USING btree ("group_id","normalized_phone");--> statement-breakpoint
CREATE UNIQUE INDEX "participants_token_uidx" ON "participants" USING btree ("participant_token");--> statement-breakpoint
CREATE INDEX "participants_phone_idx" ON "participants" USING btree ("normalized_phone");--> statement-breakpoint
CREATE INDEX "participants_group_idx" ON "participants" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "payments_external_id_idx" ON "payments" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "payments_lookup_idx" ON "payments" USING btree ("group_id","participant_id","product_type","status");