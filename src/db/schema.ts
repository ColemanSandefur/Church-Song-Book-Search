import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const songs = sqliteTable('songs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  number: integer('number').notNull(),
  text: text('text'),
});

export type Song = InferSelectModel<typeof songs>;
export type NewSong = InferInsertModel<typeof songs>;