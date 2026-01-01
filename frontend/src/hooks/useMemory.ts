import { useState, useEffect, useCallback } from 'react';
import type { Memory, MemoryType } from '../types';
import * as memoryService from '../services/memory';

export function useMemory() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // メモリ一覧を取得
  const fetchMemories = useCallback(
    async (type?: MemoryType | 'all', limit = 50, offset = 0) => {
      setLoading(true);
      setError(null);
      try {
        const response = await memoryService.getMemories({ type, limit, offset });
        setMemories(response.memories);
        setTotal(response.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch memories');
        console.error('Fetch memories error:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // メモリを検索
  const searchMemories = useCallback(async (query: string, limit = 10) => {
    setLoading(true);
    setError(null);
    try {
      const response = await memoryService.searchMemories({ query, limit });
      setMemories(response.results);
      setTotal(response.results.length);
      return response.results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search memories');
      console.error('Search memories error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // メモリを削除
  const deleteMemory = useCallback(
    async (memoryId: number) => {
      setError(null);
      try {
        await memoryService.deleteMemory(memoryId);
        // ローカル状態から削除
        setMemories((prev) => prev.filter((m) => m.id !== memoryId));
        setTotal((prev) => prev - 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete memory');
        console.error('Delete memory error:', err);
        throw err;
      }
    },
    []
  );

  return {
    memories,
    loading,
    error,
    total,
    fetchMemories,
    searchMemories,
    deleteMemory,
  };
}
