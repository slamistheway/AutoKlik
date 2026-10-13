import { sql, relations } from "drizzle-orm";
import {
    bigint,
    bigserial,
    boolean,
    check,
    foreignKey,
    index,
    integer, numeric,
    pgTable, primaryKey, serial,
    text,
    timestamp,
    unique,
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
      dateCreated: timestamp("date_created", { withTimezone: false }).defaultNow()
    },
    (table) => [
      unique("users_username_key").on(table.username),
      unique("users_email_key").on(table.email),
    ],
);

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
    fuel: text("fuel"),
    condition: text("condition"),
    county: text("county"),
    sellerType: text("seller_type"),
    buyOrLease: text("buy_or_lease"),
    gearType: text("gear_type"),
    color: text("color"),
    doorNumber: integer("door_number"),
    drivingLicence: text("driving_licence").default(""),
    weight: integer("weight"),
    payload: integer("payload"),
    volume: integer("volume"),

    previewImg: text("preview_img"),

    featured: boolean("featured").default(false),

    dateCreated: timestamp("date_created", { withTimezone: false }).defaultNow(),
    dateLastUpdated: timestamp("date_last_updated", { withTimezone: false }).defaultNow(),
});

export const adImages = pgTable(
    "ad_images", {
      id: serial("id").primaryKey(),
      adId: integer("ad_id")
          .notNull()
          .references(() => ads.id, { onDelete: "cascade" }),
      imageUrl: text("image_url").notNull(),
      createdAt: timestamp("created_at", { withTimezone: false }).defaultNow(),
    },
    (table) => [index("idx_ad_images_ad_id").on(table.adId)],
);

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
);

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
});




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
);

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
);

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
);


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
  );

export const revokedTokens = pgTable('revoked_tokens', {
  tokenHash: text('token_hash').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});



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
});

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
);

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
);

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
);

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
