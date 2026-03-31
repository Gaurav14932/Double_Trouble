# TaxBot

TaxBot is a multilingual property tax assistant built with Next.js. It lets municipal teams ask natural-language questions about property tax records, view dashboards and charts, export results, and optionally reply through Telegram.

## Highlights

- Natural-language property tax queries
- English, Hindi, and Marathi responses
- Built-in structured analytics for defaulters, payment status, ward and zone reports, and dashboards
- SQLite-backed local data layer with demo-data fallback
- Configurable LLM provider: Gemini, Ollama, or OpenAI-compatible APIs
- Voice input in the web UI
- PDF and Excel export
- Telegram webhook support

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- SQLite via `sql.js`
- Gemini / Ollama / OpenAI-compatible LLM integration

## Repository Structure

The actual Next.js app lives in:

```text
TaxBot-main/tax-assistant-chatbot
```

This repository root includes a small wrapper `package.json` so commands like `npm run dev` work from the top-level folder as well.

## Quick Start

From the repository root:

```bash
npm run install:app
npm run dev
```

Then open:

```text
http://localhost:3000
```

You can also run the app directly from the nested app folder:

```bash
cd TaxBot-main/tax-assistant-chatbot
npm install
npm run dev
```

## Environment Variables

Create `.env.local` inside `TaxBot-main/tax-assistant-chatbot`.

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

### Telegram

```env
APP_BASE_URL=https://your-public-domain.com
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_SECRET=your_random_secret
```

## Main Flow

1. The user submits a question in the web chat or through Telegram.
2. The app sends the request to `POST /api/chat`.
3. The backend normalizes language and tries built-in structured analytics first.
4. If no built-in intent matches, the configured LLM converts the prompt into a safe `SELECT` query.
5. The query is validated and executed against SQLite.
6. The frontend renders the result as a table, chart, or dashboard.

## Useful Scripts

From the repository root:

```bash
npm run install:app
npm run dev
npm run build
npm run lint
npm run start
```

From the app folder (`TaxBot-main/tax-assistant-chatbot`):

```bash
npm run dev
npm run build
npm run lint
npm run llm:local:start
npm run telegram:webhook:set
```

## API Endpoints

- `POST /api/chat`
- `GET /api/health`
- `GET /api/schema`
- `GET /summary`
- `GET /api/telegram/webhook`
- `POST /api/telegram/webhook`

## Telegram Commands

- `/start`
- `/help`
- `/charts`
- `/en <query>`
- `/hi <query>`
- `/mr <query>`

Example:

```text
/en Show top 10 defaulters in Ward 5
```


## Project Docs

Additional documentation is inside `TaxBot-main/tax-assistant-chatbot`:

- `README.md`
- `START_HERE.md`
- `SETUP_GUIDE.md`
- `DEPLOYMENT.md`
- `PROJECT_SUMMARY.md`
- `INDEX.md`



