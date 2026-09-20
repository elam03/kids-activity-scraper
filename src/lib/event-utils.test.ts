import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isNeedsReview,
  matchesAgeGroup,
  toggleAgeGroup,
  isPastEvent,
  buildPastEventsPruneWhere,
  isEscapeKey,
  KOFI_DONATION_URL,
  isValidGaMeasurementId,
  DEFAULT_GA_MEASUREMENT_ID,
  resolveGaMeasurementId,
  ensureHttps,
  getSecurityHeaders,
} from './event-utils';

test('isNeedsReview returns false for rejected events regardless of confidence or missing fields', () => {
  const rejectedEvent = {
    id: '1',
    status: 'rejected',
    confidence: 0.2,
    location: null,
    startDate: '',
  };
  assert.equal(isNeedsReview(rejectedEvent), false);
});

test('isNeedsReview returns true for pending events', () => {
  const pendingEvent = {
    id: '2',
    status: 'pending',
    confidence: 0.95,
    location: 'San Jose',
    startDate: '2026-09-20',
  };
  assert.equal(isNeedsReview(pendingEvent), true);
});

test('isNeedsReview returns true for approved events with low confidence (< 0.8)', () => {
  const lowConfEvent = {
    id: '3',
    status: 'approved',
    confidence: 0.65,
    location: 'Santa Clara',
    startDate: '2026-09-20',
  };
  assert.equal(isNeedsReview(lowConfEvent), true);
});

test('isNeedsReview returns true for approved events missing location or start date', () => {
  const missingLocationEvent = {
    id: '4',
    status: 'approved',
    confidence: 0.9,
    location: null,
    startDate: '2026-09-20',
  };
  assert.equal(isNeedsReview(missingLocationEvent), true);

  const missingDateEvent = {
    id: '5',
    status: 'approved',
    confidence: 0.9,
    location: 'Sunnyvale',
    startDate: '',
  };
  assert.equal(isNeedsReview(missingDateEvent), true);
});

test('isNeedsReview returns false for approved events with high confidence and valid fields', () => {
  const validApprovedEvent = {
    id: '6',
    status: 'approved',
    confidence: 0.95,
    location: 'San Jose, CA',
    startDate: '2026-09-20',
  };
  assert.equal(isNeedsReview(validApprovedEvent), false);
});

test('isNeedsReview returns true for approved events with 1+ report via _count.feedbacks or feedbacks array', () => {
  const reportedEventWithCount = {
    id: '7',
    status: 'approved',
    confidence: 0.95,
    location: 'San Jose, CA',
    startDate: '2026-09-20',
    _count: { feedbacks: 2 },
  };
  assert.equal(isNeedsReview(reportedEventWithCount), true);

  const reportedEventWithArray = {
    id: '8',
    status: 'approved',
    confidence: 0.95,
    location: 'San Jose, CA',
    startDate: '2026-09-20',
    feedbacks: [{ id: 'fb1', reason: 'cancelled' }],
  };
  assert.equal(isNeedsReview(reportedEventWithArray), true);
});

test('isNeedsReview returns false for rejected events even if they have reports', () => {
  const rejectedEventWithReports = {
    id: '9',
    status: 'rejected',
    confidence: 0.95,
    location: 'San Jose, CA',
    startDate: '2026-09-20',
    _count: { feedbacks: 3 },
    feedbacks: [{ id: 'fb2' }],
  };
  assert.equal(isNeedsReview(rejectedEventWithReports), false);
});

test('matchesAgeGroup returns true when selected age groups is empty or contains all', () => {
  assert.equal(matchesAgeGroup('toddlers', []), true);
  assert.equal(matchesAgeGroup('toddlers', ['all']), true);
  assert.equal(matchesAgeGroup('all', ['all']), true);
  assert.equal(matchesAgeGroup(null, ['all']), true);
  assert.equal(matchesAgeGroup(undefined, []), true);
  assert.equal(matchesAgeGroup('toddlers', new Set(['all'])), true);
  assert.equal(matchesAgeGroup('toddlers', new Set([])), true);
});

