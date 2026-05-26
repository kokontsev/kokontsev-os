-- KokontsevOS v0.1 Database Schema
-- This migration creates the base tables for the system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100),
  api_key_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_api_key_hash ON users(api_key_hash);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_length INT GENERATED ALWAYS AS (LENGTH(content)) STORED,
  classification VARCHAR(50) NOT NULL,
  classification_confidence FLOAT DEFAULT 0,
  ai_response TEXT,
  ai_response_tokens INT,
  language VARCHAR(10) DEFAULT 'ru',
  source VARCHAR(50) DEFAULT 'api',
  tags JSONB,
  custom_metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_archived BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_classification ON messages(classification);
CREATE INDEX IF NOT EXISTS idx_messages_user_created ON messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_tags ON messages USING GIN (tags);

-- Classifications audit table
CREATE TABLE IF NOT EXISTS classifications_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  predicted_classification VARCHAR(50) NOT NULL,
  predicted_confidence FLOAT NOT NULL,
  actual_classification VARCHAR(50),
  is_correct BOOLEAN,
  model_used VARCHAR(50) DEFAULT 'gpt-4-mini',
  tokens_used INT,
  prompt_tokens INT,
  completion_tokens INT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processing_time_ms INT
);

CREATE INDEX IF NOT EXISTS idx_classifications_audit_user_id ON classifications_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_classifications_audit_message_id ON classifications_audit(message_id);
CREATE INDEX IF NOT EXISTS idx_classifications_audit_timestamp ON classifications_audit(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_classifications_audit_is_correct ON classifications_audit(is_correct);

-- Run this migration in Supabase SQL Editor
-- No down migration needed for v0.1
