import { NextResponse } from 'next/server';
import {
  getClientIp,
  loginLimiter,
  timingSafeCompare,
  createSignedSessionToken,
} from '@/lib/security-utils';

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request.headers);
    const rateCheck = loginLimiter.check(clientIp);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateCheck.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const body = await request.json();
    const { password } = body;

    const expectedPassword = process.env.ADMIN_PASSWORD || 'fr33SCRAPER';

    if (timingSafeCompare(password || '', expectedPassword)) {
      const response = NextResponse.json({ success: true });
      const sessionToken = await createSignedSessionToken();

      // Set HTTP-only session cookie expiring in 7 days
      response.cookies.set('admin-session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      return response;
    }

    return NextResponse.json(
      { error: 'Incorrect password' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

