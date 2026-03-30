import { NextResponse } from 'next/server';
import { getSchemaInfo } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/schema
 * Returns database schema information for frontend reference
 */
export async function GET() {
  try {
    const schemaInfo = await getSchemaInfo();

    return NextResponse.json({
      success: true,
      schema: schemaInfo,
    });
  } catch (error) {
    console.error('[API] Schema error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch schema information',
        success: false,
      },
      { status: 500 }
    );
  }
}
