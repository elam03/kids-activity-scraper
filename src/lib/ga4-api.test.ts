import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isGa4Configured,
  normalizePrivateKey,
  parseGa4ReportRows,
  formatEngagementRate,
  formatDurationSeconds,
  getGa4CredentialsSummary,
} from './ga4-api';

test('GA4 API - isGa4Configured returns false when environment variables are missing', () => {
  const origProp = process.env.GA4_PROPERTY_ID;
  const origEmail = process.env.GA4_CLIENT_EMAIL;
  const origKey = process.env.GA4_PRIVATE_KEY;
  const origJson = process.env.GA4_CREDENTIALS_JSON;
  const origAppCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  try {
    delete process.env.GA4_PROPERTY_ID;
    delete process.env.GA4_CLIENT_EMAIL;
    delete process.env.GA4_PRIVATE_KEY;
    delete process.env.GA4_CREDENTIALS_JSON;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

    assert.equal(isGa4Configured(), false);

    const summary = getGa4CredentialsSummary();
    assert.equal(summary.configured, false);
    assert.equal(summary.hasPropertyId, false);
    assert.equal(summary.hasCredentials, false);
  } finally {
    if (origProp) process.env.GA4_PROPERTY_ID = origProp;
    if (origEmail) process.env.GA4_CLIENT_EMAIL = origEmail;
    if (origKey) process.env.GA4_PRIVATE_KEY = origKey;
    if (origJson) process.env.GA4_CREDENTIALS_JSON = origJson;
    if (origAppCreds) process.env.GOOGLE_APPLICATION_CREDENTIALS = origAppCreds;
  }
});

test('GA4 API - isGa4Configured returns true when property ID and email/key are provided', () => {
  const origProp = process.env.GA4_PROPERTY_ID;
  const origEmail = process.env.GA4_CLIENT_EMAIL;
  const origKey = process.env.GA4_PRIVATE_KEY;

  try {
    process.env.GA4_PROPERTY_ID = '123456789';
    process.env.GA4_CLIENT_EMAIL = 'test@project.iam.gserviceaccount.com';
    process.env.GA4_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nMIIEvgIBA...\\n-----END PRIVATE KEY-----\\n';

    assert.equal(isGa4Configured(), true);

    const summary = getGa4CredentialsSummary();
    assert.equal(summary.configured, true);
    assert.equal(summary.propertyId, '123456789');
    assert.equal(summary.clientEmail, 'test@project.iam.gserviceaccount.com');
  } finally {
    if (origProp) process.env.GA4_PROPERTY_ID = origProp; else delete process.env.GA4_PROPERTY_ID;
    if (origEmail) process.env.GA4_CLIENT_EMAIL = origEmail; else delete process.env.GA4_CLIENT_EMAIL;
    if (origKey) process.env.GA4_PRIVATE_KEY = origKey; else delete process.env.GA4_PRIVATE_KEY;
  }
});

test('GA4 API - normalizePrivateKey handles literal newlines and escaped newlines', () => {
  const escaped = '-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgk...\\n-----END PRIVATE KEY-----\\n';
  const normalized = normalizePrivateKey(escaped);
  assert.ok(normalized.includes('\n'), 'Must convert escaped \\n to real newlines');
  assert.ok(!normalized.includes('\\n'), 'Must not contain remaining backslash-n sequences');

  // If already normalized, keep as-is
  const alreadyNormal = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk...\n-----END PRIVATE KEY-----\n';
  assert.equal(normalizePrivateKey(alreadyNormal), alreadyNormal);
});

test('GA4 API - parseGa4ReportRows maps raw API dimension and metric rows to clean objects', () => {
  const mockResponse = {
    dimensionHeaders: [{ name: 'pagePath' }, { name: 'pageTitle' }],
    metricHeaders: [{ name: 'screenPageViews', type: 'TYPE_INTEGER' }, { name: 'activeUsers', type: 'TYPE_INTEGER' }],
    rows: [
      {
        dimensionValues: [{ value: '/free-this-weekend' }, { value: 'Free This Weekend | Little Days Out' }],
        metricValues: [{ value: '450' }, { value: '312' }],
      },
      {
        dimensionValues: [{ value: '/' }, { value: 'Kids Calendar Bay Area' }],
        metricValues: [{ value: '1200' }, { value: '890' }],
      },
    ],
  };

  const parsed = parseGa4ReportRows(mockResponse as any);
  assert.equal(parsed.length, 2);
  assert.deepEqual(parsed[0], {
    pagePath: '/free-this-weekend',
    pageTitle: 'Free This Weekend | Little Days Out',
    screenPageViews: 450,
    activeUsers: 312,
  });
  assert.deepEqual(parsed[1], {
    pagePath: '/',
    pageTitle: 'Kids Calendar Bay Area',
    screenPageViews: 1200,
    activeUsers: 890,
  });
});

test('GA4 API - formatEngagementRate and formatDurationSeconds format human-readable outputs', () => {
  assert.equal(formatEngagementRate(0.684), '68.4%');
  assert.equal(formatEngagementRate('0.725'), '72.5%');
  assert.equal(formatEngagementRate(0), '0.0%');

  assert.equal(formatDurationSeconds(45), '45s');
  assert.equal(formatDurationSeconds(125), '2m 5s');
  assert.equal(formatDurationSeconds(3665), '1h 1m 5s');
});
