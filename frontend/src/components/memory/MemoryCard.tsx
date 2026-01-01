import type { Memory } from '../../types';

interface MemoryCardProps {
  memory: Memory;
  onDelete?: (memoryId: number) => void;
}

export default function MemoryCard({ memory, onDelete }: MemoryCardProps) {
  const handleDelete = () => {
    if (onDelete && confirm('このメモリを削除してもよろしいですか?')) {
      onDelete(memory.id);
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'core_context' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800';
  };

  const getImportanceColor = (score: number) => {
    if (score >= 0.8) return 'bg-red-500';
    if (score >= 0.6) return 'bg-orange-500';
    if (score >= 0.4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(memory.memory_type)}`}>
            {memory.memory_type === 'core_context' ? 'コアコンテキスト' : 'アーカイブ'}
          </span>
          {memory.category && (
            <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">
              {memory.category}
            </span>
          )}
        </div>
        <button
          onClick={handleDelete}
          className="text-gray-400 hover:text-red-600 transition-colors"
          title="削除"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p className="text-gray-900 mb-2">{memory.structured_text}</p>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span>重要度:</span>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${getImportanceColor(memory.importance_score)}`} />
              <span>{(memory.importance_score * 100).toFixed(0)}%</span>
            </div>
          </div>
          {memory.access_count > 0 && (
            <span>アクセス回数: {memory.access_count}</span>
          )}
        </div>
        <span>{new Date(memory.created_at).toLocaleDateString('ja-JP')}</span>
      </div>

      {memory.original_text !== memory.structured_text && (
        <details className="mt-2 text-xs text-gray-600">
          <summary className="cursor-pointer hover:text-gray-900">元のテキスト</summary>
          <p className="mt-1 pl-4 border-l-2 border-gray-200">{memory.original_text}</p>
        </details>
      )}
    </div>
  );
}
