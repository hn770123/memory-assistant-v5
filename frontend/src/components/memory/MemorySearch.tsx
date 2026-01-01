import { useState } from 'react';
import { useMemory } from '../../hooks/useMemory';
import MemoryCard from './MemoryCard';

export default function MemorySearch() {
  const { memories, loading, error, searchMemories, deleteMemory } = useMemory();
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length === 0) return;

    setHasSearched(true);
    await searchMemories(query);
  };

  const handleDelete = async (memoryId: number) => {
    try {
      await deleteMemory(memoryId);
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">メモリ検索</h1>
        <p className="text-gray-600">過去の記憶から関連する情報を検索します</p>
      </div>

      {/* 検索フォーム */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="検索キーワードを入力..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading || query.trim().length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '検索中...' : '検索'}
          </button>
        </div>
      </form>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* ローディング */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* 検索結果 */}
      {!loading && hasSearched && (
        <>
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p>「{query}」に関連するメモリが見つかりませんでした</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                {memories.length}件の結果が見つかりました
              </p>
              <div className="space-y-4">
                {memories.map((memory) => (
                  <MemoryCard key={memory.id} memory={memory} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
