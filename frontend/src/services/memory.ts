import api from './api';
import type { Memory, MemoryType, MemorySearchQuery } from '../types';

export interface MemoryListParams {
  type?: MemoryType | 'all';
  limit?: number;
  offset?: number;
}

export interface MemoryListResponse {
  memories: Memory[];
  total: number;
}

export interface MemorySearchResult extends Memory {
  relevance_score: number;
}

export interface MemorySearchResponse {
  results: MemorySearchResult[];
}

// メモリ一覧を取得
export async function getMemories(params?: MemoryListParams): Promise<MemoryListResponse> {
  const queryParams = new URLSearchParams();

  if (params?.type) {
    queryParams.append('type', params.type);
  }
  if (params?.limit) {
    queryParams.append('limit', params.limit.toString());
  }
  if (params?.offset) {
    queryParams.append('offset', params.offset.toString());
  }

  const response = await api.get(`/api/memories?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch memories');
  }

  return response.json();
}

// メモリを検索
export async function searchMemories(query: MemorySearchQuery): Promise<MemorySearchResponse> {
  const response = await api.post('/api/memories/search', query);
  if (!response.ok) {
    throw new Error('Failed to search memories');
  }

  return response.json();
}

// メモリを削除
export async function deleteMemory(memoryId: number): Promise<{ success: boolean }> {
  const response = await api.delete(`/api/memories/${memoryId}`);
  if (!response.ok) {
    throw new Error('Failed to delete memory');
  }

  return response.json();
}
