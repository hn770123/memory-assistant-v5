import { eq, desc, and } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { conversations, messages } from '../db/schema';

export class ChatService {
  private db: ReturnType<typeof drizzle>;

  constructor(database: D1Database) {
    this.db = drizzle(database);
  }

  // 新しい会話を作成
  async createConversation(userId: number, title?: string) {
    const result = await this.db
      .insert(conversations)
      .values({
        user_id: userId,
        title: title || '新しい会話',
      })
      .returning();

    return result[0];
  }

  // ユーザーの会話一覧を取得
  async getConversations(userId: number) {
    const userConversations = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.user_id, userId))
      .orderBy(desc(conversations.updated_at));

    // 各会話のメッセージ数を取得
    const conversationsWithCount = await Promise.all(
      userConversations.map(async (conv) => {
        const messageCount = await this.db
          .select()
          .from(messages)
          .where(eq(messages.conversation_id, conv.id));

        return {
          ...conv,
          message_count: messageCount.length,
        };
      })
    );

    return conversationsWithCount;
  }

  // 特定の会話を取得
  async getConversation(conversationId: number, userId: number) {
    const result = await this.db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.user_id, userId)
        )
      );

    return result[0];
  }

  // 会話のメッセージ履歴を取得
  async getMessages(conversationId: number, userId: number) {
    // まず会話の所有権を確認
    const conversation = await this.getConversation(conversationId, userId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const conversationMessages = await this.db
      .select()
      .from(messages)
      .where(eq(messages.conversation_id, conversationId))
      .orderBy(messages.created_at);

    return conversationMessages;
  }

  // メッセージを保存
  async saveMessage(
    conversationId: number,
    role: 'user' | 'assistant' | 'system',
    content: string
  ) {
    const result = await this.db
      .insert(messages)
      .values({
        conversation_id: conversationId,
        role,
        content,
      })
      .returning();

    // 会話のupdated_atを更新
    await this.db
      .update(conversations)
      .set({
        updated_at: new Date().toISOString(),
      })
      .where(eq(conversations.id, conversationId));

    return result[0];
  }

  // 会話のタイトルを更新
  async updateConversationTitle(conversationId: number, userId: number, title: string) {
    const result = await this.db
      .update(conversations)
      .set({
        title,
        updated_at: new Date().toISOString(),
      })
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.user_id, userId)
        )
      )
      .returning();

    return result[0];
  }

  // 会話を削除
  async deleteConversation(conversationId: number, userId: number) {
    const result = await this.db
      .delete(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.user_id, userId)
        )
      )
      .returning();

    return result[0];
  }
}
