# KokontsevOS — Data Model & Database Schema

## Обзор данных

Oleg OS хранит данные в **Postgres** (через Supabase). Основные сущности:
- Users (пока только один)
- Messages (входящие сообщения)
- Classifications (история классификаций)

---

## Database Schema v0.1

### Таблица: `users`

Хранит информацию о пользователе.

```sql
CREATE TABLE users (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Profile
  username VARCHAR(50) NOT NULL UNIQUE,  -- пользователь
  email VARCHAR(100),                    -- может быть NULL в v0.1
  
  -- Authentication
  api_key_hash VARCHAR(255) NOT NULL,    -- bcrypt хеш API key
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Status
  is_active BOOLEAN DEFAULT true
);

-- Индексы
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_api_key_hash ON users(api_key_hash);
```

**Примечания**:
- `api_key_hash`: Храним хеш ключа, не сам ключ
- `email`: НЕ требуется в v0.1 (может быть заполнено позже)
- Один пользователь

---

### Таблица: `messages`

Основная таблица с входящими сообщениями и классификацией.

```sql
CREATE TABLE messages (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User Reference
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Content
  content TEXT NOT NULL,                       -- входящее сообщение
  content_length INT GENERATED ALWAYS AS (LENGTH(content)) STORED,
  
  -- Classification
  classification VARCHAR(50) NOT NULL,        -- task, daily_log, solution, idea, blocker, plan_request
  classification_confidence FLOAT DEFAULT 0,  -- 0.0 - 1.0
  
  -- AI Response
  ai_response TEXT,                           -- ответ системы
  ai_response_tokens INT,                     -- количество токенов в ответе
  
  -- Metadata
  language VARCHAR(10) DEFAULT 'ru',          -- язык сообщения (ru, en, etc.)
  source VARCHAR(50) DEFAULT 'api',           -- источник (api, telegram, notion, etc.)
  tags JSONB,                                 -- опциональные теги {["urgent", "work"]}
  custom_metadata JSONB,                      -- опциональные данные от клиента
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Status
  is_archived BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false
);

-- Индексы
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_classification ON messages(classification);
CREATE INDEX idx_messages_user_created ON messages(user_id, created_at DESC);

-- JSON индекс для быстрого поиска по тегам
CREATE INDEX idx_messages_tags ON messages USING GIN (tags);
```

**Примечания**:
- `content_length`: Автоматически вычисляется (для аналитики)
- `classification_confidence`: Score от AI (0.0 - 1.0)
- `tags`: JSON массив для опциональной категоризации вручную
- `is_archived`, `is_starred`: Для будущей UI (v0.2)

---

### Таблица: `classifications_audit`

История всех классификаций для мониторинга и отладки.

```sql
CREATE TABLE classifications_audit (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  
  -- Classification Data
  predicted_classification VARCHAR(50) NOT NULL,
  predicted_confidence FLOAT NOT NULL,
  
  -- Ground Truth (для v0.2+ feedback loop)
  actual_classification VARCHAR(50),          -- user-provided feedback
  is_correct BOOLEAN,                         -- NULL если нет feedback
  
  -- AI Details
  model_used VARCHAR(50) DEFAULT 'gpt-4-mini',
  tokens_used INT,
  prompt_tokens INT,
  completion_tokens INT,
  
  -- Metadata
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processing_time_ms INT                      -- сколько ms заняла классификация
);

-- Индексы
CREATE INDEX idx_classifications_audit_user_id ON classifications_audit(user_id);
CREATE INDEX idx_classifications_audit_message_id ON classifications_audit(message_id);
CREATE INDEX idx_classifications_audit_timestamp ON classifications_audit(timestamp DESC);
CREATE INDEX idx_classifications_audit_is_correct ON classifications_audit(is_correct);
```

**Примечания**:
- Нужна для мониторинга качества классификации
- `is_correct`: NULL если пользователь еще не дал feedback
- Используется для анализа ошибок и улучшения prompt'а

---

## Data Types Reference

| SQL Type | Использование | Примеры |
|----------|--------------|---------|
| UUID | Primary keys, foreign keys | id, user_id, message_id |
| VARCHAR(n) | Строки фиксированной длины | classification, source |
| TEXT | Большие тексты | content, ai_response |
| INT | Целые числа | tokens_used, content_length |
| FLOAT | Десятичные | classification_confidence |
| BOOLEAN | true/false | is_active, is_archived |
| TIMESTAMP | Даты/время | created_at, timestamp |
| JSONB | JSON данные | tags, custom_metadata |

---

## Возможные значения Enum'ов

