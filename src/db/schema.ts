import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  value: text('value'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(new Date()),
});

export type Item = InferSelectModel<typeof items>;
export type NewItem = InferInsertModel<typeof items>;