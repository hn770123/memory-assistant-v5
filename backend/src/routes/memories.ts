import { Hono } from 'hono';
import { MemoryService } from '../services/memory.service';
import type { Env, Variables } from '../types';

const memories = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/memories - ユーザーのメモリを取得
memories.get('/', async (c) => {
  try {
    const userId = c.get('userId');
    const type = c.req.query('type') as 'core_context' | 'archive' | 'all' | undefined;
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    const memoryService = new MemoryService(c.env.DB, c.env.AI);
    const userMemories = await memoryService.getMemories(userId, type, limit, offset);

    // 総数を取得（簡易版）
    const allMemories = await memoryService.getMemories(userId, type, 10000, 0);
    const total = allMemories.length;

    return c.json({
      memories: userMemories,
      total,
    });
  } catch (error) {
    console.error('Get memories error:', error);
    return c.json({ error: 'Failed to get memories' }, 500);
  }
});

// POST /api/memories/search - メモリを検索
memories.post('/search', async (c) => {
  try {
    const userId = c.get('userId');
    const { query, limit } = await c.req.json();

    if (!query || typeof query !== 'string') {
      return c.json({ error: 'Query is required' }, 400);
    }

    const memoryService = new MemoryService(c.env.DB, c.env.AI);
    const results = await memoryService.searchMemories(
      userId,
      query,
      limit || 10
    );

    return c.json({
      results: results.map((r) => ({
        id: r.id,
        structured_text: r.structured_text,
        original_text: r.original_text,
        relevance_score: r.relevance_score,
        memory_type: r.memory_type,
        category: r.category,
        created_at: r.created_at,
      })),
    });
  } catch (error) {
    console.error('Search memories error:', error);
    return c.json({ error: 'Failed to search memories' }, 500);
  }
});

// DELETE /api/memories/:id - メモリを削除
memories.delete('/:id', async (c) => {
  try {
    const userId = c.get('userId');
    const memoryId = parseInt(c.req.param('id'));

    if (isNaN(memoryId)) {
      return c.json({ error: 'Invalid memory ID' }, 400);
    }

    const memoryService = new MemoryService(c.env.DB, c.env.AI);
    const deleted = await memoryService.deleteMemory(memoryId, userId);

    if (!deleted) {
      return c.json({ error: 'Memory not found' }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete memory error:', error);
    return c.json({ error: 'Failed to delete memory' }, 500);
  }
});

export default memories;
