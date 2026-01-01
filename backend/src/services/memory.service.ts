import { eq, desc, and, or, sql } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import type { Ai } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { memories } from '../db/schema';
import { calculateSimilarity } from '../utils/similarity';

export interface StructuredMemory {
  text: string;
  type: 'core_context' | 'archive';
  category: string;
  importance_score: number;
}

export interface MemoryClassification {
  type: 'core_context' | 'archive';
  category: string;
  importance_score: number;
}

export class MemoryService {
  private db: ReturnType<typeof drizzle>;
  private ai: Ai;

  constructor(database: D1Database, ai: Ai) {
    this.db = drizzle(database);
    this.ai = ai;
  }

  /**
   * ユーザー入力を構造化されたテキストに変換
   * 例: "私は東京に住んでいるITエンジニアです"
   * → ["ユーザーは東京に住んでいる", "ユーザーはITエンジニアである"]
   */
  async structurizeUserInput(userInput: string): Promise<string[]> {
    const prompt = `ユーザーの発言を、第三者視点の客観的な事実文に変換してください。

入力例: "私は東京に住んでいるITエンジニアです"
出力例:
["ユーザーは東京に住んでいる", "ユーザーはITエンジニアである"]

入力例: "最近、プロジェクトマネージャーになりました"
出力例:
["ユーザーは最近プロジェクトマネージャーになった"]

ルール:
1. 一文ごとに独立した事実として分割
2. 「私は」→「ユーザーは」に変換
3. 時制を維持
4. 感情や意見も事実として記録
5. JSON配列で返す（他のテキストは含めない）

入力: ${userInput}`;

    try {
      const response = await this.ai.run('@cf/meta/llama-3-8b-instruct', {
        messages: [{ role: 'user', content: prompt }],
      });

      if (response && typeof response === 'object' && 'response' in response) {
        const responseText = (response as { response: string }).response.trim();

        // JSON配列を抽出（マークダウンコードブロックがある場合も対応）
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.filter((item) => typeof item === 'string' && item.trim().length > 0);
          }
        }
      }

