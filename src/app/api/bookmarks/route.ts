import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import {
  verifySessionToken,
  extractSessionFromRequest,
  AUTH_COOKIE_NAME,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUser(req?: Request) {
  if (req) {
    const session = await extractSessionFromRequest(req);
    if (session) return session;
  }
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME);
    if (sessionCookie && sessionCookie.value) {
      return verifySessionToken(sessionCookie.value);
    }
  } catch {
    // outside request context in tests
  }
  return null;
}

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: user.id },
      select: { eventId: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      eventIds: bookmarks.map((b) => b.eventId),
    });
  } catch (error) {
    console.error('Failed to fetch bookmarks', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to fetch bookmarks' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { eventId } = body;

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid eventId' }, { status: 400 });
    }

    const bookmark = await prisma.bookmark.upsert({
      where: {
        userId_eventId: {
          userId: user.id,
          eventId,
        },
      },
      update: {},
      create: {
        userId: user.id,
        eventId,
      },
    });

    return NextResponse.json({ success: true, bookmark });
  } catch (error) {
    console.error('Failed to create bookmark', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to create bookmark' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    let eventId = url.searchParams.get('eventId');

    if (!eventId) {
      const body = await req.json().catch(() => ({}));
      eventId = body.eventId;
    }

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid eventId' }, { status: 400 });
    }

    await prisma.bookmark.deleteMany({
      where: {
        userId: user.id,
        eventId,
      },
    });

    return NextResponse.json({ success: true, eventId });
  } catch (error) {
    console.error('Failed to delete bookmark', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to delete bookmark' },
      { status: 500 }
    );
  }
}
