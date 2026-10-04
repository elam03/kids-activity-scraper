import { SignJWT, jwtVerify } from 'jose';
import { OAuth2Client } from 'google-auth-library';

export const AUTH_COOKIE_NAME = 'auth_session';

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role?: string;
}

export interface GooglePayload {
  googleId: string;
  email: string;
  name: string;
  image: string | null;
}

const DEFAULT_SECRET_FALLBACK = 'kids-activity-calendar-default-jwt-secret-key-32-chars!';

/**
 * Resolves the JWT signing secret as a Uint8Array for jose.
 */
export function resolveAuthSecret(secretOverride?: string): Uint8Array {
  const secretStr =
    secretOverride ||
    process.env.AUTH_SECRET ||
    process.env.ADMIN_PASSWORD ||
    DEFAULT_SECRET_FALLBACK;

  return new TextEncoder().encode(secretStr);
}

/**
 * Creates a signed JWT session token valid for 30 days by default.
 */
export async function createSessionToken(
  user: SessionUser,
  secretOverride?: string,
  expiresIn: string = '30d'
): Promise<string> {
  const secret = resolveAuthSecret(secretOverride);

  return new SignJWT({
    sub: user.id,
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role || 'parent',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

/**
 * Verifies a JWT session token and returns the SessionUser or null if invalid/expired.
 */
export async function verifySessionToken(
  token: string,
  secretOverride?: string
): Promise<SessionUser | null> {
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    const secret = resolveAuthSecret(secretOverride);
    const { payload } = await jwtVerify(token, secret);

    if (!payload || !payload.email || typeof payload.email !== 'string') {
      return null;
    }

    return {
      id: (payload.sub || payload.id || '') as string,
      email: payload.email,
      name: (payload.name as string) || null,
      image: (payload.image as string) || null,
      role: (payload.role as string) || 'parent',
    };
  } catch {
    return null;
  }
}

/**
 * Verifies a Google ID token from Google Identity Services (One Tap).
 */
export async function verifyGoogleCredential(
  credentialToken: string,
  audienceOverride?: string
): Promise<GooglePayload> {
  if (!credentialToken || typeof credentialToken !== 'string') {
    throw new Error('Missing Google credential token');
  }

  const expectedAudience =
    audienceOverride ||
    process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const client = new OAuth2Client(expectedAudience);
  const ticket = await client.verifyIdToken({
    idToken: credentialToken,
    audience: expectedAudience,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email || !payload.sub) {
    throw new Error('Invalid Google credential payload');
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split('@')[0],
    image: payload.picture || null,
  };
}

/**
 * Extracts and verifies a SessionUser from a raw Cookie header string.
 */
export async function extractSessionFromCookieString(
  cookieHeader: string | null | undefined,
  secretOverride?: string
): Promise<SessionUser | null> {
  if (!cookieHeader) {
    return null;
  }

  const match = cookieHeader.match(new RegExp(`(?:^|; )${AUTH_COOKIE_NAME}=([^;]*)`));
  if (!match || !match[1]) {
    return null;
  }

  return verifySessionToken(decodeURIComponent(match[1]), secretOverride);
}

/**
 * Extracts and verifies a SessionUser from a Request object.
 */
export async function extractSessionFromRequest(
  req: Request,
  secretOverride?: string
): Promise<SessionUser | null> {
  const cookieHeader = req.headers.get('cookie');
  return extractSessionFromCookieString(cookieHeader, secretOverride);
}

/**
 * Returns standard options for setting the auth session cookie.
 */
export function getSessionCookieOptions(maxAgeSeconds: number = 30 * 24 * 60 * 60) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
