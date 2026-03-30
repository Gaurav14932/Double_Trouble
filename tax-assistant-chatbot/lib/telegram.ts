import { ChatResponseData } from './chat-types';
import type { ChatServicePayload } from './chat-service';
import type { AppLanguage } from './language';

const TELEGRAM_MESSAGE_LIMIT = 4000;
const TELEGRAM_PREVIEW_ROWS = 5;
const TELEGRAM_PREVIEW_FIELDS = 6;

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}

export interface TelegramMessage {
  message_id: number;
  text?: string;
  chat: {
    id: number;
    type: string;
  };
}

export interface TelegramConfig {
  token: string;
  secretToken: string;
  baseUrl: string;
}

type TelegramCommand = 'start' | 'help' | 'charts' | null;

export function getTelegramConfig(): TelegramConfig {
  return {
    token: process.env.TELEGRAM_BOT_TOKEN?.trim() ?? '',
    secretToken: process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ?? '',
    baseUrl: process.env.APP_BASE_URL?.trim() ?? '',
  };
}

export function getTelegramWebhookUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/api/telegram/webhook`;
}

export function isTelegramWebhookAuthorized(
  request: Request,
  secretToken: string
): boolean {
  if (!secretToken) {
    return true;
  }

  return (
    request.headers.get('x-telegram-bot-api-secret-token') === secretToken
  );
}

export async function sendTelegramTextMessage(
  token: string,
  chatId: number | string,
  text: string
): Promise<void> {
  for (const chunk of splitTelegramMessage(text)) {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk,
          disable_web_page_preview: true,
        }),
      }
    );

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        `Telegram sendMessage failed with status ${response.status}: ${responseText}`
      );
    }
  }
}

export async function sendTelegramPhotoMessage(
  token: string,
  chatId: number | string,
  photo: Blob | Buffer | Uint8Array,
  filename: string,
  caption?: string
): Promise<void> {
  const formData = new FormData();
  const photoBlob =
    photo instanceof Blob ? photo : new Blob([photo], { type: 'image/png' });

  formData.append('chat_id', String(chatId));

  if (caption) {
    formData.append('caption', caption);
  }

  formData.append('photo', photoBlob, filename);

  const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Telegram sendPhoto failed with status ${response.status}: ${responseText}`
    );
  }
}

export function parseTelegramInput(text: string): {
  command: TelegramCommand;
  language: AppLanguage | null;
  query: string;
} {
  const trimmed = text.trim();

  if (/^\/start(?:@\w+)?(?:\s|$)/i.test(trimmed)) {
    return {
      command: 'start',
      language: null,
      query: '',
    };
  }

  if (/^\/help(?:@\w+)?(?:\s|$)/i.test(trimmed)) {
    return {
      command: 'help',
      language: null,
      query: '',
    };
  }

  if (/^\/charts(?:@\w+)?(?:\s|$)/i.test(trimmed)) {
    return {
      command: 'charts',
      language: null,
      query: '',
    };
  }

  const languagePatterns: Array<{
    language: AppLanguage;
    pattern: RegExp;
  }> = [
    { language: 'en', pattern: /^\/(?:en|english)(?:@\w+)?(?:\s+(.*))?$/i },
    { language: 'hi', pattern: /^\/(?:hi|hindi)(?:@\w+)?(?:\s+(.*))?$/i },
    { language: 'mr', pattern: /^\/(?:mr|marathi)(?:@\w+)?(?:\s+(.*))?$/i },
  ];

  for (const entry of languagePatterns) {
    const match = trimmed.match(entry.pattern);

    if (match) {
      return {
        command: null,
        language: entry.language,
        query: match[1]?.trim() ?? '',
      };
    }
  }

  return {
    command: null,
    language: null,
    query: trimmed,
  };
}

export function buildTelegramWelcomeMessage(): string {
  return [
    'Property Tax Assistant is connected to Telegram.',
    '',
    'Send a text question like:',
    '1. Show top 10 defaulters in Ward 5',
    '2. Check payment status of property ID 1',
    '3. Generate ward-wise collection report',
    '4. Use /charts to receive chart snapshots in Telegram',
    '',
    'Language tips:',
    '- Use /en, /hi, or /mr before your query',
    '- Example: /hi Ward 5 ka full report dikhao',
    '',
    'Use /help any time to see these instructions again.',
  ].join('\n');
}

