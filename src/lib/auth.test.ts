import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSessionToken,
  verifySessionToken,
  AUTH_COOKIE_NAME,
  type SessionUser,
} from './auth';

const TEST_SECRET = 'super-secret-test-key-32-characters-minimum-length!';

const sampleUser: SessionUser = {
  id: 'user-123-uuid',
  email: 'parent@example.com',
  name: 'Jane Doe',
  image: 'https://lh3.googleusercontent.com/a/sample',
  role: 'parent',
};

test('createSessionToken and verifySessionToken roundtrips successfully', async () => {
  const token = await createSessionToken(sampleUser, TEST_SECRET);
  assert.ok(typeof token === 'string' && token.length > 20, 'Token should be a non-empty JWT string');

  const decoded = await verifySessionToken(token, TEST_SECRET);
  assert.ok(decoded, 'Decoded token should not be null');
  assert.equal(decoded.id, sampleUser.id);
  assert.equal(decoded.email, sampleUser.email);
  assert.equal(decoded.name, sampleUser.name);
  assert.equal(decoded.image, sampleUser.image);
  assert.equal(decoded.role, sampleUser.role);
});

test('verifySessionToken returns null for invalid or tampered tokens', async () => {
  const token = await createSessionToken(sampleUser, TEST_SECRET);
  const tamperedToken = token.slice(0, -5) + 'abcde';

  const decoded = await verifySessionToken(tamperedToken, TEST_SECRET);
  assert.equal(decoded, null, 'Tampered token should decode to null');

  const invalidToken = 'not.a.valid.jwt';
  const decodedInvalid = await verifySessionToken(invalidToken, TEST_SECRET);
  assert.equal(decodedInvalid, null, 'Invalid token should decode to null');
});

test('verifySessionToken returns null when verified with the wrong secret', async () => {
  const token = await createSessionToken(sampleUser, TEST_SECRET);
  const wrongSecret = 'another-completely-different-secret-key-32-chars!';

  const decoded = await verifySessionToken(token, wrongSecret);
  assert.equal(decoded, null, 'Token verified with wrong secret should fail');
});

test('AUTH_COOKIE_NAME is defined as auth_session', () => {
  assert.equal(AUTH_COOKIE_NAME, 'auth_session');
});
