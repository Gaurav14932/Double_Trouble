import { NextRequest, NextResponse } from 'next/server';
import { processChatMessage } from '@/lib/chat-service';
import { AppLanguage } from '@/lib/language';

export const runtime = 'nodejs';

/**
 * POST /api/chat
 * Accepts a natural language query and returns SQL-generated results
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    message?: string;
    language?: AppLanguage;
  };
  const result = await processChatMessage(body);

  return NextResponse.json(result.payload, { status: result.status });
}
