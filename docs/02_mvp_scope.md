# KokontsevOS — MVP v0.1 Scope

## Определение: что входит, что не входит

### ✅ ВХОДИТ В MVP v0.1

#### 1. API для приема сообщений
- **Endpoint**: `POST /api/v1/messages`
- **Функционал**:
  - Принять текстовое сообщение от пользователя
  - Авторизация через API key
  - Валидация входных данных (длина, формат)
  - Вернуть ошибку при невалидных данных

#### 2. Классификация сообщения
- **Входные типы**: 6 категорий
  1. `task` — задача, что-то для выполнения
  2. `daily_log` — событие, факт, наблюдение
  3. `solution` — ответ, решение, подход
  4. `idea` — творческая идея, гипотеза
  5. `blocker` — проблема, препятствие, риск
  6. `plan_request` — просьба структурировать или спланировать
- **Инструмент**: OpenAI API (gpt-4-mini с few-shot prompting)
- **Точность**: >90% на примерах (тестировать вручную)

#### 3. Генерация ответа
- **Логика**: AI генерирует краткий релевантный ответ на основе типа сообщения
- **Примеры**:
  - Для `task`: "Добавлено в список дел. Какой приоритет?"
  - Для `idea`: "Интересно! Может ли это быть связано с ...?"
  - Для `blocker`: "Понял. Как можно это преодолеть?"
- **Формат**: 1-2 предложения

#### 4. Сохранение в БД
- **Таблица `messages`**:
  - `id` (UUID)
  - `user_id` (пока = "oleg")
  - `content` (текст сообщения)
  - `classification` (тип)
  - `ai_response` (ответ системы)
  - `created_at` (timestamp)
  - `metadata` (JSON: источник, язык и т.д.)
- **Таблица `users`** (минимальная):
  - `id`
  - `username` ("oleg")
  - `api_key` (хешированный)
  - `created_at`

#### 5. HTTP Response
- **Format**: JSON
  ```json
  {
    "success": true,
    "message_id": "uuid-xxx",
    "classification": "task",
    "ai_response": "...",
    "timestamp": "2026-05-26T10:00:00Z"
  }
  ```
- **Error responses**:
  ```json
  {
    "success": false,
    "error": "Invalid API key",
    "code": "UNAUTHORIZED"
  }
  ```

#### 6. Базовая безопасность
- API key валидация (в заголовке `Authorization: Bearer <key>`)
- Rate limiting (базовое: 100 запросов/час)
- HTTPS enforcement
- Input sanitization (защита от XSS, SQL injection)

#### 7. Environment setup
- `.env.local` файл с переменными:
  - `SUPABASE_URL`
  - `SUPABASE_KEY`
  - `OPENAI_API_KEY`
  - `API_KEY` (сам ключ для пользователя)

---

## ❌ НЕ ВХОДИТ В v0.1

### Интеграции (будут позже)
- ❌ Telegram bot (v0.2)
- ❌ Notion синхронизация (v0.3)
- ❌ Другие каналы ввода (Discord, Slack и т.д.)

### UI/UX
- ❌ Web dashboard (v0.2)
- ❌ Mobile app
- ❌ WebSocket/real-time UI
- ❌ Таблица со всеми сообщениями
- ❌ Фильтры и поиск в UI (API данные есть, но UI нет)

### Продвинутые функции
- ❌ Голосовая обработка (v0.2)
- ❌ Память/контекст из прошлых сообщений (v0.3)
- ❌ Рекомендации на основе истории
- ❌ Weekly/monthly review (v0.4)
- ❌ Экспорт в PDF/Excel

### Улучшения UX
- ❌ Темы оформления
- ❌ Локализация (только русский/английский где нужен)
- ❌ Уведомления пользователю
- ❌ История действий пользователя

### Performance/Scale
- ❌ Кэширование (Redis)
- ❌ Database indexing оптимизация
- ❌ Load testing
- ❌ Микросервисная архитектура

### DevOps
- ❌ CI/CD pipeline (базовое, если время)
- ❌ Monitoring и alerting
- ❌ Логирование (базовое console.log в порядке)
- ❌ Docker контейнеризация

---

## Acceptance Criteria для v0.1 "Done"

1. ✅ API endpoint отвечает на POST /api/v1/messages
2. ✅ Сообщение корректно классифицируется в один из 6 типов
3. ✅ Классификация сохраняется в Postgres
4. ✅ AI генерирует релевантный ответ
5. ✅ Ответ возвращается клиенту в JSON формате
6. ✅ API key авторизация работает
7. ✅ Rate limiting работает
8. ✅ Ошибки обрабатываются корректно (не 500)
9. ✅ Минимум 5-10 тестовых примеров классифицированы успешно
10. ✅ Проект задеплоен на Vercel + Supabase

---

## Примеры использования (User Stories)

### Story 1: Быстро записать задачу
```
User: "Купить молоко и хлеб"
System Classification: task
AI Response: "Добавлено в список дел. 🎯"
Saved in DB: ✓
```

### Story 2: Записать наблюдение
```
User: "Сегодня выспался хорошо, энергия на высоте"
System Classification: daily_log
AI Response: "Хорошее наблюдение! Что помогло спать лучше?"
Saved in DB: ✓
```

### Story 3: Записать идею
```
User: "Можно создать систему, которая помогает людям запомнить свои идеи"
System Classification: idea
AI Response: "Похоже на то, что ты сейчас строишь 😊"
Saved in DB: ✓
```

### Story 4: Записать блокер
```
User: "Не знаю как интегрировать OpenAI с Nextjs"
System Classification: blocker
AI Response: "Это типичная интеграция. Могу помочь с примером?"
Saved in DB: ✓
```

---

## Метрики успеха v0.1

| Метрика | Целевое значение |
|---------|------------------|
| Классификация accuracy | >90% |
| API response time | <1s |
| Database query latency | <100ms |
| Uptime | >99% за неделю тестирования |
| Error rate | <1% |

---

## Timeline и milestones

| Этап | Задачи | Дней |
|------|--------|------|
| **Setup** | DB schema, Next.js project, env vars | 1 |
| **Core API** | Input handler, AI integration, DB save | 3-4 |
| **Testing** | Manual tests, edge cases | 1 |
| **Deployment** | Vercel + Supabase, final tests | 1 |
| **Buffer** | Неожиданные проблемы | 1 |
| **Total** | | 7-10 дней |

---

## Risk & Mitigation

| Риск | Вероятность | Влияние | Mitigation |
|------|------------|--------|-----------|
| OpenAI API downtime | Средняя | Высокое | Graceful fallback, error message |
| Database performance | Низкая | Среднее | Indexing, query optimization |
| API key leak | Низкая | Критическое | .env.local, never commit secrets |
| Classification errors | Средняя | Низкое | Manual testing, few-shot prompts |

