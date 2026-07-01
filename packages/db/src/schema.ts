import { bigint, boolean, integer, pgEnum, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

export const readingStatusEnum = pgEnum("reading_status", [
  "want",
  "reading",
  "completed",
  "rereading",
  "onhold",
  "dnf",
  "lost",
]);

export const contentRatingEnum = pgEnum("content_rating", ["G", "T", "M", "E", "NR"]);

export const workRecords = pgTable(
  "work_records",
  {
    userId: text("user_id").notNull(),
    workId: text("work_id").notNull(),
    status: readingStatusEnum("status").notNull(),
    title: text("title").notNull(),
    author: text("author"),
    url: text("url").notNull(),

    wordCount: integer("word_count"),
    chaptersRead: integer("chapters_read"),
    chaptersTotal: integer("chapters_total"),
    complete: boolean("complete"),
    rating: contentRatingEnum("rating"),
    fandoms: text("fandoms").array().notNull().default([]),
    relationships: text("relationships").array().notNull().default([]),
    tags: text("tags").array().notNull().default([]),

    userRating: integer("user_rating"),
    notes: text("notes"),

    ao3BookmarkId: text("ao3_bookmark_id"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
    deletedAt: bigint("deleted_at", { mode: "number" }),
    lastModifiedDevice: text("last_modified_device").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.workId] })],
);

export type WorkRecordRow = typeof workRecords.$inferSelect;
export type NewWorkRecord = typeof workRecords.$inferInsert;
