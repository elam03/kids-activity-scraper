import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import {
  verifySessionToken,
  extractSessionFromRequest,
  AUTH_COOKIE_NAME,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    let sessionPayload = null;
    if (req) {
      sessionPayload = await extractSessionFromRequest(req);
    }

    if (!sessionPayload) {
      try {
        const cookieStore = cookies();
        const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME);
        if (sessionCookie && sessionCookie.value) {
          sessionPayload = await verifySessionToken(sessionCookie.value);
        }
      } catch {
        // outside request scope
      }
    }

    if (!sessionPayload) {
      return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionPayload.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
      },
    });

    return NextResponse.json({ user: user || null });
  } catch (error) {
    return NextResponse.json({ user: null });
  }
}
