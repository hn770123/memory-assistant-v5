import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware, type AuthContext } from '../middleware/auth.middleware';
import { ChatService } from '../services/chat.service';
import { AIService } from '../services/ai.service';
import { MemoryService } from '../services/memory.service';

const app = new Hono<{ Bindings: Env; Variables: AuthContext }>();

// すべてのルートに認証を適用
app.use('*', authMiddleware);

// 新しい会話を作成
app.post('/', async (c) => {
  const user = c.get('user');
  const { title } = await c.req.json();

  const chatService = new ChatService(c.env.DB);
  const conversation = await chatService.createConversation(user.userId, title);

  return c.json({ conversation }, 201);
});

// ユーザーの会話一覧を取得
app.get('/', async (c) => {
  const user = c.get('user');

  const chatService = new ChatService(c.env.DB);
  const conversations = await chatService.getConversations(user.userId);

  return c.json({ conversations });
});

// 特定の会話を取得
app.get('/:id', async (c) => {
  const user = c.get('user');
  const conversationId = parseInt(c.req.param('id'));

  if (isNaN(conversationId)) {
    return c.json({ error: 'Invalid conversation ID' }, 400);
  }

  const chatService = new ChatService(c.env.DB);
  const conversation = await chatService.getConversation(conversationId, user.userId);

  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  return c.json({ conversation });
});

// 会話のメッセージ履歴を取得
app.get('/:id/messages', async (c) => {
  const user = c.get('user');
  const conversationId = parseInt(c.req.param('id'));

  if (isNaN(conversationId)) {
    return c.json({ error: 'Invalid conversation ID' }, 400);
  }

  try {
    const chatService = new ChatService(c.env.DB);
    const messages = await chatService.getMessages(conversationId, user.userId);

    return c.json({ messages });
  } catch (error) {
    if (error instanceof Error && error.message === 'Conversation not found') {
      return c.json({ error: 'Conversation not found' }, 404);
    }
    throw error;
  }
});

// メッセージを送信してAI応答を取得
app.post('/:id/messages', async (c) => {
  const user = c.get('user');
  const conversationId = parseInt(c.req.param('id'));

  if (isNaN(conversationId)) {
    return c.json({ error: 'Invalid conversation ID' }, 400);
  }

  const { content } = await c.req.json();

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return c.json({ error: 'Message content is required' }, 400);
  }

  try {
    const chatService = new ChatService(c.env.DB);

    // 会話の所有権を確認
    const conversation = await chatService.getConversation(conversationId, user.userId);
    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    // ユーザーメッセージを保存
    const userMessage = await chatService.saveMessage(
      conversationId,
      'user',
      content
    );

    // 会話履歴を取得
    const messageHistory = await chatService.getMessages(conversationId, user.userId);

    // AIサービスとメモリサービスを初期化
    const aiService = new AIService(c.env.AI);
    const memoryService = new MemoryService(c.env.DB, c.env.AI);

    // コアコンテキストメモリを取得
    const coreContextMemories = await memoryService.getCoreContextMemories(user.userId);

    // システムプロンプトを構築（コアコンテキストを含む）
    const systemPrompt = aiService.buildSystemPrompt(coreContextMemories);

    // メッセージ履歴をAI用のフォーマットに変換
    const aiMessages = messageHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    // AI応答を生成
    const aiResponse = await aiService.generateResponse(
      aiMessages,
      systemPrompt
    );

    // AI応答を保存
    const assistantMessage = await chatService.saveMessage(
      conversationId,
      'assistant',
      aiResponse
    );

    // ユーザー入力からメモリを処理して保存
    const memoriesCreated = await memoryService.processAndSaveMemories(
      user.userId,
      conversationId,
      content
    );

    // 会話のタイトルが未設定の場合、最初のメッセージから生成
    if (conversation.title === '新しい会話' && messageHistory.length === 1) {
      const title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
      await chatService.updateConversationTitle(conversationId, user.userId, title);
    }

    return c.json({
      message: userMessage,
      ai_response: assistantMessage,
      memories_created: memoriesCreated.map((m) => ({
        id: m.id,
        structured_text: m.structured_text,
        memory_type: m.memory_type,
        category: m.category,
      })),
    });
  } catch (error) {
    console.error('Error sending message:', error);
    if (error instanceof Error && error.message === 'Conversation not found') {
      return c.json({ error: 'Conversation not found' }, 404);
    }
    return c.json({ error: 'Failed to send message' }, 500);
  }
});

// 会話のタイトルを更新
app.patch('/:id', async (c) => {
  const user = c.get('user');
  const conversationId = parseInt(c.req.param('id'));

  if (isNaN(conversationId)) {
    return c.json({ error: 'Invalid conversation ID' }, 400);
  }

  const { title } = await c.req.json();

  if (!title || typeof title !== 'string') {
    return c.json({ error: 'Title is required' }, 400);
  }

  const chatService = new ChatService(c.env.DB);
  const conversation = await chatService.updateConversationTitle(
    conversationId,
    user.userId,
    title
  );

  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  return c.json({ conversation });
});

// 会話を削除
app.delete('/:id', async (c) => {
  const user = c.get('user');
  const conversationId = parseInt(c.req.param('id'));

  if (isNaN(conversationId)) {
    return c.json({ error: 'Invalid conversation ID' }, 400);
  }

  const chatService = new ChatService(c.env.DB);
  const conversation = await chatService.deleteConversation(conversationId, user.userId);

  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  return c.json({ success: true });
});

export default app;
