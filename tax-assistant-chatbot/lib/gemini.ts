import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSchemaInfo } from './db';
import { AppLanguage } from './language';

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Initialize Gemini AI client
 */
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

/**
 * Convert natural language query to SQL using Gemini API
 * Returns the generated SQL query
 */
export async function convertToSQL(
  userQuery: string,
  language: AppLanguage = 'en'
): Promise<{
  sql: string;
  intent: string;
  explanation: string;
}> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: getGeminiModelName() });

  // Get database schema for context
  const schemaInfo = await getSchemaInfo();

  const systemPrompt = `You are an expert SQL query generator for a property tax management system.
Your job is to convert natural language queries into SQLite SELECT statements.

${schemaInfo}

Important rules:
1. You MUST only generate SELECT queries. Never generate INSERT, UPDATE, DELETE, or DROP statements.
2. Always use the exact table and column names from the schema above.
3. For defaulters, query properties where payment_status = 'UNPAID' and due_amount > 0
4. For payment status, filter by payment_status field
5. For ward-wise reports, group by 'ward'
6. For zone-wise reports, group by 'zone'
7. Always include ORDER BY clause to sort results meaningfully
8. Use LIMIT 100 for large result sets to avoid performance issues
9. Keep the "sql" field strictly in SQLite syntax, but return the "intent" and "explanation" fields in ${getOutputLanguageLabel(
    language
  )}

Respond in this JSON format:
{
  "intent": "brief description of what the query does",
  "sql": "the actual SQL query",
  "explanation": "explanation of the query in simple terms"
}`;

  try {
    const response = await model.generateContent(
      `${systemPrompt}\n\nUser query: "${userQuery}"\n\nGenerate the SQL query in JSON format.`
    );

    const responseText = response.response.text().trim();
    const cleanedResponseText = responseText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    let parsed: Record<string, unknown> = {};
    const jsonMatch = extractFirstJsonObject(cleanedResponseText);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch);
      } catch (parseError) {
        console.warn('[Gemini] Failed to parse JSON response, falling back to SQL extraction');
      }
    }

    const sql =
      typeof parsed.sql === 'string'
        ? parsed.sql.trim()
        : extractSQL(cleanedResponseText);

    if (!sql) {
      throw new Error('AI model did not return a valid SQL query');
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
    console.error('[Gemini] Error:', error);
    throw new Error(`Failed to generate SQL query: ${error}`);
  }
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

/**
 * Generate response summary from query results
 */
export async function generateResponseSummary(
  userQuery: string,
  results: any[],
  queryType: string
): Promise<string> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: getGeminiModelName() });

  // Limit data size for API
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
    const response = await model.generateContent(prompt);
    return response.response.text();
  } catch (error) {
    console.error('[Gemini] Summary generation error:', error);
    // Fallback to generic summary
    return `Query executed successfully. Found ${results.length} matching record(s).`;
  }
}

/**
 * Determine query type for better result formatting
 */
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
