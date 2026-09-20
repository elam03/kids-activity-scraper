/**
 * Extracts client IP address from standard proxy headers.
 */
export function getClientIp(headers: Headers | Record<string, string | string[] | undefined>): string {
  let forwarded: string | string[] | undefined | null = null;
  let realIp: string | string[] | undefined | null = null;

  if (headers instanceof Headers) {
    forwarded = headers.get('x-forwarded-for');
    realIp = headers.get('x-real-ip');
  } else {
    forwarded = headers['x-forwarded-for'];
    realIp = headers['x-real-ip'];
  }

  if (typeof forwarded === 'string' && forwarded.trim()) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }

  return '127.0.0.1';
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * In-memory sliding-window rate limiter with automatic stale key eviction.
 */
export class RateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private lastCleanup = Date.now();

  constructor(options: RateLimitOptions) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
  }

  public check(key: string): RateLimitResult {
    const now = Date.now();

    // Periodic garbage collection every 60s
    if (now - this.lastCleanup > 60000) {
      this.cleanup(now);
    }

    const record = this.store.get(key);

    if (!record || now >= record.resetTime) {
      const resetTime = now + this.windowMs;
      this.store.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime,
      };
    }

    if (record.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
      };
    }

    record.count += 1;
    return {
      allowed: true,
      remaining: this.maxRequests - record.count,
      resetTime: record.resetTime,
    };
  }

  private cleanup(now: number) {
    this.lastCleanup = now;
    this.store.forEach((record, key) => {
      if (now >= record.resetTime) {
        this.store.delete(key);
      }
    });
  }
}

// Global shared limiters
// Feedback route: 45 requests per minute per IP
export const feedbackLimiter = new RateLimiter({ windowMs: 60 * 1000, maxRequests: 45 });

// Admin login route: 6 attempts per 15 minutes per IP
export const loginLimiter = new RateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 6 });

/**
 * Constant-time string comparison to protect against timing attacks.
 * Operates across all standard runtimes (Node.js, Edge Runtime, Browser).
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;

  let mismatch = a.length === b.length ? 0 : 1;
  const maxLen = Math.max(a.length, b.length);

  for (let i = 0; i < maxLen; i++) {
    const codeA = a.charCodeAt(i % (a.length || 1)) || 0;
    const codeB = b.charCodeAt(i % (b.length || 1)) || 0;
    mismatch |= codeA ^ codeB;
  }

  return mismatch === 0;
}

const DEFAULT_SECRET = process.env.ADMIN_SESSION_SECRET || 'l1ttl3-d4ys-0ut-adm1n-s3cr3t-k3y-2026';

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(base64Url: string): string {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function hmacSha256Base64Url(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(data));
  const bytes = new Uint8Array(signature);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Creates an HMAC-SHA256 signed session token for admin authentication using standard Web Crypto.
 */
export async function createSignedSessionToken(secret: string = DEFAULT_SECRET): Promise<string> {
  const payload = JSON.stringify({
    role: 'admin',
    createdAt: Date.now(),
  });
  const encodedPayload = toBase64Url(payload);
  const hmac = await hmacSha256Base64Url(secret, encodedPayload);
  return `${encodedPayload}.${hmac}`;
}

/**
 * Verifies an HMAC-SHA256 signed session token using standard Web Crypto.
 */
export async function verifySignedSessionToken(token: string, secret: string = DEFAULT_SECRET): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;

  // Transitional check for legacy 'authenticated' cookie
  if (token === 'authenticated') {
    return true;
  }

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [encodedPayload, receivedSignature] = parts;
  try {
    const expectedSignature = await hmacSha256Base64Url(secret, encodedPayload);

    if (!timingSafeCompare(receivedSignature, expectedSignature)) {
      return false;
    }

    const decoded = JSON.parse(fromBase64Url(encodedPayload));
    if (!decoded || decoded.role !== 'admin') return false;

    // Check expiry (7 days)
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - decoded.createdAt > sevenDaysMs) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Strips script tags, HTML tags, control characters, and truncates text.
 */
export function sanitizeText(input: string, maxLength: number = 500): string {
  if (!input || typeof input !== 'string') return '';

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

const TRUSTED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'littledaysout.com',
  'www.littledaysout.com',
];

/**
 * Validates request Origin/Referer against allowed domains to prevent CSRF.
 */
export function isAllowedOrigin(originHeader?: string | null, customHosts?: string[]): boolean {
  if (!originHeader) {
    // Direct requests, server-to-server, or same-origin non-cross-site navigations
    return true;
  }

  try {
    const url = new URL(originHeader);
    const hostname = url.hostname.toLowerCase();

    if (TRUSTED_DOMAINS.includes(hostname)) {
      return true;
    }

    if (hostname.endsWith('.railway.app') || hostname.endsWith('.up.railway.app')) {
      return true;
    }

    if (customHosts && customHosts.includes(hostname)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
