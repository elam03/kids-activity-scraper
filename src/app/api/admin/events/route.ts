import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildPastEventsPruneWhere } from '@/lib/event-utils';

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
// Approve, edit, or reject an event, or prune past events
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, status, action, clearReports, ...updateFields } = body;

    // Support pruning past events
    if (action === 'prune_past_events' || action === 'prune_past') {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      const result = await prisma.event.deleteMany({
        where: buildPastEventsPruneWhere(todayStr),
      });

      return NextResponse.json({ success: true, prunedCount: result.count });
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Missing event id parameter' },
        { status: 400 }
      );
    }

    // Support unflagging / clearing inaccuracy reports
    if (action === 'clear_reports' || clearReports === true) {
      await prisma.eventFeedback.deleteMany({
        where: {
          eventId: id,
          type: 'report_inaccurate',
        },
      });

      if (status === undefined && Object.keys(updateFields).length === 0) {
        return NextResponse.json({ success: true, clearedReports: true, id });
      }
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

// DELETE /api/admin/events?id=<id> (or ?action=prune_past)
// Permanently hard delete an event or prune past events
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action');

    if (action === 'prune_past' || action === 'prune_past_events') {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      const result = await prisma.event.deleteMany({
        where: buildPastEventsPruneWhere(todayStr),
      });

      return NextResponse.json({ success: true, prunedCount: result.count });
    }

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

