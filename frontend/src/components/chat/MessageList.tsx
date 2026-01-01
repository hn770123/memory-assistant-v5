import React, { useEffect, useRef } from 'react';
import type { Message } from '../../types';

interface MessageListProps {
  messages: Message[];
  loading?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  loading,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 新しいメッセージが追加されたら自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">新しい会話を始めましょう</p>
          <p className="text-sm">メッセージを入力してください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`max-w-[70%] rounded-lg px-4 py-3 ${
              message.role === 'user'
                ? 'bg-blue-600 text-white'
                : message.role === 'assistant'
                ? 'bg-gray-100 text-gray-900'
                : 'bg-yellow-50 text-gray-700 border border-yellow-200'
            }`}
          >
            {/* Role indicator for system messages */}
            {message.role === 'system' && (
              <div className="text-xs font-semibold text-yellow-700 mb-1">
                システム
              </div>
            )}

            {/* Message content */}
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>

            {/* Timestamp */}
            <div
              className={`text-xs mt-2 ${
                message.role === 'user'
                  ? 'text-blue-100'
                  : message.role === 'assistant'
                  ? 'text-gray-500'
                  : 'text-yellow-600'
              }`}
            >
              {new Date(message.created_at).toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};
