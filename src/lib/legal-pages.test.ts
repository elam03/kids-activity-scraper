import test from 'node:test';
import assert from 'node:assert/strict';
import { metadata as privacyMetadata } from '../app/privacy/page';
import { metadata as termsMetadata } from '../app/terms/page';

test('Privacy page exports compliant metadata for search engines and Google OAuth verification', () => {
  assert.ok(privacyMetadata.title);
  assert.match(String(privacyMetadata.title), /Privacy Policy/i);
  assert.ok(privacyMetadata.description);
  assert.match(String(privacyMetadata.description), /privacy/i);
});

test('Terms page exports compliant metadata', () => {
  assert.ok(termsMetadata.title);
  assert.match(String(termsMetadata.title), /Terms of Service/i);
  assert.ok(termsMetadata.description);
  assert.match(String(termsMetadata.description), /terms/i);
});
