import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const songs = sqliteTable("songs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  songBookId: integer("song_book_id")
    .notNull()
    .references(() => songBooks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  number: integer("number"),
  powerPointPath: text("power_point_path").notNull(),
  text: text("text"),
});

export type Song = InferSelectModel<typeof songs>;
export type NewSong = InferInsertModel<typeof songs>;

export const songBooks = sqliteTable("song_books", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  path: text("path").notNull(),
});

export type SongBook = InferSelectModel<typeof songBooks>;
export type NewSongBook = InferInsertModel<typeof songBooks>;

export const scheduledSongs = sqliteTable("scheduled_songs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  songBookId: integer("song_book_id")
    .notNull()
    .references(() => songBooks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  number: integer("number"),
  powerPointPath: text("power_point_path").notNull(),
  isActive: integer("is_active").notNull().default(0), // 0 or 1
});

export type ScheduledSong = InferSelectModel<typeof scheduledSongs>;
export type NewScheduledSong = InferInsertModel<typeof scheduledSongs>;
