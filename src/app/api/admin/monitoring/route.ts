import { NextResponse } from 'next/server';
import { getPipelineHealthSummary } from '@/lib/pipeline-monitor';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const summary = await getPipelineHealthSummary();
    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Failed to get pipeline health summary:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
