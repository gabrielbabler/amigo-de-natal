import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const groupModeEnum = pgEnum("group_mode", [
  "SECRETO",
  "ONCA",
  "CHOCOLATE",
]);

export const paymentProductEnum = pgEnum("payment_product", [
  "CHAOS_MODE",
  "VIP_CONSULTANT",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "PAID",
  "EXPIRED",
  "FAILED",
]);

export const aiGenerationTypeEnum = pgEnum("ai_generation_type", [
  "CHAOS_REVEAL",
  "VIP_GIFTS",
]);

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    mode: groupModeEnum("mode").notNull(),
    budgetCents: integer("budget_cents").notNull(),
    revealDate: text("reveal_date").notNull(),
    adminToken: text("admin_token").notNull(),
    chaosUnlocked: boolean("chaos_unlocked").default(false).notNull(),
    drawCompletedAt: timestamp("draw_completed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("groups_slug_uidx").on(t.slug)]
);

export const participants = pgTable(
  "participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    normalizedPhone: text("normalized_phone").notNull(),
    pinHash: text("pin_hash"),
    pinAttempts: integer("pin_attempts").default(0).notNull(),
    pinLockedUntil: timestamp("pin_locked_until", { withTimezone: true }),
    participantToken: text("participant_token").notNull(),
    tags: jsonb("tags").$type<string[]>().default([]).notNull(),
    isOrganizer: boolean("is_organizer").default(false).notNull(),
    isParticipating: boolean("is_participating").default(true).notNull(),
    vipUnlocked: boolean("vip_unlocked").default(false).notNull(),
    revealedAt: timestamp("revealed_at", { withTimezone: true }),
    pushSubscription: jsonb("push_subscription").$type<Record<
      string,
      unknown
    > | null>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("participants_group_phone_uidx").on(
      t.groupId,
      t.normalizedPhone
    ),
    uniqueIndex("participants_token_uidx").on(t.participantToken),
    index("participants_phone_idx").on(t.normalizedPhone),
    index("participants_group_idx").on(t.groupId),
  ]
);

export const exclusions = pgTable(
  "exclusions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    giverId: uuid("giver_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    excludedReceiverId: uuid("excluded_receiver_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("exclusions_pair_uidx").on(
      t.groupId,
      t.giverId,
      t.excludedReceiverId
    ),
    index("exclusions_group_idx").on(t.groupId),
  ]
);

export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    giverId: uuid("giver_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    receiverId: uuid("receiver_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("assignments_giver_uidx").on(t.groupId, t.giverId),
    uniqueIndex("assignments_receiver_uidx").on(t.groupId, t.receiverId),
    index("assignments_group_idx").on(t.groupId),
  ]
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id").references(() => participants.id, {
      onDelete: "set null",
    }),
    productType: paymentProductEnum("product_type").notNull(),
    provider: text("provider").notNull(),
    externalId: text("external_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
    status: paymentStatusEnum("status").default("PENDING").notNull(),
    pixCode: text("pix_code").notNull(),
    pixQrBase64: text("pix_qr_base64"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("payments_external_id_idx").on(t.externalId),
    index("payments_lookup_idx").on(
      t.groupId,
      t.participantId,
      t.productType,
      t.status
    ),
  ]
);

export const aiGenerations = pgTable(
  "ai_generations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    giverId: uuid("giver_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    receiverId: uuid("receiver_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    generationType: aiGenerationTypeEnum("generation_type").notNull(),
    model: text("model").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("ai_generations_cache_uidx").on(
      t.groupId,
      t.giverId,
      t.receiverId,
      t.generationType
    ),
  ]
);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventType: text("event_type").notNull(), // PAGE_VIEW | AFFILIATE_CLICK | STORY_CARD_SHARE
    path: text("path"),
    provider: text("provider"), // amazon | mercadolivre
    groupId: uuid("group_id").references(() => groups.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("analytics_events_type_created_idx").on(t.eventType, t.createdAt),
  ]
);

export type GroupRow = typeof groups.$inferSelect;
export type ParticipantRow = typeof participants.$inferSelect;
export type ExclusionRow = typeof exclusions.$inferSelect;
export type AssignmentRow = typeof assignments.$inferSelect;
export type PaymentRow = typeof payments.$inferSelect;
export type AiGenerationRow = typeof aiGenerations.$inferSelect;
