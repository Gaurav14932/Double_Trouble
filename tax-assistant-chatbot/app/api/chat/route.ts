import { NextRequest, NextResponse } from 'next/server';
import { convertToSQL, determineQueryType } from '@/lib/gemini';
import { getAllProperties, getDatabaseStatus, query, validateSQLQuery } from '@/lib/db';
import { getUserFriendlyMessage } from '@/lib/errors';
import { runDemoQuery } from '@/lib/demo-query';
import { getDemoProperties } from '@/lib/demo-data';
import { AppLanguage } from '@/lib/language';
import {
  getConversationalReply,
  runStructuredPropertyQuery,
} from '@/lib/property-query';

export const runtime = 'nodejs';

/**
 * POST /api/chat
 * Accepts a natural language query and returns SQL-generated results
 */
export async function POST(request: NextRequest) {
  try {
    const { message, language } = (await request.json()) as {
      message?: string;
      language?: AppLanguage;
    };
    const selectedLanguage: AppLanguage =
      language === 'hi' || language === 'mr' ? language : 'en';

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid message. Please provide a non-empty query.' },
        { status: 400 }
      );
    }

    console.log('[API] Received query:', message);

    const conversationalReply = getConversationalReply(
      message,
      selectedLanguage
    );
    if (conversationalReply) {
      return NextResponse.json({
        success: true,
        reply: conversationalReply,
      });
    }

    const databaseStatus = await getDatabaseStatus();

    if (!databaseStatus.connected) {
      const demoFeatureResponse = runStructuredPropertyQuery(message, {
        properties: await getDemoProperties(),
        source: 'demo',
        language: selectedLanguage,
      });

      if (demoFeatureResponse) {
        return NextResponse.json({
          success: true,
          reply: demoFeatureResponse.reply,
          data: demoFeatureResponse.data,
          mode: 'demo',
        });
      }

      console.log('[API] Falling back to bundled demo data:', databaseStatus.message);
      const demoResponse = await runDemoQuery(message);

      return NextResponse.json({
        success: true,
        reply: demoResponse.reply,
        data: demoResponse.data,
        mode: 'demo',
      });
    }

    const structuredResponse = runStructuredPropertyQuery(message, {
      properties: await getAllProperties(),
      source: 'database',
      language: selectedLanguage,
    });

    if (structuredResponse) {
      return NextResponse.json({
        success: true,
        reply: structuredResponse.reply,
        data: structuredResponse.data,
        mode: 'database',
      });
    }

    // Step 1: Convert natural language to SQL using Gemini
    console.log('[API] Converting to SQL...');
    let sql: string;
    let intent: string;
    let explanation: string;

    try {
      const generated = await convertToSQL(message, selectedLanguage);
      sql = generated.sql;
      intent = generated.intent;
      explanation = generated.explanation;
    } catch (error) {
      console.warn('[API] Gemini conversion unavailable, returning graceful fallback:', error);

      return NextResponse.json({
        success: true,
        reply:
          'AI query generation is temporarily unavailable right now. Built-in queries like top defaulters, dashboards, payment status, integrated tax summary, predictive defaulters, and ward-wise collection reports still work.',
      });
    }

    console.log('[API] Generated SQL:', sql);

    // Step 2: Validate SQL query
    const validation = validateSQLQuery(sql);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.message,
          intent,
        },
        { status: 400 }
      );
    }

    // Step 3: Execute query
    console.log('[API] Executing query...');
    const results = await query(sql);

    // Step 4: Determine query type for formatting
    const queryType = determineQueryType(sql);

    console.log('[API] Query executed. Results:', results.length);

    return NextResponse.json({
      success: true,
      reply: explanation || 'Query executed successfully',
      message: 'Query executed successfully',
      data: {
        results,
        intent,
        explanation,
        queryType,
        resultCount: results.length,
        query: sql, // Include SQL for transparency
        source: 'database',
      },
    });
  } catch (error) {
    console.error('[API] Error:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? getUserFriendlyMessage(error)
            : 'An unknown error occurred',
        success: false,
      },
      { status: 500 }
    );
  }
}
