-- KokontsevOS v0.1 Database Schema
-- This migration creates the base tables for the system in schema public

-- Use pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- PROFILE table
CREATE TABLE IF NOT EXISTS public.profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100),
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- GOALS table
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profile(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'open',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PROJECTS table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profile(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TASKS table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'todo',
  priority INTEGER DEFAULT 0,
  due_date DATE,
  assignee_id UUID REFERENCES public.profile(id),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CAPTURES table
CREATE TABLE IF NOT EXISTS public.captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_text TEXT NOT NULL,
  source TEXT NOT NULL,
  classification JSONB,
  type TEXT,
  area TEXT,
  project_hint TEXT,
  action_required BOOLEAN DEFAULT false,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- DAILY_LOGS table
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profile(id) ON DELETE CASCADE,
  entry_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  content TEXT,
  mood VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DECISIONS table
CREATE TABLE IF NOT EXISTS public.decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profile(id) ON DELETE CASCADE,
  title VARCHAR(255),
  decision_text TEXT,
  rationale TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- WEEKLY_REVIEWS table
CREATE TABLE IF NOT EXISTS public.weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profile(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  summary TEXT,
  insights JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PLANNING_RULES table
CREATE TABLE IF NOT EXISTS public.planning_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profile(id) ON DELETE CASCADE,
  name VARCHAR(255),
  rule JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CURRENT_MODE table
CREATE TABLE IF NOT EXISTS public.current_mode (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profile(id) ON DELETE CASCADE,
  mode VARCHAR(100) NOT NULL,
  metadata JSONB,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for foreign keys and common queries
CREATE INDEX IF NOT EXISTS idx_goals_profile_id ON public.goals(profile_id);
CREATE INDEX IF NOT EXISTS idx_projects_profile_id ON public.projects(profile_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_captures_profile_id ON public.captures(profile_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_profile_id ON public.daily_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_profile_id ON public.weekly_reviews(profile_id);

-- Run this migration in Supabase SQL Editor
-- No down migration provided for v0.1

