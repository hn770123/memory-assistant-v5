import { useEffect, useState } from 'react';
import { useMemory } from '../../hooks/useMemory';
import MemoryCard from './MemoryCard';
import type { MemoryType } from '../../types';

export default function MemoryList() {
  const { memories, loading, error, total, fetchMemories, deleteMemory } = useMemory();
  const [filter, setFilter] = useState<MemoryType | 'all'>('all');

  useEffect(() => {
    fetchMemories(filter);
  }, [filter, fetchMemories]);

  const handleDelete = async (memoryId: number) => {
    try {
      await deleteMemory(memoryId);
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  };

  if (loading && memories.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">メモリ管理</h1>
        <p className="text-gray-600">AIが記憶している情報を管理できます</p>
      </div>

      {/* フィルター */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          すべて ({total})
        </button>
        <button
          onClick={() => setFilter('core_context')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'core_context'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          コアコンテキスト
        </button>
        <button
          onClick={() => setFilter('archive')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'archive'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          アーカイブ
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* メモリ一覧 */}
      {memories.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p>メモリが見つかりませんでした</p>
          <p className="text-sm mt-2">チャットを開始すると、AIが自動的に重要な情報を記憶します</p>
        </div>
      ) : (
        <div className="space-y-4">
          {memories.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
