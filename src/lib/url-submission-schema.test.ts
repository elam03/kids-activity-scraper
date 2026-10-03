import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSubmissionUrl,
  isValidSubmissionUrl,
  SUBMISSION_STATUSES,
  type SubmissionStatus,
} from './url-submission-schema';

test('normalizeSubmissionUrl strips tracking parameters and trailing slashes', () => {
  const url1 = 'https://www.instagram.com/p/ABC123xyz/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==';
  assert.equal(
    normalizeSubmissionUrl(url1),
    'https://www.instagram.com/p/ABC123xyz'
  );

  const url2 = 'https://eventbrite.com/e/kids-stem-workshop-12345/?fbclid=IwAR123&aff=ebdssbdestsearch/';
  assert.equal(
    normalizeSubmissionUrl(url2),
    'https://eventbrite.com/e/kids-stem-workshop-12345'
  );

  const url3 = 'http://example.com/events/fall-fair///';
  assert.equal(
    normalizeSubmissionUrl(url3),
    'http://example.com/events/fall-fair'
  );
});

test('isValidSubmissionUrl accepts valid http/https URLs and rejects invalid or non-http protocols', () => {
  assert.equal(isValidSubmissionUrl('https://instagram.com/p/123'), true);
  assert.equal(isValidSubmissionUrl('http://sflibrary.org/events/storytime'), true);
  assert.equal(isValidSubmissionUrl('not-a-url'), false);
  assert.equal(isValidSubmissionUrl('ftp://example.com/event'), false);
  assert.equal(isValidSubmissionUrl('javascript:alert(1)'), false);
});

test('SUBMISSION_STATUSES defines all valid queue lifecycle states', () => {
  assert.ok(SUBMISSION_STATUSES.includes('pending'));
  assert.ok(SUBMISSION_STATUSES.includes('processing'));
  assert.ok(SUBMISSION_STATUSES.includes('completed'));
  assert.ok(SUBMISSION_STATUSES.includes('failed'));
  assert.equal(SUBMISSION_STATUSES.length, 4);
});
