# KokontsevOS — Architecture

## Общая архитектура системы (v0.1 + будущее)

```
┌─────────────────────────────────────────────────────────────────┐
│                          User Interfaces                         │
├─────────────────────────────────────────────────────────────────┤
│  Telegram Bot   │  Web Dashboard   │  Notion Page   │  API      │
│   (v0.2)       │    (v0.2)        │    (v0.3)      │  (v0.1)   │
└────────┬────────┴────────┬─────────┴────────┬────────┴────┬─────┘
         │                 │                  │             │
         └─────────────────┼──────────────────┼─────────────┘
                           │ HTTP/WebSocket   │
         ┌─────────────────▼──────────────────▼─────────────┐
         │        Next.js Backend (API Routes)              │
         │  - Message Receiver                              │
         │  - Input Validator                               │
         │  - AI Orchestrator                               │
         │  - Response Generator                            │
         └────────────┬────────────────┬────────────────────┘
                      │                │
         ┌────────────▼──┐  ┌──────────▼──────────┐
         │   Supabase    │  │   OpenAI API        │
         │   /Postgres   │  │  - Classifier      │
         │               │  │  - Planner         │
         │ • Messages    │  │  - Responder       │
         │ • Classifications
         │ • Context     │  └──────────────────────┘
         │ • User data   │
         └───────────────┘
```

## Компоненты v0.1

### 1. **Input Handler** (Next.js API)
**Задача**: Принять и валидировать входящее сообщение
- **Endpoint**: `POST /api/v1/message`
- **Входные данные**: текст, опционально контекст (тип предположительно)
- **Валидация**: 
  - Длина текста (мин/макс)
  - Формат входа
  - API key авторизация
- **Выход**: валидные данные или ошибка

### 2. **AI Orchestrator** (Next.js API)
**Задача**: Управлять взаимодействием с OpenAI API
- **Функции**:
  - Отправить текст в GPT-4 mini для классификации
  - Получить тип сообщения (task, daily_log, solution, idea, blocker, plan_request)
  - Получить краткий ответ/действие от AI
- **Prompting strategy**: Few-shot примеры в system prompt
- **Fallback**: Если OpenAI недоступен — вернуть ошибку (v0.1 не может работать без AI)

### 3. **Database Layer** (Supabase/Postgres)
**Задача**: Сохранение и управление данными
- **Таблицы**:
  - `messages` — основные записи
  - `users` — информация о пользователе (пока один)
  - `classifications` — история классификаций (для аудита)
- **Операции**: INSERT, SELECT по фильтрам

### 4. **Response Generator**
**Задача**: Подготовить ответ для пользователя
- Включить:
  - Классификацию
  - Краткий ответ от AI
  - Метаданные (timestamp, id)
- **Формат**: JSON

## Поток данных (v0.1)

```
User Message
     │
     ▼
┌─────────────────────┐
│ Input Handler       │ ← Валидация, санитизация
│ (API Route)         │
└────────────┬────────┘
             │
             ▼
┌─────────────────────┐
│ AI Orchestrator     │ ← Классификация + генерация ответа
│ (OpenAI API Call)   │
└────────────┬────────┘
             │
             ▼
┌─────────────────────┐
│ Database Layer      │ ← Сохранение в Postgres
│ (Supabase)          │
└────────────┬────────┘
             │
             ▼
┌─────────────────────┐
│ Response Generator  │ ← Форматирование результата
└────────────┬────────┘
             │
             ▼
Response to User
```

## Технологический стек детально

### Backend
- **Framework**: Next.js 14+ с TypeScript
- **API**: REST API routes (`pages/api/...` или App Router)
- **Environment**: Node.js 18+

### Database
- **Основная**: Postgres (через Supabase)
- **Queries**: Supabase SDK или прямой SQL
- **Migrations**: (позже, сейчас ручное или SQL скрипты)

### AI/ML
- **Provider**: OpenAI API
- **Model**: gpt-4-mini (дешевле, достаточно для классификации)
- **Integration**: openai npm package

### Deployment
- **Backend**: Vercel (нативная поддержка Next.js)
- **Database**: Supabase Cloud (Postgres)
- **Environment variables**: `.env.local` + Vercel dashboard

## Будущая архитектура (после v0.1)

### v0.2: Telegram + Dashboard
- **Telegram Bot**: Integration с Telegram API (longpolling или webhook)
- **Dashboard**: Next.js страница с таблицей и фильтрами
- **Real-time**: WebSocket для live updates

### v0.3: Память + Notion
- **Memory Module**: Embedding + vector DB для контекста (Pinecone/Supabase Vectors)
- **Notion Sync**: Notion API для экспорта и двусторонней синхронизации

### v0.4: Advanced
- **Weekly Review**: Scheduled job (cron) для генерации еженедельного резюме
- **Voice Input**: Speech-to-text для голосовых сообщений
- **Analytics**: Графики, метрики, инсайты

## Безопасность (базовая, v0.1)

1. **API Key Authentication**: Все запросы должны включать валидный API key
2. **Rate Limiting**: Защита от спама (например, 100 запросов/час)
3. **Data Privacy**: Все данные пользователя приватны, нет кросс-юзер sharing
4. **HTTPS Only**: Все коммуникации по HTTPS
5. **Input Sanitization**: Защита от SQL injection, XSS (базовая валидация)
6. **Environment Secrets**: OpenAI key и DB credentials в переменных окружения

## Масштабируемость

v0.1 — персональная система, так что масштабируемость не приоритет:
- Single user (Oleg)
- API rate limit на уровне OpenAI
- Database может справиться с >10k записей без проблем

В будущем при мультиюзер:
- Добавить database indexing
- Кэширование (Redis)
- Background jobs для heavy processing
- Микросервисы (если нужно)
