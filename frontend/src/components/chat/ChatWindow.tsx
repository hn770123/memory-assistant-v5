import React, { useEffect } from 'react';
import { ConversationList } from './ConversationList';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useChat } from '../../hooks/useChat';

export const ChatWindow: React.FC = () => {
  const {
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
    deleteConversation,
  } = useChat();

  // 初期ロード時に会話一覧を取得
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleNewConversation = async () => {
    await createConversation();
  };

  const handleSelectConversation = async (id: number) => {
    await selectConversation(id);
  };

  const handleSendMessage = async (content: string) => {
    await sendMessage(content);
  };

  const handleDeleteConversation = async (id: number) => {
    await deleteConversation(id);
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar - Conversation List */}
      <div className="w-80 flex-shrink-0">
        <ConversationList
          conversations={conversations}
          currentConversationId={currentConversation?.id || null}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          loading={loading && conversations.length === 0}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        {currentConversation && (
          <div className="border-b border-gray-200 bg-white px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {currentConversation.title || '新しい会話'}
            </h2>
            <p className="text-sm text-gray-500">
              {new Date(currentConversation.created_at).toLocaleString('ja-JP')}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          {currentConversation ? (
            <MessageList messages={messages} loading={loading} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p className="text-lg mb-2">Memory Assistant v5</p>
                <p className="text-sm">
                  新しい会話を作成するか、既存の会話を選択してください
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Message Input */}
        <MessageInput
          onSend={handleSendMessage}
          disabled={!currentConversation}
          sending={sending}
        />
      </div>
    </div>
  );
};