test('matchesAgeGroup matches when event ageGroup is in selected age groups', () => {
  assert.equal(matchesAgeGroup('toddlers', ['toddlers', 'kids']), true);
  assert.equal(matchesAgeGroup('kids', ['toddlers', 'kids']), true);
  assert.equal(matchesAgeGroup('infants', ['toddlers', 'kids']), false);
  assert.equal(matchesAgeGroup('teens', ['toddlers', 'kids']), false);
  assert.equal(matchesAgeGroup('toddlers', new Set(['toddlers', 'preschoolers'])), true);
  assert.equal(matchesAgeGroup('teens', new Set(['toddlers', 'preschoolers'])), false);
});

test('matchesAgeGroup handles comma or slash separated event age groups', () => {
  assert.equal(matchesAgeGroup('toddlers, preschoolers', ['toddlers']), true);
  assert.equal(matchesAgeGroup('toddlers / preschoolers', ['preschoolers']), true);
  assert.equal(matchesAgeGroup('toddlers, preschoolers', ['teens']), false);
});

test('matchesAgeGroup handles null or undefined event ageGroup with specific filters', () => {
  assert.equal(matchesAgeGroup(null, ['toddlers']), false);
  assert.equal(matchesAgeGroup(undefined, ['toddlers', 'kids']), false);
});

test('toggleAgeGroup switches from all to the clicked age group', () => {
  const result = toggleAgeGroup(['all'], 'toddlers');
  assert.deepEqual(result, ['toddlers']);
});

test('toggleAgeGroup adds an unselected age group to existing selections', () => {
  const result = toggleAgeGroup(['toddlers'], 'kids');
  assert.deepEqual(result, ['toddlers', 'kids']);
});

test('toggleAgeGroup removes an active age group when clicked', () => {
  const result = toggleAgeGroup(['toddlers', 'kids'], 'toddlers');
  assert.deepEqual(result, ['kids']);
});

test('toggleAgeGroup resets to all when last active age group is deselected', () => {
  const result = toggleAgeGroup(['toddlers'], 'toddlers');
  assert.deepEqual(result, ['all']);
});

test('toggleAgeGroup resets to all when all is selected', () => {
  const result = toggleAgeGroup(['toddlers', 'kids'], 'all');
  assert.deepEqual(result, ['all']);
});

test('toggleAgeGroup handles empty initial selections gracefully', () => {
  assert.deepEqual(toggleAgeGroup([], 'toddlers'), ['toddlers']);
  assert.deepEqual(toggleAgeGroup([], 'all'), ['all']);
});

test('isPastEvent correctly classifies past vs active single-day and multi-day events', () => {
  const today = '2026-09-12';

  // Single-day past event
  assert.equal(isPastEvent({ startDate: '2026-09-10', endDate: null }, today), true);

  // Single-day today event (not past)
  assert.equal(isPastEvent({ startDate: '2026-09-12', endDate: null }, today), false);

  // Single-day future event (not past)
  assert.equal(isPastEvent({ startDate: '2026-09-15', endDate: null }, today), false);

  // Multi-day past event (endDate in past)
  assert.equal(isPastEvent({ startDate: '2026-09-01', endDate: '2026-09-10' }, today), true);

  // Multi-day active event (startDate in past, but endDate is in the future or today)
  assert.equal(isPastEvent({ startDate: '2026-09-01', endDate: '2026-09-15' }, today), false);
  assert.equal(isPastEvent({ startDate: '2026-09-10', endDate: '2026-09-12' }, today), false);
});

test('buildPastEventsPruneWhere constructs valid Prisma query filter for past events', () => {
  const where = buildPastEventsPruneWhere('2026-09-12');
  assert.deepEqual(where, {
    OR: [
      {
        endDate: { not: null, lt: '2026-09-12' },
      },
      {
        endDate: null,
        startDate: { lt: '2026-09-12' },
      },
    ],
  });
});

test('isEscapeKey correctly identifies Escape key events for dismissing modal', () => {
  assert.equal(isEscapeKey({ key: 'Escape' }), true);
  assert.equal(isEscapeKey({ key: 'Esc' }), true);
  assert.equal(isEscapeKey({ key: 'Enter' }), false);
  assert.equal(isEscapeKey({ key: 'Tab' }), false);
});

