import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const artworks = pgTable(
  "artworks",
  {
    id: serial("id").primaryKey(),
    source: text("source", { enum: ["met", "aic", "cma"] }).notNull(),
    sourceId: text("source_id").notNull(),
    title: text("title").notNull(),
    artist: text("artist"),
    dateDisplay: text("date_display"),
    medium: text("medium"),
    // Museum credit line, reproduced verbatim as a condition of open access
    creditLine: text("credit_line").notNull(),
    museumName: text("museum_name").notNull(),
    sourceUrl: text("source_url").notNull(),
    imageUrl: text("image_url").notNull(),
    imageSmallUrl: text("image_small_url").notNull(),
    metadata: jsonb("metadata"),
    usedOn: date("used_on"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("artworks_source_idx").on(t.source, t.sourceId),
    index("artworks_unused_idx").on(t.usedOn),
  ],
);

export const dailyPicks = pgTable("daily_picks", {
  // The site's day is the Europe/Paris calendar date
  date: date("date").primaryKey(),
  artworkId: integer("artwork_id")
    .notNull()
    .references(() => artworks.id)
    .unique(),
  story: text("story").notNull(),
  teaser: text("teaser").notNull(),
  storyStatus: text("story_status", { enum: ["ai", "fallback"] }).notNull(),
  model: text("model"),
  emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  token: text("token").notNull().unique(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Artwork = typeof artworks.$inferSelect;
export type DailyPick = typeof dailyPicks.$inferSelect;
export type Subscriber = typeof subscribers.$inferSelect;
