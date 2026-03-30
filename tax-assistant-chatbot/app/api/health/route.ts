import { NextResponse } from 'next/server';
import { getDatabaseStatus, query } from '@/lib/db';
import { getDemoProperties } from '@/lib/demo-data';
import { getLLMRuntimeInfo } from '@/lib/llm';

export const runtime = 'nodejs';

/**
 * GET /api/health
 * Health check endpoint to verify database connectivity
 */
export async function GET() {
  try {
    const llmRuntime = getLLMRuntimeInfo();
    const databaseStatus = await getDatabaseStatus();

    if (databaseStatus.connected) {
      const result = await query<{ count: number }>('SELECT COUNT(*) as count FROM properties');

      return NextResponse.json({
        status: 'healthy',
        database: 'sqlite',
        message: 'API and SQLite database are operational',
        timestamp: new Date().toISOString(),
        propertiesCount: result[0]?.count || 0,
        llm: llmRuntime,
      });
    }

    const demoProperties = await getDemoProperties();

    return NextResponse.json({
      status: 'healthy',
      database: 'demo',
      message: 'Running with bundled demo data because the live database is unavailable',
      timestamp: new Date().toISOString(),
      propertiesCount: demoProperties.length,
      details: databaseStatus.message,
      llm: llmRuntime,
    });
  } catch (error) {
    console.error('[Health] Database check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