test('KOFI_DONATION_URL contains valid https Ko-fi URL for creator', () => {
  assert.equal(KOFI_DONATION_URL, 'https://ko-fi.com/elam03');
  assert.match(KOFI_DONATION_URL, /^https:\/\/ko-fi\.com\/[a-zA-Z0-9_-]+$/);
});

test('isValidGaMeasurementId validates GA4 measurement IDs correctly', () => {
  // Valid GA4 IDs
  assert.equal(isValidGaMeasurementId('G-ABC123XYZ'), true);
  assert.equal(isValidGaMeasurementId('G-1234567890'), true);
  assert.equal(isValidGaMeasurementId('g-lowercase123'), true);
  assert.equal(isValidGaMeasurementId('  G-TRIMMED123  '), true);

  // Invalid IDs
  assert.equal(isValidGaMeasurementId(''), false);
  assert.equal(isValidGaMeasurementId('   '), false);
  assert.equal(isValidGaMeasurementId(undefined), false);
  assert.equal(isValidGaMeasurementId(null), false);
  assert.equal(isValidGaMeasurementId('UA-12345678-1'), false);
  assert.equal(isValidGaMeasurementId('G-'), false);
  assert.equal(isValidGaMeasurementId('G'), false);
  assert.equal(isValidGaMeasurementId('random-string'), false);
  assert.equal(isValidGaMeasurementId('G-INVALID!CHAR'), false);
});

test('DEFAULT_GA_MEASUREMENT_ID is configured with valid G-P4ZPYFWRLK tag', () => {
  assert.equal(DEFAULT_GA_MEASUREMENT_ID, 'G-P4ZPYFWRLK');
  assert.equal(isValidGaMeasurementId(DEFAULT_GA_MEASUREMENT_ID), true);
});

test('resolveGaMeasurementId resolves configured ID or falls back to default safely', () => {
  // Falls back to default when undefined or empty
  assert.equal(resolveGaMeasurementId(undefined), 'G-P4ZPYFWRLK');
  assert.equal(resolveGaMeasurementId(null), 'G-P4ZPYFWRLK');
  assert.equal(resolveGaMeasurementId(''), 'G-P4ZPYFWRLK');
  assert.equal(resolveGaMeasurementId('   '), 'G-P4ZPYFWRLK');

  // Custom valid measurement ID overrides default
  assert.equal(resolveGaMeasurementId('G-CUSTOM999'), 'G-CUSTOM999');
  assert.equal(resolveGaMeasurementId('  G-CUSTOM999  '), 'G-CUSTOM999');

  // Invalid configured ID returns null to prevent script injection or broken tags
  assert.equal(resolveGaMeasurementId('invalid-measurement-id'), null);
  assert.equal(resolveGaMeasurementId('UA-12345-1'), null);
});

test('ensureHttps upgrades http URLs to secure https', () => {
  assert.equal(ensureHttps('http://www.littledaysout.com'), 'https://www.littledaysout.com');
  assert.equal(ensureHttps('http://littledaysout.com/events'), 'https://littledaysout.com/events');
  assert.equal(ensureHttps('https://www.littledaysout.com'), 'https://www.littledaysout.com');
  assert.equal(ensureHttps(''), '');
});

test('getSecurityHeaders returns HSTS, nosniff, and anti-clickjacking headers', () => {
  const headers = getSecurityHeaders();
  const headerMap = Object.fromEntries(headers.map((h) => [h.key, h.value]));

  assert.match(headerMap['Strict-Transport-Security'], /max-age=\d+/);
  assert.match(headerMap['Strict-Transport-Security'], /includeSubDomains/);
  assert.equal(headerMap['X-Content-Type-Options'], 'nosniff');
  assert.equal(headerMap['X-Frame-Options'], 'SAMEORIGIN');
  assert.equal(headerMap['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.equal(headerMap['Permissions-Policy'], 'camera=(), microphone=(), geolocation=(self)');
  assert.equal(headerMap['X-XSS-Protection'], '1; mode=block');
});





