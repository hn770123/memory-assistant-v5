import { useState, useCallback } from 'react';
import { chatService } from '../services/chat';
import type {
  Conversation,
  Message,
  ConversationCreateInput,
} from '../types';

export const useChat = () => {
  const [conversations, setConversations] = useState<
    (Conversation & { message_count: number })[]
  >([]);
  const [currentConversation, setCurrentConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 会話一覧を取得
  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { conversations: convs } = await chatService.getConversations();
      setConversations(convs);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch conversations'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // 新しい会話を作成
  const createConversation = useCallback(
    async (data?: ConversationCreateInput) => {
      setLoading(true);
      setError(null);
      try {
        const { conversation } = await chatService.createConversation(
          data || {}
        );
        setConversations((prev) => [
          { ...conversation, message_count: 0 },
          ...prev,
        ]);
        setCurrentConversation(conversation);
        setMessages([]);
        return conversation;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to create conversation'
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 会話を選択してメッセージを取得
  const selectConversation = useCallback(async (conversationId: number) => {
    setLoading(true);
    setError(null);
    try {
      const [{ conversation }, { messages: msgs }] = await Promise.all([
        chatService.getConversation(conversationId),
        chatService.getMessages(conversationId),
      ]);
      setCurrentConversation(conversation);
      setMessages(msgs);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load conversation'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // メッセージを送信
  const sendMessage = useCallback(
    async (content: string) => {
      if (!currentConversation) {
        setError('No conversation selected');
        return;
      }

      setSending(true);
      setError(null);

      // 楽観的更新: ユーザーメッセージを即座に表示
      const optimisticUserMessage: Message = {
        id: Date.now(), // 一時ID
        conversation_id: currentConversation.id,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticUserMessage]);

      try {
        const { message, ai_response } = await chatService.sendMessage(
          currentConversation.id,
          { content }
        );

        // 実際のメッセージで置き換え
        setMessages((prev) => {
          const filtered = prev.filter(
            (msg) => msg.id !== optimisticUserMessage.id
          );
          return [...filtered, message, ai_response];
        });

        // 会話一覧を更新（最新の会話を先頭に）
        await fetchConversations();
      } catch (err) {
        // エラー時は楽観的更新をロールバック
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== optimisticUserMessage.id)
        );
        setError(err instanceof Error ? err.message : 'Failed to send message');
      } finally {
        setSending(false);
      }
    },
    [currentConversation, fetchConversations]
  );

  // 会話のタイトルを更新
  const updateConversationTitle = useCallback(
    async (conversationId: number, title: string) => {
      setError(null);
      try {
        const { conversation } = await chatService.updateConversationTitle(
          conversationId,
          title
        );
        setConversations((prev) =>
          prev.map((conv) => (conv.id === conversationId ? { ...conv, title: conversation.title } : conv))
        );
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(conversation);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to update conversation'
        );
      }
    },
    [currentConversation]
  );

  // 会話を削除
  const deleteConversation = useCallback(
    async (conversationId: number) => {
      setError(null);
      try {
        await chatService.deleteConversation(conversationId);
        setConversations((prev) =>
          prev.filter((conv) => conv.id !== conversationId)
        );
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(null);
          setMessages([]);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to delete conversation'
        );
      }
    },
    [currentConversation]
  );

  // 現在の会話をクリア
  const clearCurrentConversation = useCallback(() => {
    setCurrentConversation(null);
    setMessages([]);
  }, []);

  return {
    conversations,
    currentConversation,
    messages,
    loading,
    sending,
    error,
    fetchConversations,
    createConversation,
    selectConversation,
    sendMessage,
    updateConversationTitle,
    deleteConversation,
    clearCurrentConversation,
  };
};
