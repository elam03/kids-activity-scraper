import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/admin/events?status=pending (or status=all, or countOnly=true)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const countOnly = searchParams.get('countOnly') === 'true';

    const whereClause = status === 'all' ? {} : { status };

    if (countOnly) {
      const count = await prisma.event.count({
        where: whereClause,
      });
      return NextResponse.json({ count });
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        source: true,
        _count: {
          select: {
            feedbacks: {
              where: { type: 'report_inaccurate' }
            }
          }
        }
      },
      orderBy: [
        { startDate: 'asc' },
        { startTime: 'asc' }
      ],
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
    if (updateFields.description !== undefined) data.description = updateFields.description;
    if (updateFields.startDate !== undefined) data.startDate = updateFields.startDate;
    if (updateFields.endDate !== undefined) data.endDate = updateFields.endDate;
    if (updateFields.startTime !== undefined) data.startTime = updateFields.startTime;
    if (updateFields.endTime !== undefined) data.endTime = updateFields.endTime;
    if (updateFields.location !== undefined) data.location = updateFields.location;
    if (updateFields.category !== undefined) data.category = updateFields.category;
    if (updateFields.cost !== undefined) data.cost = updateFields.cost;
    if (updateFields.isFree !== undefined) data.isFree = updateFields.isFree;
    if (updateFields.ageRange !== undefined) data.ageRange = updateFields.ageRange;
    if (updateFields.ageGroup !== undefined) data.ageGroup = updateFields.ageGroup;
    if (updateFields.registrationUrl !== undefined) data.registrationUrl = updateFields.registrationUrl;
    if (updateFields.confidence !== undefined) data.confidence = Number(updateFields.confidence);
    if (updateFields.latitude !== undefined) data.latitude = updateFields.latitude === null ? null : Number(updateFields.latitude);
    if (updateFields.longitude !== undefined) data.longitude = updateFields.longitude === null ? null : Number(updateFields.longitude);

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

// DELETE /api/admin/events?id=<id>
// Permanently hard delete an event
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing event id parameter' },
        { status: 400 }
      );
    }

    await prisma.event.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

