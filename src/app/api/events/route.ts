import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      where: { status: 'approved' },
      include: { source: true },
      orderBy: [
        { startDate: 'asc' },
        { startTime: 'asc' }
      ]
    });

    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
