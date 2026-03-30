import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSchemaInfo } from './db';
import { AppLanguage } from './language';

export type LLMProvider = 'gemini' | 'ollama' | 'openai-compatible';

interface GenerateTextOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

interface LLMRuntimeInfo {
  provider: LLMProvider;
  model: string;
  configured: boolean;
  baseUrl?: string;
}

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
const DEFAULT_OPENAI_COMPATIBLE_BASE_URL = 'http://127.0.0.1:8000/v1';

function getConfiguredProvider(): LLMProvider {
  const rawProvider = process.env.LLM_PROVIDER?.trim().toLowerCase();

  if (rawProvider === 'ollama') {
    return 'ollama';
  }

  if (
    rawProvider === 'openai' ||
    rawProvider === 'openai-compatible' ||
    rawProvider === 'openai_compatible'
  ) {
    return 'openai-compatible';
  }

  return 'gemini';
}

function getGeminiClient() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set'
    );
  }

  return new GoogleGenerativeAI(apiKey);
}

function getGeminiModelName() {
  return process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

function getOllamaBaseUrl() {
  return (
    process.env.OLLAMA_BASE_URL?.trim().replace(/\/$/, '') ||
    DEFAULT_OLLAMA_BASE_URL
  );
}

function getOllamaModelName() {
  const model = process.env.OLLAMA_MODEL?.trim();

  if (!model) {
    throw new Error('OLLAMA_MODEL environment variable is not set');
  }

  return model;
}

function getOpenAICompatibleBaseUrl() {
  return (
    process.env.OPENAI_COMPATIBLE_BASE_URL?.trim().replace(/\/$/, '') ||
    DEFAULT_OPENAI_COMPATIBLE_BASE_URL
  );
}

function getOpenAICompatibleModelName() {
  const model = process.env.OPENAI_COMPATIBLE_MODEL?.trim();

  if (!model) {
    throw new Error('OPENAI_COMPATIBLE_MODEL environment variable is not set');
  }

  return model;
}

function getOpenAICompatibleApiKey() {
  return process.env.OPENAI_COMPATIBLE_API_KEY?.trim();
}

export function getLLMRuntimeInfo(): LLMRuntimeInfo {
  const provider = getConfiguredProvider();

  if (provider === 'ollama') {
    return {
      provider,
      model: process.env.OLLAMA_MODEL?.trim() || 'not-configured',
      configured: Boolean(process.env.OLLAMA_MODEL?.trim()),
      baseUrl: getOllamaBaseUrl(),
    };
  }

  if (provider === 'openai-compatible') {
    return {
      provider,
      model: process.env.OPENAI_COMPATIBLE_MODEL?.trim() || 'not-configured',
      configured: Boolean(process.env.OPENAI_COMPATIBLE_MODEL?.trim()),
      baseUrl: getOpenAICompatibleBaseUrl(),
    };
  }

  return {
    provider,
    model: getGeminiModelName(),
    configured: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()),
  };
}

async function generateText(options: GenerateTextOptions): Promise<string> {
  const provider = getConfiguredProvider();

  if (provider === 'ollama') {
    return generateWithOllama(options);
  }

  if (provider === 'openai-compatible') {
    return generateWithOpenAICompatible(options);
  }

  return generateWithGemini(options);
}

async function generateWithGemini({
  systemPrompt,
  userPrompt,
}: GenerateTextOptions): Promise<string> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: getGeminiModelName() });
  const response = await model.generateContent(
    `${systemPrompt}\n\n${userPrompt}`
  );

  return response.response.text().trim();
}

async function generateWithOllama({
  systemPrompt,
  userPrompt,
  temperature = 0.1,
}: GenerateTextOptions): Promise<string> {
  const response = await fetch(`${getOllamaBaseUrl()}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: getOllamaModelName(),
      stream: false,
      options: {
        temperature,
      },
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Ollama request failed with status ${response.status}: ${errorBody}`
    );
  }

  const data = (await response.json()) as {
    message?: {
      content?: string;
    };
  };

  const content = data.message?.content?.trim();
  if (!content) {
    throw new Error('Ollama did not return any response text');
  }

  return content;
}