export function buildTelegramHelpMessage(): string {
  return [
    'Telegram bot usage:',
    '- Send plain text property-tax questions',
    '- Use /charts to generate the paid-vs-outstanding and top-defaulters charts',
    '- Use /en, /hi, or /mr to force the reply language',
    '- Example: /mr Ward 2 sathi integrated tax summary dakhava',
    '',
    'Useful queries:',
    '1. Show payment status distribution chart',
    '2. Predict high-risk defaulters in Zone B',
    '3. Show integrated tax summary for Ward 2',
  ].join('\n');
}

export function buildTelegramUnsupportedMessage(): string {
  return 'Please send a text message. Voice notes, images, and files are not supported yet.';
}

export function buildTelegramMissingQueryMessage(
  language: AppLanguage | null
): string {
  if (language === 'hi') {
    return 'Kripya language command ke baad apna property-tax question bhejiye. Example: /hi Ward 5 ke top 10 bakayedar dikhaen';
  }

  if (language === 'mr') {
    return 'Kripya language command nantar property-tax prashna pathva. Example: /mr Ward 5 madhil top 10 thakbakidar dakhava';
  }

  return 'Send your property-tax question after the language command. Example: /en Show top 10 defaulters in Ward 5';
}

export function formatTelegramReply(payload: ChatServicePayload): string {
  if ('error' in payload) {
    return `Sorry, I could not process that request. ${payload.error}`;
  }

  const sections = [payload.reply];

  if (payload.data) {
    sections.push(formatTelegramData(payload.data));
  }

  if (payload.mode === 'demo' || payload.data?.source === 'demo') {
    sections.push('Source: bundled demo data');
  }

  return sections.filter(Boolean).join('\n\n');
}

function formatTelegramData(data: ChatResponseData): string {
  const lines: string[] = [
    `Results: ${data.resultCount}`,
  ];

  if (data.dashboard) {
    lines.push('Summary:');
    lines.push(...formatDashboardSummary(data.dashboard.summaryCards));

    if (data.dashboard.insights.length > 0) {
      lines.push('Highlights:');
      lines.push(
        ...data.dashboard.insights
          .slice(0, 3)
          .map((insight, index) => `${index + 1}. ${insight}`)
      );
    }
  }

  if (data.results.length > 0) {
    lines.push('Preview:');
    lines.push(...formatResultRows(data.results));
  } else {
    lines.push('No rows were returned.');
  }

  return lines.join('\n');
}

function formatDashboardSummary(
  cards: Array<{ label: string; value: string }>
): string[] {
  return cards
    .slice(0, 5)
    .map((card) => `- ${card.label}: ${card.value}`);
}

function formatResultRows(
  rows: Record<string, unknown>[]
): string[] {
  const preview = rows.slice(0, TELEGRAM_PREVIEW_ROWS).map((row, index) => {
    const values = Object.entries(row)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .slice(0, TELEGRAM_PREVIEW_FIELDS)
      .map(([key, value]) => `${humanizeKey(key)}: ${formatValue(value)}`);

    return `${index + 1}. ${values.join(' | ')}`;
  });

  if (rows.length > TELEGRAM_PREVIEW_ROWS) {
    preview.push(`...and ${rows.length - TELEGRAM_PREVIEW_ROWS} more row(s).`);
  }

  return preview;
}

function formatValue(value: unknown): string {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
    }).format(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatValue(item)).join(', ');
  }

  if (value && typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function humanizeKey(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function splitTelegramMessage(text: string): string[] {
  const normalized = text.trim();

  if (normalized.length <= TELEGRAM_MESSAGE_LIMIT) {
    return [normalized];
  }

  const chunks: string[] = [];
  let remaining = normalized;

  while (remaining.length > TELEGRAM_MESSAGE_LIMIT) {
    let splitIndex = remaining.lastIndexOf('\n', TELEGRAM_MESSAGE_LIMIT);

    if (splitIndex < TELEGRAM_MESSAGE_LIMIT / 2) {
      splitIndex = remaining.lastIndexOf(' ', TELEGRAM_MESSAGE_LIMIT);
    }

    if (splitIndex < TELEGRAM_MESSAGE_LIMIT / 2) {
      splitIndex = TELEGRAM_MESSAGE_LIMIT;
    }

    chunks.push(remaining.slice(0, splitIndex).trim());
    remaining = remaining.slice(splitIndex).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}
