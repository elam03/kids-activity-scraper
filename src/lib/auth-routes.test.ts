import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as googleAuthHandler } from '../app/api/auth/google/route';
import { POST as logoutHandler } from '../app/api/auth/logout/route';

test('POST /api/auth/google rejects missing or non-string credential', async () => {
  const req1 = new Request('http://localhost:3000/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const res1 = await googleAuthHandler(req1);
  assert.equal(res1.status, 400);
  const data1 = await res1.json();
  assert.ok(data1.error.includes('Missing or invalid'));

  const req2 = new Request('http://localhost:3000/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: 12345 }),
  });
  const res2 = await googleAuthHandler(req2);
  assert.equal(res2.status, 400);
});

test('POST /api/auth/logout clears auth_session cookie with maxAge=0', async () => {
  const res = await logoutHandler();
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);

  const setCookie = res.headers.get('set-cookie');
  assert.ok(setCookie, 'Should include Set-Cookie header');
  assert.ok(setCookie.includes('auth_session=;'), 'Should clear auth_session');
  assert.ok(setCookie.includes('Max-Age=0'), 'Should set Max-Age=0');
});
