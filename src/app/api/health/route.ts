import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Ping DB to verify connectivity
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', database: 'connected' }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', database: 'disconnected', error: (error as Error).message },
      { status: 503 }
    );
  }
}
