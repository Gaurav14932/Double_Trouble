import { NextResponse } from 'next/server';
import { getPropertyTaxSummary } from '@/lib/summary';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const summary = await getPropertyTaxSummary();
    return NextResponse.json(summary);
  } catch (error) {
    console.error('[SummaryAPI] Error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
