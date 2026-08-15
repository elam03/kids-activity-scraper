import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/admin/events?status=pending
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const events = await prisma.event.findMany({
      where: { status },
      include: { source: true },
      orderBy: { startDate: 'asc' },
    });

    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/admin/events
// Approve, edit, or reject an event
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, status, ...updateFields } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing event id parameter' },
        { status: 400 }
      );
    }

    const data: any = {};
    if (status !== undefined) data.status = status;
    if (updateFields.title !== undefined) data.title = updateFields.title;
    if (updateFields.startDate !== undefined) data.startDate = updateFields.startDate;
    if (updateFields.endDate !== undefined) data.endDate = updateFields.endDate;
    if (updateFields.startTime !== undefined) data.startTime = updateFields.startTime;
    if (updateFields.endTime !== undefined) data.endTime = updateFields.endTime;
    if (updateFields.location !== undefined) data.location = updateFields.location;
    if (updateFields.category !== undefined) data.category = updateFields.category;
    if (updateFields.cost !== undefined) data.cost = updateFields.cost;
    if (updateFields.isFree !== undefined) data.isFree = updateFields.isFree;
    if (updateFields.ageRange !== undefined) data.ageRange = updateFields.ageRange;
    if (updateFields.registrationUrl !== undefined) data.registrationUrl = updateFields.registrationUrl;

    const event = await prisma.event.update({
      where: { id },
      data,
    });

    return NextResponse.json({ event });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
