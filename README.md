# KokontsevOS v0.1

Personal AI second brain advisor system. A system that receives text and voice messages, understands their meaning, classifies them, saves to database, and returns a helpful response.

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git
- Supabase account
- OpenAI API key

### Local Setup

1. **Clone or navigate to the project**
   ```bash
   cd c:\Projects\Kokontsev-OS
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env.local
   ```

4. **Fill in your environment variables in `.env.local`**
   ```
   OPENAI_API_KEY=your_key_here
   SUPABASE_URL=your_url_here
   SUPABASE_ANON_KEY=your_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_key_here
   APP_SECRET=your_secret
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```
   Server will be available at `http://localhost:3000`

6. **Build for production**
   ```bash
   npm run build
   npm start
   ```

### Project Structure

```
kokontsev-os/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (v1 endpoints)
│   └── test-capture/      # Test UI for manual capture
├── lib/
│   ├── ai/                # OpenAI integration & orchestration
│   ├── db/                # Supabase & database operations
│   ├── router/            # Message routing logic
│   └── types/             # TypeScript type definitions
├── supabase/
│   └── migrations/        # Database migration SQL scripts
├── docs/                  # Project documentation
├── .env.example           # Example environment variables
├── tsconfig.json          # TypeScript configuration
├── next.config.js         # Next.js configuration
└── package.json           # Dependencies
```

## Development Workflow

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### API Endpoints (v0.1)

- `POST /api/v1/messages` - Create and classify a message
  - Input: `{ content: string, language?: string, tags?: string[] }`
  - Output: `{ success: boolean, message: MessageData | error: string }`

### Environment Variables

See `.env.example` for all available variables:

| Variable | Required | Description |
|----------|----------|-------------|
| OPENAI_API_KEY | ✓ | OpenAI API key for classification |
| SUPABASE_URL | ✓ | Supabase project URL |
| SUPABASE_ANON_KEY | ✓ | Supabase anonymous key |
| SUPABASE_SERVICE_ROLE_KEY | ✓ | Supabase service role key |
| APP_SECRET | ✓ | Application secret for encryption |
| TELEGRAM_BOT_TOKEN | ✗ | Telegram bot token (v0.2+) |
| NOTION_API_KEY | ✗ | Notion API key (v0.3+) |

## Database Setup

1. Create a Supabase project
2. Run migrations from `supabase/migrations/` in Supabase SQL Editor
3. Tables will be created: `users`, `messages`, `classifications_audit`

See `docs/04_data_model.md` for complete schema.

## Documentation

- `docs/00_project_brief.md` - Project goals & vision
- `docs/01_architecture.md` - System architecture & components
- `docs/02_mvp_scope.md` - v0.1 MVP scope & boundaries
- `docs/03_agent_rules.md` - AI classification rules & safety
- `docs/04_data_model.md` - Database schema & data structure

## Features (v0.1)

✅ API for message classification
✅ OpenAI-powered classification (6 types)
✅ Postgres database integration
✅ Basic security & API key auth
✅ Rate limiting

Coming in future versions:
- v0.2: Telegram bot + Dashboard
- v0.3: Memory & Notion sync
- v0.4: Weekly review & advanced analytics

## Roadmap

| Version | Timeline | Focus |
|---------|----------|-------|
| v0.1 | Current | API + Classification + Database |
| v0.2 | Month 2 | Telegram + Dashboard UI |
| v0.3 | Month 3 | Memory + Notion sync |
| v0.4 | Month 4 | Weekly review + Analytics |

## Troubleshooting

### "Cannot find module" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### Port 3000 already in use
```bash
npm run dev -- -p 3001
```

### Environment variables not loading
- Ensure `.env.local` exists in project root
- Restart dev server after updating `.env.local`

## Contributing

Internal development project. All changes documented in docs/.

## License

Private project.

## Support

Refer to project documentation in `docs/` folder.
