# Nate Day Planner Endpoint

`POST /api/nate/plan/day` generates a draft day plan from Nate memory, recent operational Supabase data, and the user request.

Current constraints:

- Does not save plans to the database.
- Does not update tasks automatically.
- Does not add Telegram, dashboard, Hermes, Notion, or vector memory.

## Request

```json
{
  "date": "2026-05-27",
  "user_message": "Сегодня нужно сфокусироваться на учебе.",
  "day_type": "workday",
  "energy": "normal",
  "projects": ["education", "work", "sport"]
}
```

`date`, `user_message`, and `projects` are optional. If `date` is omitted, the server uses today's date.

## Check Locally

```text
http://localhost:3000/nate-plan
```

Or call the endpoint directly:

```bash
curl -X POST http://localhost:3000/api/nate/plan/day \
  -H "Content-Type: application/json" \
  -d "{\"day_type\":\"workday\",\"energy\":\"normal\",\"projects\":[\"education\",\"work\",\"sport\"]}"
```
