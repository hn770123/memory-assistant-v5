import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Users table
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  display_name: text('display_name'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Conversations table
export const conversations = sqliteTable('conversations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Messages table
export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  conversation_id: integer('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Memories table
export const memories = sqliteTable('memories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  conversation_id: integer('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
  original_text: text('original_text').notNull(),
  structured_text: text('structured_text').notNull(),
  memory_type: text('memory_type', { enum: ['core_context', 'archive'] }).notNull(),
  category: text('category'),
  importance_score: real('importance_score').default(0.5),
  access_count: integer('access_count').default(0),
  last_accessed_at: text('last_accessed_at'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Memory embeddings table
export const memory_embeddings = sqliteTable('memory_embeddings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  memory_id: integer('memory_id').notNull().references(() => memories.id, { onDelete: 'cascade' }),
  embedding_text: text('embedding_text').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
