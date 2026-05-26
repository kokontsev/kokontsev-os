/**
 * Core type definitions for KokontsevOS
 */

// Classification types
export type ClassificationType = 
  | 'task'
  | 'daily_log'
  | 'solution'
  | 'idea'
  | 'blocker'
  | 'plan_request';

export type SourceType =
  | 'api'
  | 'telegram'
  | 'notion'
  | 'web';

export type LanguageType = 'ru' | 'en';

/**
 * Database Models
 */

export interface User {
  id: string; // UUID
  username: string;
  email?: string;
  api_key_hash: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface Message {
  id: string; // UUID
  user_id: string; // FK to users
  content: string;
  content_length: number;
  classification: ClassificationType;
  classification_confidence: number; // 0.0 - 1.0
  ai_response: string;
  ai_response_tokens?: number;
  language: LanguageType;
  source: SourceType;
  tags?: string[];
  custom_metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  is_starred: boolean;
}

export interface ClassificationAudit {
  id: string; // UUID
  user_id: string; // FK to users
  message_id: string; // FK to messages
  predicted_classification: ClassificationType;
  predicted_confidence: number;
  actual_classification?: ClassificationType;
  is_correct?: boolean;
  model_used: string;
  tokens_used?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  timestamp: string;
  processing_time_ms?: number;
}

/**
 * API Request/Response Types
 */

export interface CreateMessageRequest {
  content: string;
  language?: LanguageType;
  source?: SourceType;
  tags?: string[];
  custom_metadata?: Record<string, unknown>;
}

export interface MessageResponse {
  success: boolean;
  message?: Message;
  error?: string;
  code?: string;
}

export interface ClassificationResponse {
  type: ClassificationType;
  confidence: number;
  reasoning?: string;
}

export interface AIResponse {
  response: string;
  tokens_used?: number;
}

/**
 * API Response Envelope
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
  timestamp: string;
}

/**
 * Error Types
 */

export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: Record<string, unknown>;
}

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE_ENTITY'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_SERVER_ERROR'
  | 'SERVICE_UNAVAILABLE';
