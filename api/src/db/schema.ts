import {
    bigint,
    integer,
    numeric,
    pgTable,
    primaryKey,
    serial,
    text,
    timestamp,
    unique,
    varchar,
    index, bigserial, boolean,
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
