// Access goes through NestJS/Better Auth. No direct Supabase client policies.
import { sql, relations } from "drizzle-orm";
import {
    bigint,
    bigserial,
    boolean,
    check,
    foreignKey,
    index,
    integer, numeric,
    jsonb,
    pgTable, primaryKey, serial,
    text,
    timestamp,
    unique,
    uniqueIndex,
    varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable(
    "users", {
      id: bigserial("id", { mode: "number" }).primaryKey(),
      username: varchar("username", { length: 50 }).notNull(),
      email: varchar("email", { length: 255 }).notNull(),
      password: varchar("password", { length: 255 }).notNull(),
      pfp: text("pfp"),
      firstName: varchar("first_name", { length: 100 }),
      lastName: varchar("last_name", { length: 100 }),
      phone: varchar("phone", { length: 20 }),
      city: varchar("city", { length: 100 }),
      country: varchar("country", { length: 100 }),
      dateCreated: timestamp("date_created", { withTimezone: false }).defaultNow(),
      role: text("role").$type<'user' | 'dealer' | 'moderator' | 'admin'>().notNull().default('user'),
      accountStatus: text('account_status').$type<'active' | 'suspended' | 'banned' | 'deleted'>().notNull().default('active'),
      restrictionReason: text('restriction_reason'),
      passwordResetRequired: boolean('password_reset_required').notNull().default(false),
      sellerVerified: boolean('seller_verified').notNull().default(false),
      badges: text('badges').array().notNull().default(sql`'{}'::text[]`),
      dealerStatus: text('dealer_status').$type<'none' | 'pending' | 'approved' | 'rejected'>().notNull().default('none'),
      dealerProfile: jsonb('dealer_profile').$type<{ businessName: string; registrationNumber: string; address: string; website: string }>(),
      moderationVersion: integer('moderation_version').notNull().default(0),
    },
    (table) => [
      unique("users_username_key").on(table.username),
      unique("users_email_key").on(table.email),
      check("users_role_check", sql`${table.role} in ('user', 'dealer', 'moderator', 'admin')`),
      check('users_status_check', sql`${table.accountStatus} in ('active', 'suspended', 'banned', 'deleted')`),
      check('users_dealer_check', sql`${table.dealerStatus} in ('none', 'pending', 'approved', 'rejected')`),
      index('users_registered_idx').on(table.dateCreated),
    ],
).enableRLS();

export const ads = pgTable("ads", {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: text("category"),
    subcategory: text("subcategory"),
    brand: text("brand"),
    model: text("model"),
    title: text("title"),
    description: text("description"),
    year: integer("year"),
    price: numeric("price"),
    kilometrage: integer("kilometrage"),
    enginePower: integer("engine_power"),
    engineSize: integer("engine_size"),
    fuel: text("fuel"),
    condition: text("condition"),
    county: text("county"),
    sellerType: text("seller_type"),
    buyOrLease: text("buy_or_lease"),
    gearType: text("gear_type"),
    bodyType: text("body_type"),
    airConditioning: text("air_conditioning"),
    airbags: integer("airbags"),
    carRadio: text("car_radio"),
    seatCount: integer("seat_count"),
    tireWidth: integer("tire_width"),
    tireHeight: integer("tire_height"),
    tireDiameter: integer("tire_diameter"),
    emissionClass: text("emission_class"),
    driveType: text("drive_type"),
    gearCount: integer("gear_count"),
    fuelConsumption: numeric("fuel_consumption"),
    warranty: text("warranty"),
    color: text("color"),
    doorNumber: integer("door_number"),
    drivingLicence: text("driving_licence").default(""),
    weight: integer("weight"),
    payload: integer("payload"),
    volume: integer("volume"),

    previewImg: text("preview_img"),

    featured: boolean("featured").default(false),
    pinned: boolean("pinned").notNull().default(false),
    vin: varchar("vin", { length: 17 }),
    moderationStatus: text("moderation_status").$type<'pending' | 'approved' | 'rejected' | 'changes' | 'removed'>(),
    moderationReason: text("moderation_reason"),
    soldAt: timestamp("sold_at", { withTimezone: true }),
    status: text("status").$type<'active' | 'sold' | 'hidden'>().notNull().default('active'),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull().default(sql`now() + interval '3 days'`),

    dateCreated: timestamp("date_created", { withTimezone: false }).defaultNow(),
    dateLastUpdated: timestamp("date_last_updated", { withTimezone: false }).defaultNow(),
}, table => [index('ads_vin_idx').on(table.vin), index('ads_moderation_idx').on(table.moderationStatus), index('ads_created_idx').on(table.dateCreated), check('ads_moderation_check', sql`${table.moderationStatus} is null or ${table.moderationStatus} in ('pending', 'approved', 'rejected', 'changes', 'removed')`)]).enableRLS();

export const savedSearches = pgTable('saved_searches', {
    id: serial('id').primaryKey(),
    userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    filters: jsonb('filters').$type<Record<string, string>>().notNull(),
    alertsEnabled: boolean('alerts_enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [index('saved_searches_user_idx').on(table.userId)]).enableRLS();

export const searchAlerts = pgTable('search_alerts', {
    id: serial('id').primaryKey(),
    savedSearchId: integer('saved_search_id').notNull().references(() => savedSearches.id, { onDelete: 'cascade' }),
    adId: integer('ad_id').notNull().references(() => ads.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp('read_at', { withTimezone: true }),
}, table => [unique('search_alerts_search_ad_key').on(table.savedSearchId, table.adId)]).enableRLS();

export const adViews = pgTable(
    "ad_views", {
      adId: integer("ad_id").notNull().references(() => ads.id, { onDelete: "cascade" }),
      viewerId: bigint("viewer_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
      firstViewedAt: timestamp("first_viewed_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [primaryKey({ columns: [table.adId, table.viewerId], name: "ad_views_pkey" }), index("ad_views_viewer_idx").on(table.viewerId)],
).enableRLS();

export const adImages = pgTable(
    "ad_images", {
      id: serial("id").primaryKey(),
      adId: integer("ad_id")
          .notNull()
          .references(() => ads.id, { onDelete: "cascade" }),
      imageUrl: text("image_url").notNull(),
      sha256: varchar("sha256", { length: 64 }),
      createdAt: timestamp("created_at", { withTimezone: false }).defaultNow(),
    },
    (table) => [index("idx_ad_images_ad_id").on(table.adId), index('ad_images_sha256_idx').on(table.sha256)],
).enableRLS();

export const savedAds = pgTable(
    "saved_ads", {
      userId: bigint("user_id", { mode: "number" })
          .notNull()
          .references(() => users.id, { onDelete: "cascade" }),
      adId: bigint("ad_id", { mode: "number" })
          .notNull()
          .references(() => ads.id, { onDelete: "cascade" }),
      dateSaved: timestamp("date_saved", { withTimezone: true }).defaultNow(),
    },
    (table) => [primaryKey({ columns: [table.userId, table.adId], name: "saved_ads_pkey" })],
).enableRLS();

export const usersAdDrafts = pgTable("users_ad_drafts", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  category: text("category"),
  subcategory: text("subcategory"),

  //dovrsi ovo

  title: text("title"),
  description: text("description"),
  price: numeric("price"),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow(),
}).enableRLS();




export const userBlocks = pgTable('user_blocks', {
    blockerId: bigint('blocker_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
    blockedId: bigint('blocked_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [primaryKey({ columns: [table.blockerId, table.blockedId] }), check('user_blocks_not_self', sql`${table.blockerId} <> ${table.blockedId}`), index('user_blocks_blocked_idx').on(table.blockedId)]).enableRLS();

export const conversations = pgTable(
    "conversations",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        userAid: bigint("user_a_id", { mode: "number" })
            .notNull()
            .references(() => users.id),
        userBid: bigint("user_b_id", { mode: "number" })
            .notNull()
            .references(() => users.id),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        unique("conversations_users_key").on(table.userAid, table.userBid),
        // Always save the smaller user ID as userAid.
        check("conversations_user_order", sql`${table.userAid} < ${table.userBid}`),
        index("conversations_user_b_idx").on(table.userBid),
    ],
).enableRLS();

export const messages = pgTable(
    "messages",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        conversationId: bigint("conversation_id", { mode: "number" })
            .notNull(),
        senderId: bigint("sender_id", { mode: "number" })
            .notNull()
            .references(() => users.id),
        body: text("body").notNull(),
        encryptionVersion: integer("encryption_version").notNull().default(0),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        readAt: timestamp("read_at", { withTimezone: true }),
    },
    (table) => [
        foreignKey({
            columns: [table.conversationId],
            foreignColumns: [conversations.id],
            name: "messages_conversation_fk",
        }).onDelete("cascade"),
        index("messages_conversation_created_idx").on(
            table.conversationId,
            table.createdAt,
            table.id,
        ),
        check("messages_body_not_empty", sql`length(trim(${table.body})) > 0`),
    ],
).enableRLS();

export const messageImages = pgTable(
    "message_images",
    {
        messageId: bigint("message_id", { mode: "number" }).primaryKey().references(() => messages.id, { onDelete: "cascade" }),
        encryptedData: text("encrypted_data").notNull(),
        mimeType: varchar("mime_type", { length: 32 }).notNull(),
        size: integer("size").notNull(),
    },
    (table) => [
        check("message_images_size", sql`${table.size} > 0 and ${table.size} <= 5242880`),
    ],
).enableRLS();


export const audit = pgTable(
    "audit",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        userId: bigint("user_id", { mode: "number" }).references(() => users.id, { onDelete: "set null" }),
        action: text("action").notNull(),
        path: text("path").notNull(),
        ip: text("ip"),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        index("audit_user_created_idx").on(table.userId, table.createdAt),
    ],
  ).enableRLS();

export const revokedTokens = pgTable('revoked_tokens', {
  tokenHash: text('token_hash').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}).enableRLS();

export const moderationReports = pgTable('moderation_reports', {
    id: serial('id').primaryKey(),
    targetType: text('target_type').$type<'ad' | 'user' | 'message'>().notNull(),
    targetId: bigint('target_id', { mode: 'number' }).notNull(),
    reporterId: bigint('reporter_id', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
    reason: text('reason').notNull(),
    status: text('status').$type<'open' | 'escalated' | 'resolved' | 'dismissed'>().notNull().default('open'),
    subjectUserId: bigint('subject_user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
    source: text('source').$type<'user' | 'automated'>().notNull().default('user'),
    signals: text('signals').array().notNull().default(sql`'{}'::text[]`),
    violationConfirmed: boolean('violation_confirmed').notNull().default(false),
    resolutionNote: text('resolution_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
}, table => [index('moderation_reports_target_idx').on(table.targetType, table.targetId), index('moderation_reports_queue_idx').on(table.status, table.createdAt)]).enableRLS();

export const adminActions = pgTable('admin_actions', {
    id: serial('id').primaryKey(),
    actorId: bigint('actor_id', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    adId: integer('ad_id').references(() => ads.id, { onDelete: 'set null' }),
    targetUserId: bigint('target_user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
    reason: text('reason').notNull(),
    before: jsonb('before'),
    after: jsonb('after'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [index('admin_actions_created_idx').on(table.createdAt), index('admin_actions_ad_idx').on(table.adId)]).enableRLS();

export const safetyBlocklist = pgTable('safety_blocklist', {
    id: serial('id').primaryKey(),
    kind: text('kind').$type<'email' | 'phone' | 'ip'>().notNull(),
    value: text('value').notNull(),
    reason: text('reason').notNull(),
    active: boolean('active').notNull().default(true),
    createdBy: bigint('created_by', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [unique('safety_blocklist_value_key').on(table.kind, table.value)]).enableRLS();

export const safetyAppeals = pgTable('safety_appeals', {
    id: serial('id').primaryKey(),
    userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    status: text('status').$type<'open' | 'accepted' | 'rejected'>().notNull().default('open'),
    resolutionNote: text('resolution_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
}, table => [uniqueIndex('safety_appeals_open_user_idx').on(table.userId).where(sql`${table.status} = 'open'`)]).enableRLS();

export const erasureFiles = pgTable('erasure_files', {
    path: text('path').primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();



export const user = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
}).enableRLS();

export const session = pgTable(
    "session",
    {
        id: text("id").primaryKey(),
        expiresAt: timestamp("expires_at").notNull(),
        token: text("token").notNull().unique(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
    },
    (table) => [index("session_userId_idx").on(table.userId)],
).enableRLS();

export const account = pgTable(
    "account",
    {
        id: text("id").primaryKey(),
        accountId: text("account_id").notNull(),
        providerId: text("provider_id").notNull(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        accessToken: text("access_token"),
        refreshToken: text("refresh_token"),
        idToken: text("id_token"),
        accessTokenExpiresAt: timestamp("access_token_expires_at"),
        refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
        scope: text("scope"),
        password: text("password"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
    },
    (table) => [index("account_userId_idx").on(table.userId)],
).enableRLS();

export const verification = pgTable(
    "verification",
    {
        id: text("id").primaryKey(),
        identifier: text("identifier").notNull(),
        value: text("value").notNull(),
        expiresAt: timestamp("expires_at").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
    },
    (table) => [index("verification_identifier_idx").on(table.identifier)],
).enableRLS();

export const userRelations = relations(user, ({ many }) => ({
    sessions: many(session),
    accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
    user: one(user, {
        fields: [session.userId],
        references: [user.id],
    }),
}));

export const accountRelations = relations(account, ({ one }) => ({
    user: one(user, {
        fields: [account.userId],
        references: [user.id],
    }),
}));

export const priceDropNotifications = pgTable("price_drop_notifications", {
    id: serial("id").primaryKey(),
    userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
    adId: integer("ad_id").notNull().references(() => ads.id, { onDelete: "cascade" }),
    oldPrice: numeric("old_price").notNull(),
    newPrice: numeric("new_price").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
}, table => [index("price_drop_notifications_user_idx").on(table.userId, table.createdAt)]).enableRLS();