### Classification Types
```
'task'           - задача
'daily_log'      - дневной лог
'solution'       - решение
'idea'           - идея
'blocker'        - блокер
'plan_request'   - запрос на план
```

### Source Types (для будущего)
```
'api'           - HTTP API (v0.1)
'telegram'      - Telegram Bot (v0.2)
'notion'        - Notion (v0.3)
'web'           - Web form (v0.2)
```

### Languages
```
'ru'            - Русский
'en'            - Английский
```

---

## Relations & Constraints

```
users
  ├─ 1 → ∞ messages (user_id FK)
  ├─ 1 → ∞ classifications_audit (user_id FK)
  
messages
  ├─ ∞ → 1 users (user_id FK)
  ├─ 1 → ∞ classifications_audit (message_id FK)

classifications_audit
  ├─ ∞ → 1 users (user_id FK)
  ├─ ∞ → 1 messages (message_id FK)
```

---

## Sample Data

### User (v0.1)
```sql
INSERT INTO users (username, api_key_hash) 
VALUES ('user', 'hashed_api_key_here');
```

### Message Example 1 (Task)
```sql
INSERT INTO messages 
(user_id, content, classification, classification_confidence, ai_response, language)
VALUES (
  (SELECT id FROM users WHERE username = 'user'),
  'Купить молоко и хлеб',
  'task',
  0.95,
  'Добавлено в список 📝. Когда ты это планируешь сделать?',
  'ru'
);
```

### Message Example 2 (Daily Log)
```sql
INSERT INTO messages 
(user_id, content, classification, classification_confidence, ai_response, language, tags)
VALUES (
  (SELECT id FROM users WHERE username = 'user'),
  'Сегодня выспался хорошо, энергия на высоте',
  'daily_log',
  0.88,
  'Отлично! Как это повлияет на твой день?',
  'ru',
  '["health", "morning"]'::jsonb
);
```

---

## API Requests & Responses (JSON)

### Request: POST /api/v1/messages
```json
{
  "content": "Купить молоко",
  "language": "ru",                    // optional
  "source": "api",                     // optional
  "tags": ["shopping"],                // optional
  "custom_metadata": {                 // optional
    "mood": "productive",
    "location": "home"
  }
}
```

### Response Success: 200 OK
```json
{
  "success": true,
  "message": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "content": "Купить молоко",
    "classification": "task",
    "classification_confidence": 0.95,
    "ai_response": "Добавлено в список 📝",
    "created_at": "2026-05-26T10:00:00Z"
  }
}
```

### Response Error: 400/401/429
```json
{
  "success": false,
  "error": "Invalid API key",
  "code": "UNAUTHORIZED"
}
```

---

## Миграции & Deployment (v0.1)

### Создание базы данных:
1. Создать Supabase проект
2. Запустить SQL скрипты выше в Supabase SQL Editor
3. Проверить что таблицы создались

```bash
# SQL скрипт: create_tables.sql
-- Вставить весь SQL из Schema выше
```

### Инициализация пользователя:
```bash
# insert_user.sql
INSERT INTO users (username, api_key_hash) 
VALUES ('user', '$2b$10$...');  -- bcrypt хеш

-- Сохранить user_id для будущих операций
```

---

## Backup & Recovery (v0.1)

- Supabase автоматически делает daily backups
- Можно вручную экспортировать в v0.2 если нужно
- В критическом случае: восстановить из Supabase console

---

## Performance Considerations (v0.1)

| Операция | Estimate |
|----------|----------|
| INSERT message | <10ms |
| SELECT latest messages | <50ms |
| SELECT by classification | <100ms |
| COUNT messages | <50ms |

**Индексы** покрывают основные queries, поэтому performance хорош.

---

## Будущие расширения (v0.2+)

### Таблица: `threads` (для конверсаций)
```sql
-- Связать сообщения в цепочки для долгосрочных обсуждений
id, user_id, parent_message_id, created_at
```

### Таблица: `embeddings` (для памяти в v0.3)
```sql
-- Vector embeddings для semantic search
message_id, embedding (vector), created_at
```

### Таблица: `weekly_reviews` (для v0.4)
```sql
-- Еженедельные резюме и инсайты
user_id, week_start, summary, insights, created_at
```

---

## Безопасность данных

### Что защищено:
- ✅ API key: хешируется перед сохранением
- ✅ User data: приватное, никогда не используется для обучения
- ✅ SQL: parameterized queries через Supabase SDK
- ✅ Transmission: HTTPS только

### Что нужно делать:
- ✅ .env.local с SUPABASE_KEY никогда не коммитится
- ✅ Регулярно ротировать API keys
- ✅ Логировать access для аудита

