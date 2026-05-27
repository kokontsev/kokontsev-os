# Nate Context Endpoint

`GET /api/nate/context` reads Nate memory markdown files from `data/nate` and returns a combined context payload.

No LLM, Telegram, dashboard, Hermes, Supabase schema, or capture pipeline changes are involved.

## Check Locally

Start the app:

```bash
npm run dev
```

Open the simple test page:

```text
http://localhost:3000/nate-context
```

## Example URLs

```text
http://localhost:3000/api/nate/context
http://localhost:3000/api/nate/context?scope=default
http://localhost:3000/api/nate/context?scope=all
http://localhost:3000/api/nate/context?scope=planning
http://localhost:3000/api/nate/context?scope=planning&projects=education,sport
http://localhost:3000/api/nate/context?scope=project&projects=work,trading
```

`scope=project` requires the `projects` query param. Project names are whitelisted:

```text
work, finance, trading, sport, english, personality, relationships, education
```

`raw/onboarding_v1.md` is intentionally excluded from current scopes.
