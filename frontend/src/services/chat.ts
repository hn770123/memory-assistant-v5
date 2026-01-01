import api from './api';
import type {
  Conversation,
  ConversationCreateInput,
  Message,
  MessageCreateInput,
  MessageResponse,
} from '../types';

export const chatService = {
  // 新しい会話を作成
  async createConversation(
    data: ConversationCreateInput
  ): Promise<{ conversation: Conversation }> {
    return api.post<{ conversation: Conversation }>('/api/conversations', data);
  },

  // ユーザーの会話一覧を取得
  async getConversations(): Promise<{
    conversations: (Conversation & { message_count: number })[];
  }> {
    return api.get<{ conversations: (Conversation & { message_count: number })[] }>('/api/conversations');
  },

  // 特定の会話を取得
  async getConversation(id: number): Promise<{ conversation: Conversation }> {
    return api.get<{ conversation: Conversation }>(`/api/conversations/${id}`);
  },

  // 会話のメッセージ履歴を取得
  async getMessages(conversationId: number): Promise<{ messages: Message[] }> {
    return api.get<{ messages: Message[] }>(`/api/conversations/${conversationId}/messages`);
  },

  // メッセージを送信してAI応答を取得
  async sendMessage(
    conversationId: number,
    data: MessageCreateInput
  ): Promise<MessageResponse> {
    return api.post<MessageResponse>(
      `/api/conversations/${conversationId}/messages`,
      data
    );
  },

  // 会話のタイトルを更新
  async updateConversationTitle(
    conversationId: number,
    title: string
  ): Promise<{ conversation: Conversation }> {
    return api.patch<{ conversation: Conversation }>(`/api/conversations/${conversationId}`, {
      title,
    });
  },

  // 会話を削除
  async deleteConversation(
    conversationId: number
  ): Promise<{ success: boolean }> {
    return api.delete<{ success: boolean }>(`/api/conversations/${conversationId}`);
  },
};