async function generateWithOpenAICompatible({
  systemPrompt,
  userPrompt,
  temperature = 0.1,
}: GenerateTextOptions): Promise<string> {
  const apiKey = getOpenAICompatibleApiKey();
  const response = await fetch(
    `${getOpenAICompatibleBaseUrl()}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: getOpenAICompatibleModelName(),
        temperature,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `OpenAI-compatible request failed with status ${response.status}: ${errorBody}`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('OpenAI-compatible provider did not return any response text');
  }

  return content;
}

function extractFirstJsonObject(text: string): string | null {
  let inString = false;
  let depth = 0;
  let startIndex = -1;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const previousChar = text[index - 1];

    if (char === '"' && previousChar !== '\\') {
      inString = !inString;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      if (depth === 0) {
        startIndex = index;
      }
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0 && startIndex !== -1) {
        return text.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

function extractSQL(text: string): string | null {
  const sqlMatch = text.match(/\b(SELECT|WITH)\b[\s\S]*?(;|$)/i);
  return sqlMatch ? sqlMatch[0].trim() : null;
}

function getOutputLanguageLabel(language: AppLanguage): string {
  if (language === 'hi') {
    return 'Hindi';
  }

  if (language === 'mr') {
    return 'Marathi';
  }

  return 'English';
}

async function buildSqlGenerationPrompts(
  userQuery: string,
  language: AppLanguage
): Promise<GenerateTextOptions> {
  const schemaInfo = await getSchemaInfo();
  const providerInfo = getLLMRuntimeInfo();

  return {
    temperature: 0.1,
    systemPrompt: `You are an expert SQL query generator for a property tax management system.
Your job is to convert natural language questions into SQLite SELECT statements.

You are running through the configured provider "${providerInfo.provider}" and must still obey the same SQL rules.

${schemaInfo}

Important rules:
1. You MUST only generate SELECT queries. Never generate INSERT, UPDATE, DELETE, DROP, ALTER, or CREATE statements.
2. Always use the exact table and column names from the schema above.
3. Use SQLite syntax only.
4. Only use schema objects that actually exist in the schema above. Do not invent tables, views, joins, or IDs.
5. The main table is properties. The only additional schema object available is ward_collection_summary.
6. payment_status is a column on properties. It is not a separate table.
7. The ward column stores labels like 'Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5'. Never filter ward using only the number.
8. The zone column stores labels like 'Zone A', 'Zone B', 'Zone C'. Never filter zone using only 'A', 'B', or 'C'.
9. The payment_status column uses only these exact values: 'PAID', 'UNPAID', 'PARTIAL'.
10. For simple property lookups, query directly from properties without joins.
11. For defaulters, query properties where payment_status = 'UNPAID' and due_amount > 0.
12. For payment status, filter by payment_status.
13. For ward-wise reports, group by ward.
14. For zone-wise reports, group by zone.
15. Always include ORDER BY when it improves result readability.
16. Use LIMIT 100 for broad result sets to avoid large responses.
17. Return intent and explanation in ${getOutputLanguageLabel(language)}.
18. Respond with valid JSON only. Do not add markdown fences or extra commentary.

Normalization examples:
- If the user asks for "Ward 5", use ward = 'Ward 5'
- If the user asks for "Zone A", use zone = 'Zone A'
- If the user asks for "paid properties", use payment_status = 'PAID'
- If the user asks for "top defaulters", sort unpaid properties by due_amount DESC
- If the user asks for "Show 5 paid properties in Zone A ordered by owner name", query only the properties table and use: WHERE payment_status = 'PAID' AND zone = 'Zone A' ORDER BY owner_name ASC LIMIT 5

Response format:
{
  "intent": "brief description of what the query does",
  "sql": "the SQLite query",
  "explanation": "simple explanation of the query"
}`,
    userPrompt: `User query: "${userQuery}"

Generate the JSON response now.`,
  };
}

function cleanModelResponse(text: string) {
  return text.replace(/```json/gi, '').replace(/```/g, '').trim();
}

export async function convertToSQL(
  userQuery: string,
  language: AppLanguage = 'en'
): Promise<{
  sql: string;
  intent: string;
  explanation: string;
}> {
  try {
    const prompts = await buildSqlGenerationPrompts(userQuery, language);
    const responseText = await generateText(prompts);
    const cleanedResponseText = cleanModelResponse(responseText);

    let parsed: Record<string, unknown> = {};
    const jsonMatch = extractFirstJsonObject(cleanedResponseText);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch) as Record<string, unknown>;
      } catch {
        console.warn(
          '[LLM] Failed to parse JSON response, falling back to SQL extraction'
        );
      }
    }

    const sql =
      typeof parsed.sql === 'string'
        ? parsed.sql.trim()
        : extractSQL(cleanedResponseText);

    if (!sql) {
      throw new Error('LLM did not return a valid SQL query');
    }

    return {
      sql,
      intent:
        typeof parsed.intent === 'string' && parsed.intent.trim().length > 0
          ? parsed.intent
          : 'Query execution',
      explanation:
        typeof parsed.explanation === 'string' ? parsed.explanation : '',
    };
  } catch (error) {
    console.error('[LLM] Error:', error);
    throw new Error(`Failed to generate SQL query: ${error}`);
  }
}

export async function generateResponseSummary(
  userQuery: string,
  results: Record<string, unknown>[],
  queryType: string
): Promise<string> {
  const dataPreview =
    results.length > 0 ? JSON.stringify(results.slice(0, 20)) : '[]';

  const prompt = `Generate a concise summary of the following query results for a property tax system.

User Query: "${userQuery}"
Query Type: ${queryType}
Results (first 20 rows): ${dataPreview}
Total Results: ${results.length}

Provide a brief, human-friendly summary highlighting:
1. Key findings or patterns
2. Total counts or amounts if applicable
3. Any important insights from the data

Keep the response concise (2-3 sentences).`;

  try {
    return await generateText({
      systemPrompt:
        'You summarize analytics results for municipal property-tax staff in clear, direct language.',
      userPrompt: prompt,
      temperature: 0.3,
    });
  } catch (error) {
    console.error('[LLM] Summary generation error:', error);
    return `Query executed successfully. Found ${results.length} matching record(s).`;
  }
}

export function determineQueryType(
  sql: string
): 'table' | 'aggregate' | 'comparison' {
  const upperSQL = sql.toUpperCase();

  if (
    upperSQL.includes('COUNT(') ||
    upperSQL.includes('SUM(') ||
    upperSQL.includes('AVG(')
  ) {
    return 'aggregate';
  }

  if (
    upperSQL.includes('CASE WHEN') ||
    (upperSQL.includes('GROUP BY') && upperSQL.includes('COUNT'))
  ) {
    return 'comparison';
  }

  return 'table';
}
