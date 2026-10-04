import test from 'node:test';
import assert from 'node:assert/strict';
import { GET, POST, DELETE } from '../app/api/bookmarks/route';

test('GET /api/bookmarks returns 401 when no auth cookie is present', async () => {
  const req = new Request('http://localhost:3000/api/bookmarks', {
    method: 'GET',
  });
  const res = await GET(req);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.ok(data.error.includes('Authentication required'));
});

test('POST /api/bookmarks returns 401 when no auth cookie is present', async () => {
  const req = new Request('http://localhost:3000/api/bookmarks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId: 'evt-123' }),
  });
  const res = await POST(req);
  assert.equal(res.status, 401);
});

test('DELETE /api/bookmarks returns 401 when no auth cookie is present', async () => {
  const req = new Request('http://localhost:3000/api/bookmarks?eventId=evt-123', {
    method: 'DELETE',
  });
  const res = await DELETE(req);
  assert.equal(res.status, 401);
});

test('POST /api/bookmarks rejects missing eventId even when authenticated', async () => {
  const { createSessionToken, AUTH_COOKIE_NAME } = await import('./auth');
  const token = await createSessionToken({
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'parent',
  });

  const req = new Request('http://localhost:3000/api/bookmarks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `${AUTH_COOKIE_NAME}=${token}`,
    },
    body: JSON.stringify({}),
  });

  const res = await POST(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('Missing or invalid eventId'));
});
