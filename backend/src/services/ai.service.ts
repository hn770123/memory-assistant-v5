import type { Ai } from '@cloudflare/workers-types';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class AIService {
  private ai: Ai;

  constructor(ai: Ai) {
    this.ai = ai;
  }

  // AI応答を生成
  async generateResponse(
    messages: Message[],
    systemPrompt?: string
  ): Promise<string> {
    const messagesWithSystem: Message[] = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    try {
      const response = await this.ai.run('@cf/meta/llama-3-8b-instruct', {
        messages: messagesWithSystem,
      });

      // responseの型をチェック
      if (response && typeof response === 'object' && 'response' in response) {
        return (response as { response: string }).response;
      }

      throw new Error('Unexpected AI response format');
    } catch (error) {
      console.error('AI generation error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  // ストリーミングレスポンス（将来の実装用）
  async generateStreamingResponse(
    messages: Message[],
    systemPrompt?: string
  ): Promise<ReadableStream> {
    const messagesWithSystem: Message[] = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    try {
      const response = await this.ai.run('@cf/meta/llama-3-8b-instruct', {
        messages: messagesWithSystem,
        stream: true,
      });

      // responseがReadableStreamかどうか確認
      if (response instanceof ReadableStream) {
        return response;
      }

      throw new Error('Expected streaming response');
    } catch (error) {
      console.error('AI streaming error:', error);
      throw new Error('Failed to generate streaming AI response');
    }
  }

  // 会話履歴からコンテキストを構築
  buildContext(coreContextMemories: string[]): string {
    if (coreContextMemories.length === 0) {
      return '';
    }

    return `## ユーザーについて知っていること（重要な情報）\n${coreContextMemories.map((m) => `- ${m}`).join('\n')}`;
  }

  // システムプロンプトを構築
  buildSystemPrompt(coreContextMemories?: string[]): string {
    const basePrompt = `あなたは親切で思いやりのあるAIアシスタントです。ユーザーとの会話を通じて、彼らをサポートし、有益な情報を提供します。`;

    if (coreContextMemories && coreContextMemories.length > 0) {
      const context = this.buildContext(coreContextMemories);
      return `${basePrompt}\n\n${context}\n\nこれらの情報を考慮しながら、ユーザーに対して適切に応答してください。`;
    }

    return basePrompt;
  }
}
