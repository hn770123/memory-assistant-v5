// Shared type definitions between frontend and backend

// User types
export interface User {
  id: number;
  email: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCreateInput {
  email: string;
  password: string;
  display_name?: string;
}

export interface UserLoginInput {
  email: string;
  password: string;
}

// Conversation types
export interface Conversation {
  id: number;
  user_id: number;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationCreateInput {
  title?: string;
}

// Message types
export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: number;
  conversation_id: number;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface MessageCreateInput {
  content: string;
}

// Memory types
export type MemoryType = 'core_context' | 'archive';

export interface Memory {
  id: number;
  user_id: number;
  conversation_id: number | null;
  original_text: string;
  structured_text: string;
  memory_type: MemoryType;
  category: string | null;
  importance_score: number;
  access_count: number;
  last_accessed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemoryCreateInput {
  original_text: string;
  structured_text: string;
  memory_type: MemoryType;
  category?: string;
  importance_score?: number;
  conversation_id?: number;
}

export interface MemorySearchQuery {
  query: string;
  limit?: number;
}

// API Response types
export interface AuthResponse {
  user: User;
  token: string;
}

export interface MessageResponse {
  message: Message;
  ai_response: Message;
  memories_created?: Memory[];
}

export interface ApiError {
  error: string;
  details?: any;
}

export interface HealthCheckResponse {
  status: string;
  timestamp?: string;
}
