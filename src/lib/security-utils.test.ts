import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getClientIp,
  RateLimiter,
  timingSafeCompare,
  createSignedSessionToken,
  verifySignedSessionToken,
  sanitizeText,
  isAllowedOrigin,
} from './security-utils';

test('getClientIp extracts first IP from x-forwarded-for header', () => {
  const headers = new Headers({
    'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
  });
  assert.equal(getClientIp(headers), '203.0.113.195');
});

test('getClientIp falls back to x-real-ip or default 127.0.0.1', () => {
  const headersWithRealIp = new Headers({
    'x-real-ip': '198.51.100.1',
  });
  assert.equal(getClientIp(headersWithRealIp), '198.51.100.1');

  const emptyHeaders = new Headers();
  assert.equal(getClientIp(emptyHeaders), '127.0.0.1');
});

test('RateLimiter enforces max requests within time window', () => {
  const limiter = new RateLimiter({ windowMs: 1000, maxRequests: 3 });

  // Requests 1, 2, 3 allowed
  assert.equal(limiter.check('ip-test-1').allowed, true);
  assert.equal(limiter.check('ip-test-1').allowed, true);
  assert.equal(limiter.check('ip-test-1').allowed, true);

  // Request 4 blocked
  const blocked = limiter.check('ip-test-1');
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);

  // Different key allowed
  assert.equal(limiter.check('ip-test-2').allowed, true);
});

test('RateLimiter resets after window expires', async () => {
  const limiter = new RateLimiter({ windowMs: 50, maxRequests: 1 });
  assert.equal(limiter.check('key-reset').allowed, true);
  assert.equal(limiter.check('key-reset').allowed, false);

  await new Promise(resolve => setTimeout(resolve, 60));

  assert.equal(limiter.check('key-reset').allowed, true);
});

test('timingSafeCompare returns true for identical strings and false for differences', () => {
  assert.equal(timingSafeCompare('supersecret', 'supersecret'), true);
  assert.equal(timingSafeCompare('supersecret', 'wrongsecret'), false);
  assert.equal(timingSafeCompare('short', 'longerpassword'), false);
  assert.equal(timingSafeCompare('', 'notempty'), false);
  assert.equal(timingSafeCompare('', ''), true);
});

test('createSignedSessionToken generates verifiable token', async () => {
  const secret = 'my-test-secret-12345';
  const token = await createSignedSessionToken(secret);

  assert.ok(typeof token === 'string' && token.length > 20);
  assert.equal(await verifySignedSessionToken(token, secret), true);
});

test('verifySignedSessionToken rejects tampered or invalid tokens', async () => {
  const secret = 'my-test-secret-12345';
  const token = await createSignedSessionToken(secret);

  assert.equal(await verifySignedSessionToken(token + 'tamper', secret), false);
  assert.equal(await verifySignedSessionToken('random-garbage', secret), false);
  assert.equal(await verifySignedSessionToken(token, 'different-secret'), false);
  assert.equal(await verifySignedSessionToken('', secret), false);
});

test('sanitizeText strips dangerous tags, script injections, and trims length', () => {
  const dirty = '   <script>alert("xss")</script>Hello & welcome! <iframe src="evil.com"></iframe>   ';
  const sanitized = sanitizeText(dirty, 50);

  assert.equal(sanitized.includes('<script>'), false);
  assert.equal(sanitized.includes('<iframe>'), false);
  assert.ok(sanitized.startsWith('Hello'));
  assert.ok(sanitized.length <= 50);
});

test('isAllowedOrigin allows trusted domains and blocks cross-origin attacks', () => {
  assert.equal(isAllowedOrigin('https://www.littledaysout.com'), true);
  assert.equal(isAllowedOrigin('http://localhost:3000'), true);
  assert.equal(isAllowedOrigin('http://127.0.0.1:3000'), true);
  assert.equal(isAllowedOrigin('https://kids-activity-scraper.up.railway.app'), true);
  assert.equal(isAllowedOrigin('https://malicious-attacker.com'), false);
  assert.equal(isAllowedOrigin(undefined), true); // Server-to-server or direct navigation without origin
});
