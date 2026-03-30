import { ChatResponseData } from './chat-types';
import { getAllProperties, getDatabaseStatus, query, validateSQLQuery } from './db';
import { getDemoProperties } from './demo-data';
import { runDemoQuery } from './demo-query';
import { getUserFriendlyMessage } from './errors';
import { AppLanguage } from './language';
import { convertToSQL, determineQueryType, getLLMRuntimeInfo } from './llm';
import {
  getConversationalReply,
  runStructuredPropertyQuery,
} from './property-query';

export interface ChatSuccessPayload {
  success: true;
  reply: string;
  data?: ChatResponseData;
  mode?: 'demo' | 'database';
  message?: string;
  llm?: ReturnType<typeof getLLMRuntimeInfo>;
}

export interface ChatErrorPayload {
  success?: false;
  error: string;
  intent?: string;
}

export type ChatServicePayload = ChatSuccessPayload | ChatErrorPayload;

export interface ChatServiceResult {
  status: number;
  payload: ChatServicePayload;
}

const DEVANAGARI_PATTERN = /[\u0900-\u097F]/;
const HINDI_HINTS = [
  'है',
  'हैं',
  'क्या',
  'में',
  'कृपया',
  'भुगतान',
  'दिखाएं',
  'रिपोर्ट',
];
const MARATHI_HINTS = [
  'आहे',
  'आहेत',
  'काय',
  'मध्ये',
  'साठी',
  'दाखवा',
  'अहवाल',
  'पेमेंट',
];

export function detectAppLanguageFromText(message: string): AppLanguage {
  const normalized = message.trim().toLowerCase();

  if (!normalized || !DEVANAGARI_PATTERN.test(normalized)) {
    return 'en';
  }

  if (MARATHI_HINTS.some((hint) => normalized.includes(hint))) {
    return 'mr';
  }

  if (HINDI_HINTS.some((hint) => normalized.includes(hint))) {
    return 'hi';
  }

  return 'hi';
}

export function normalizeAppLanguage(
  language: unknown,
  message = ''
): AppLanguage {
  if (language === 'en' || language === 'hi' || language === 'mr') {
    return language;
  }

  return detectAppLanguageFromText(message);
}

export async function processChatMessage(input: {
  message?: string;
  language?: AppLanguage;
}): Promise<ChatServiceResult> {
  try {
    const llmRuntime = getLLMRuntimeInfo();
    const message = input.message;
    const selectedLanguage = normalizeAppLanguage(input.language, message ?? '');

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return {
        status: 400,
        payload: {
          error: 'Invalid message. Please provide a non-empty query.',
        },
      };
    }

    const normalizedMessage = message.trim();
    console.log('[ChatService] Received query:', normalizedMessage);

    const conversationalReply = getConversationalReply(
      normalizedMessage,
      selectedLanguage
    );
    if (conversationalReply) {
      return {
        status: 200,
        payload: {
          success: true,
          reply: conversationalReply,
        },
      };
    }

    const databaseStatus = await getDatabaseStatus();

    if (!databaseStatus.connected) {
      const demoFeatureResponse = runStructuredPropertyQuery(normalizedMessage, {
        properties: await getDemoProperties(),
        source: 'demo',
        language: selectedLanguage,
      });

      if (demoFeatureResponse) {
        return {
          status: 200,
          payload: {
            success: true,
            reply: demoFeatureResponse.reply,
            data: demoFeatureResponse.data,
            mode: 'demo',
          },
        };
      }

      console.log(
        '[ChatService] Falling back to bundled demo data:',
        databaseStatus.message
      );
      const demoResponse = await runDemoQuery(normalizedMessage);

      return {
        status: 200,
        payload: {
          success: true,
          reply: demoResponse.reply,
          data: demoResponse.data,
          mode: 'demo',
        },
      };
    }

    const structuredResponse = runStructuredPropertyQuery(normalizedMessage, {
      properties: await getAllProperties(),
      source: 'database',
      language: selectedLanguage,
    });

    if (structuredResponse) {
      return {
        status: 200,
        payload: {
          success: true,
          reply: structuredResponse.reply,
          data: structuredResponse.data,
          mode: 'database',
        },
      };
    }

    console.log(
      `[ChatService] Converting to SQL using ${llmRuntime.provider} (${llmRuntime.model})...`
    );

    let sql: string;
    let intent: string;
    let explanation: string;

    try {
      const generated = await convertToSQL(normalizedMessage, selectedLanguage);
      sql = generated.sql;
      intent = generated.intent;
      explanation = generated.explanation;
    } catch (error) {
      console.warn(
        '[ChatService] LLM conversion unavailable, returning graceful fallback:',
        error
      );

      return {
        status: 200,
        payload: {
          success: true,
          reply:
            'AI query generation is temporarily unavailable right now. Built-in queries like top defaulters, dashboards, payment status, integrated tax summary, predictive defaulters, and ward-wise collection reports still work.',
        },
      };
    }

    console.log('[ChatService] Generated SQL:', sql);

    const validation = validateSQLQuery(sql);
    if (!validation.valid) {
      return {
        status: 400,
        payload: {
          error: validation.message,
          intent,
        },
      };
    }

    console.log('[ChatService] Executing query...');
    const results = await query(sql);
    const queryType = determineQueryType(sql);

    console.log('[ChatService] Query executed. Results:', results.length);

    return {
      status: 200,
      payload: {
        success: true,
        reply: explanation || 'Query executed successfully',
        message: 'Query executed successfully',
        data: {
          results,
          intent,
          explanation,
          queryType,
          resultCount: results.length,
          query: sql,
          source: 'database',
        },
        llm: llmRuntime,
      },
    };
  } catch (error) {
    console.error('[ChatService] Error:', error);

    return {
      status: 500,
      payload: {
        error:
          error instanceof Error
            ? getUserFriendlyMessage(error)
            : 'An unknown error occurred',
        success: false,
      },
    };
  }
}
