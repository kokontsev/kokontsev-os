# Memory Layers

## Назначение

Память Нейта должна быть слоистой. Не вся информация одинаково важна: сырые записи нужны для истории, операционная память нужна для планирования, curated memory нужна для устойчивых фактов, synthesized memory нужна для стратегии.

На текущем этапе memory/vector search не реализуется. Этот документ фиксирует будущую архитектуру.

## Raw Memory

Raw memory — все входящие capture-записи без сильной интерпретации.

Источник:

- `captures.raw_text`;
- `captures.classification`;
- `captures.source`;
- `captures.created_at`.

Назначение:

- хранить оригинальный контекст;
- позволять пересобрать интерпретацию позже;
- служить audit trail для классификации и routing.

## Operational Memory

Operational memory — то, что нужно для ближайших действий.

Где хранится:

- `tasks`;
- `daily_logs`;
- `decisions`;
- будущие текущие планы дня/недели.

Содержит:

- открытые задачи;
- текущие блокеры;
- активные решения;
- свежие дневниковые сигналы;
- текущий режим и фокус.

Используется в daily/weekly planning.

## Curated Memory

Curated memory — проверенные и устойчивые факты о пользователе.

Примеры:

- важные жизненные области;
- долгосрочные цели;
- ограничения;
- предпочтения;
- правила планирования;
- принципы принятия решений.

Где хранить позже:

- dedicated tables для profile/goals/preferences/planning_rules;
- вручную подтвержденные записи;
- не в raw captures без проверки.

## Synthesized Memory

Synthesized memory — выводы, которые Нейт делает из истории.

Примеры:

- "спорт повышает устойчивость недели";
- "английский лучше держится короткими ежедневными слотами";
- "после перегруженных дней план на следующий день нужно снижать";
- "ВКР требует регулярного минимального прогресса, иначе вытесняется".

Эти выводы должны иметь:

- источник;
- confidence;
- дату последнего пересмотра;
- возможность отмены или правки.

## Semantic / Vector Memory

Semantic memory нужна для поиска похожих ситуаций, старых решений, идей и паттернов.

Возможные источники:

- captures;
- decisions;
- daily_logs;
- weekly reviews;
- project notes.

Потенциальное хранилище:

- Supabase vector extension;
- отдельная vector table;
- embeddings через выбранный provider.

На текущем этапе не реализуется.

## Где что хранится

| Layer | Current storage | Future storage |
| --- | --- | --- |
| Raw memory | `captures` | `captures` + audit metadata |
| Operational memory | `tasks`, `daily_logs`, `decisions` | планы дня/недели, current mode |
| Curated memory | частично `profile`, `goals`, `planning_rules` | отдельные curated tables |
| Synthesized memory | docs/manual notes | synthesized insights table |
| Semantic memory | not implemented | vector store |

## Принцип обновления памяти

Нейт не должен автоматически превращать любую запись в "истину о пользователе". Raw memory может быть сохранена сразу. Curated и synthesized memory требуют либо подтверждения, либо достаточного количества повторяющихся сигналов.
