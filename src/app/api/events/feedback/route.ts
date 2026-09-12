import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateFeedbackPayload } from '@/lib/feedback-utils';

export const dynamic = 'force-dynamic';

// GET /api/events/feedback?eventId=<id>
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        likes: true,
        _count: {
          select: {
            feedbacks: {
              where: { type: 'report_inaccurate' }
            }
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({
      likes: event.likes || 0,
      reportsCount: event._count.feedbacks || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/events/feedback
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateFeedbackPayload(body);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { eventId, type, reason, comment } = body;

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (type === 'like') {
      const updated = await prisma.event.update({
        where: { id: eventId },
        data: {
          likes: { increment: 1 },
          feedbacks: {
            create: {
              type: 'like',
            }
          }
        },
        select: { likes: true }
      });

      return NextResponse.json({ success: true, likes: updated.likes });
    }

    if (type === 'unlike') {
      const currentLikes = event.likes || 0;
      const newLikes = Math.max(0, currentLikes - 1);

      const updated = await prisma.event.update({
        where: { id: eventId },
        data: {
          likes: newLikes,
        },
        select: { likes: true }
      });

      return NextResponse.json({ success: true, likes: updated.likes });
    }

    if (type === 'report_inaccurate') {
      await prisma.eventFeedback.create({
        data: {
          eventId,
          type: 'report_inaccurate',
          reason,
          comment: comment?.trim() || null,
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Thank you for your report! Our team will review this event.',
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
