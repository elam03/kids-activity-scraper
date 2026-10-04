import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  verifyGoogleCredential,
  createSessionToken,
  AUTH_COOKIE_NAME,
  getSessionCookieOptions,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { credential } = body;

    if (!credential || typeof credential !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid Google credential token' },
        { status: 400 }
      );
    }

    // Verify token with Google
    const googleUser = await verifyGoogleCredential(credential);

    // Upsert User in database
    const user = await prisma.user.upsert({
      where: { email: googleUser.email },
      update: {
        name: googleUser.name,
        image: googleUser.image,
        googleId: googleUser.googleId,
      },
      create: {
        email: googleUser.email,
        name: googleUser.name,
        image: googleUser.image,
        googleId: googleUser.googleId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
      },
    });

    // Create session token
    const sessionToken = await createSessionToken(user);

    // Create response with httpOnly auth cookie
    const response = NextResponse.json({
      success: true,
      user,
    });

    response.cookies.set(AUTH_COOKIE_NAME, sessionToken, getSessionCookieOptions());

    return response;
  } catch (error) {
    console.error('Google One Tap verification failed', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
