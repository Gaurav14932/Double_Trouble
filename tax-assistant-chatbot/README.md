# Property Tax Assistant

This is a Next.js property-tax assistant for municipal workflows. It supports natural-language property-tax queries, multilingual replies, structured analytics, and a configurable LLM backend.

## Features

- Natural-language property-tax queries
- English, Hindi, and Marathi support
- Built-in analytics for defaulters, payment status, ward reports, and dashboards
- SQLite-backed local database with demo-data fallback
- Configurable LLM backend: Gemini, Ollama, or any OpenAI-compatible endpoint
- Telegram bot webhook support

## Tech Stack

- Next.js 16
- React 19
- Tailwind CSS
- SQLite via `sql.js`
- Configurable LLM provider layer in `lib/llm.ts`

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.local.example`

3. Start the app:

```bash
npm run dev
```

4. Open `http://localhost:3000`

## LLM Configuration

### Gemini

```env
LLM_PROVIDER=gemini
GOOGLE_GENERATIVE_AI_API_KEY=your_key
GOOGLE_GENERATIVE_AI_MODEL=gemini-2.5-flash
```

### Ollama

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1:8b
```

### OpenAI-Compatible

```env
LLM_PROVIDER=openai-compatible
OPENAI_COMPATIBLE_BASE_URL=http://127.0.0.1:8000/v1
OPENAI_COMPATIBLE_MODEL=local-tax-sql
OPENAI_COMPATIBLE_API_KEY=
```

## Telegram Bot Setup

The repo now includes a Telegram webhook endpoint at `/api/telegram/webhook`.

Add these values to `.env.local`:

```env
APP_BASE_URL=https://your-public-domain.com
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_SECRET=your_random_secret
```

Important:

- `APP_BASE_URL` must be a public HTTPS URL.
- Telegram cannot reach `localhost` directly.
- If you are testing locally, expose the app with a tunnel and use that public HTTPS URL.

Start the app, then register the webhook:

```bash
npm run telegram:webhook:set
```

That command points Telegram to:

```text
https://your-public-domain.com/api/telegram/webhook
```

### Telegram Commands

- `/start` shows the welcome message
- `/help` shows usage help
- `/en <query>` forces English replies
- `/hi <query>` forces Hindi replies
- `/mr <query>` forces Marathi replies

Example:

```text
/en Show top 10 defaulters in Ward 5
```

## API Routes

- `POST /api/chat` for the web chat client
- `GET /api/health` for health checks
- `GET /api/schema` for schema inspection
- `GET /api/telegram/webhook` for Telegram webhook status
- `POST /api/telegram/webhook` for Telegram updates

## Useful Scripts

```bash
npm run dev
npm run build
npm run llm:local:start
npm run telegram:webhook:set
```