      // AIの応答が期待通りでない場合、入力をそのまま返す
      return [];
    } catch (error) {
      console.error('Structurization error:', error);
      return [];
    }
  }

  /**
   * 構造化されたテキストをメモリタイプに分類
   */
  async classifyMemory(structuredText: string): Promise<MemoryClassification> {
    const prompt = `以下の情報を分類してください。

core_context（常にコンテキストに含める）:
- ユーザーの基本属性（職業、居住地、趣味など）
- 重要な個人情報
- 継続的な状況（現在進行中のプロジェクト、悩みなど）

archive（記録のみ）:
- 一時的な出来事
- 過去の特定のエピソード
- 検索時に必要な詳細情報

入力: ${structuredText}

JSON形式で返してください（他のテキストは含めない）:
{
  "type": "core_context",
  "category": "職業",
  "importance_score": 0.8
}`;

    try {
      const response = await this.ai.run('@cf/meta/llama-3-8b-instruct', {
        messages: [{ role: 'user', content: prompt }],
      });

      if (response && typeof response === 'object' && 'response' in response) {
        const responseText = (response as { response: string }).response.trim();

        // JSONオブジェクトを抽出
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);

          // バリデーション
          const type = parsed.type === 'archive' ? 'archive' : 'core_context';
          const category = parsed.category || 'その他';
          const importance_score = typeof parsed.importance_score === 'number'
            ? Math.max(0, Math.min(1, parsed.importance_score))
            : 0.5;

          return { type, category, importance_score };
        }
      }

      // デフォルト値
      return {
        type: 'core_context',
        category: 'その他',
        importance_score: 0.5,
      };
    } catch (error) {
      console.error('Classification error:', error);
      return {
        type: 'core_context',
        category: 'その他',
        importance_score: 0.5,
      };
    }
  }

  /**
   * 重複チェック
   * 既存のメモリと類似度を計算し、重複していればtrue
   */
  async isDuplicate(
    userId: number,
    structuredText: string,
    threshold: number = 0.85
  ): Promise<boolean> {
    // ユーザーの既存メモリを取得
    const existingMemories = await this.db
      .select()
      .from(memories)
      .where(eq(memories.user_id, userId));

    // 完全一致チェック
    const exactMatch = existingMemories.some(
      (memory) => memory.structured_text === structuredText
    );
    if (exactMatch) {
      return true;
    }

    // 類似度チェック
    for (const memory of existingMemories) {
      const similarity = calculateSimilarity(
        structuredText,
        memory.structured_text
      );
      if (similarity >= threshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * メモリを保存
   */
  async saveMemory(
    userId: number,
    conversationId: number,
    originalText: string,
    structuredText: string,
    memoryType: 'core_context' | 'archive',
    category: string,
    importanceScore: number
  ) {
    const result = await this.db
      .insert(memories)
      .values({
        user_id: userId,
        conversation_id: conversationId,
        original_text: originalText,
        structured_text: structuredText,
        memory_type: memoryType,
        category,
        importance_score: importanceScore,
      })
      .returning();

    return result[0];
  }

  /**
   * ユーザーのメモリを取得
   */
  async getMemories(
    userId: number,
    type?: 'core_context' | 'archive' | 'all',
    limit: number = 50,
    offset: number = 0
  ) {
    let query = this.db
      .select()
      .from(memories)
      .where(eq(memories.user_id, userId));

    if (type && type !== 'all') {
      query = query.where(
        and(
          eq(memories.user_id, userId),
          eq(memories.memory_type, type)
        )
      );
    }

    const results = await query
      .orderBy(desc(memories.importance_score), desc(memories.created_at))
      .limit(limit)
      .offset(offset);

    return results;
  }

  /**
   * コアコンテキストメモリを取得（AI応答生成時に使用）
   */
  async getCoreContextMemories(userId: number): Promise<string[]> {
    const coreMemories = await this.db
      .select()
      .from(memories)
      .where(
        and(
          eq(memories.user_id, userId),
          eq(memories.memory_type, 'core_context')
        )
      )
      .orderBy(desc(memories.importance_score))
      .limit(20); // 最大20個のコアコンテキスト

    return coreMemories.map((m) => m.structured_text);
  }

  /**
   * メモリを検索
   */
  async searchMemories(userId: number, query: string, limit: number = 10) {
    // 簡易的なキーワード検索
    const allMemories = await this.db
      .select()
      .from(memories)
      .where(eq(memories.user_id, userId));

    // 類似度でソート
    const memoriesWithScore = allMemories.map((memory) => ({
      ...memory,
      relevance_score: calculateSimilarity(query, memory.structured_text),
    }));

    // スコアでソートして上位を返す
    return memoriesWithScore
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit);
  }

  /**
   * メモリのアクセスカウントを更新
   */
  async updateAccessCount(memoryId: number) {
    await this.db
      .update(memories)
      .set({
        access_count: sql`${memories.access_count} + 1`,
        last_accessed_at: new Date().toISOString(),
      })
      .where(eq(memories.id, memoryId));
  }

  /**
   * メモリを削除
   */
  async deleteMemory(memoryId: number, userId: number) {
    const result = await this.db
      .delete(memories)
      .where(
        and(
          eq(memories.id, memoryId),
          eq(memories.user_id, userId)
        )
      )
      .returning();

    return result[0];
  }

  /**
   * ユーザー入力からメモリを処理して保存（統合メソッド）
   */
  async processAndSaveMemories(
    userId: number,
    conversationId: number,
    userInput: string
  ) {
    const savedMemories = [];

    // 1. 構造化変換
    const structuredTexts = await this.structurizeUserInput(userInput);

    // 2. 各構造化テキストを処理
    for (const structuredText of structuredTexts) {
      // 3. 重複チェック
      const isDuplicate = await this.isDuplicate(userId, structuredText);
      if (isDuplicate) {
        continue; // 重複していればスキップ
      }

      // 4. メモリ分類
      const classification = await this.classifyMemory(structuredText);

      // 5. メモリ保存
      const savedMemory = await this.saveMemory(
        userId,
        conversationId,
        userInput,
        structuredText,
        classification.type,
        classification.category,
        classification.importance_score
      );

      savedMemories.push(savedMemory);
    }

    return savedMemories;
  }
}
