# Double_Trouble - TaxBot

Double_Trouble is an AI-powered property tax assistant for municipal teams. It lets staff ask natural-language questions about property tax data, view dashboards and charts, export results, and work in English, Hindi, and Marathi.

---

## Features

- Natural-language property tax queries
- Built-in analytics for defaulters, payment status, integrated tax summary, recovery priority, stale accounts, collection efficiency, and officer performance
- Full dashboard reports with charts, tables, and ward heatmaps
- Employee login with demo accounts and local account creation
- Voice input in the browser
- PDF and Excel export
- Telegram webhook support
- Configurable LLM backend: Gemini, Ollama, or OpenAI-compatible APIs
- SQLite-backed local dataset with graceful demo fallback
- Safe SQL generation and read-only query validation

---

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- SQLite via `sql.js`
- Recharts and Leaflet
- Gemini / Ollama / OpenAI-compatible model support

---

## Project Structure

```
tax-assistant-chatbot/              # Main Next.js app
tax-assistant-chatbot/app/api/      # API routes
tax-assistant-chatbot/lib/          # Chat, analytics, database, Telegram, and LLM logic
tax-assistant-chatbot/components/   # UI components
tax-assistant-chatbot/data/property-tax.sqlite  # Local SQLite database
```

---

## Quick Start

```bash
npm install
cd tax-assistant-chatbot
npm install
cd ..
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> Built-in analytics work even without an LLM key. Add an LLM provider only if you want free-form natural-language to SQL generation.

---

## Environment Variables

Create `tax-assistant-chatbot/.env.local` and add the variables for your chosen provider.

**Gemini**
```env
LLM_PROVIDER=gemini
GOOGLE_GENERATIVE_AI_API_KEY=your_key
GOOGLE_GENERATIVE_AI_MODEL=gemini-2.5-flash
```

**Ollama**
```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1:8b
```

**OpenAI-compatible**
```env
LLM_PROVIDER=openai-compatible
OPENAI_COMPATIBLE_BASE_URL=http://127.0.0.1:8000/v1
OPENAI_COMPATIBLE_MODEL=your_model
OPENAI_COMPATIBLE_API_KEY=your_key
```

**Telegram (optional)**
```env
APP_BASE_URL=https://your-domain.com
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_SECRET=your_secret
```

---

## Demo Login

| Role    | Employee ID | Password    |
|---------|-------------|-------------|
| Admin   | ADMIN01     | admin123    |
| Officer | OFC101      | taxbot123   |
| Analyst | ANL201      | analyst123  |

---

## Example Queries

- Show top 10 defaulters in Ward 5
- Check payment status of property ID 1
- Generate ward-wise collection report
- Show integrated tax summary for Ward 2
- Predict high-risk defaulters in Zone B
- Show stale accounts with no payment in the last year

---

## API Endpoints

| Method | Endpoint                   | Description          |
|--------|----------------------------|----------------------|
| POST   | `/api/chat`                | Chat query           |
| GET    | `/api/health`              | Health check         |
| GET    | `/api/schema`              | DB schema            |
| GET    | `/summary`                 | Analytics summary    |
| GET    | `/api/telegram/webhook`    | Telegram webhook     |
| POST   | `/api/telegram/webhook`    | Telegram webhook     |

---

## Useful Scripts

From the repo root:

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
```

From `tax-assistant-chatbot/`:

```bash
npm run llm:local:start
npm run telegram:webhook:set
```4932/Double_Trouble)
