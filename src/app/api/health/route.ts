import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Ping DB to verify connectivity
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', database: 'connected' }, { status: 200 });
  } catch (error) {
    console.error("Health check DB connection warning:", error);
    // Return 200 with status degraded during start to prevent Railway termination
    return NextResponse.json(
      { status: 'degraded', database: 'disconnected', error: (error as Error).message },
      { status: 200 }
    );
  }
}
