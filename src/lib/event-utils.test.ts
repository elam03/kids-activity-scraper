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
  filterAdminEvents,
  getEventSourceInfo,
  calculateMultiSourceConfidence,
  getEventVerificationInfo,
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

test('filterAdminEvents hides past events by default and keeps ongoing multi-day events', () => {
  const refDate = '2026-10-15';
  const sampleEvents = [
    { id: '1', title: 'Past Single Day', startDate: '2026-10-10', endDate: null, status: 'approved' },
    { id: '2', title: 'Future Single Day', startDate: '2026-10-20', endDate: null, status: 'approved' },
    { id: '3', title: 'Today Single Day', startDate: '2026-10-15', endDate: null, status: 'approved' },
    { id: '4', title: 'Past Multi Day Ended', startDate: '2026-10-01', endDate: '2026-10-10', status: 'approved' },
    { id: '5', title: 'Ongoing Multi Day', startDate: '2026-10-01', endDate: '2026-10-20', status: 'approved' },
  ];

  // Default: showPastEvents = false
  const filtered = filterAdminEvents(sampleEvents, { referenceDate: refDate });
  assert.equal(filtered.length, 3);
  const titles = filtered.map((e) => e.title);
  assert.ok(titles.includes('Future Single Day'));
  assert.ok(titles.includes('Today Single Day'));
  assert.ok(titles.includes('Ongoing Multi Day'));
  assert.ok(!titles.includes('Past Single Day'));
  assert.ok(!titles.includes('Past Multi Day Ended'));
});

test('filterAdminEvents shows all events when showPastEvents is true', () => {
  const refDate = '2026-10-15';
  const sampleEvents = [
    { id: '1', title: 'Past Single Day', startDate: '2026-10-10', endDate: null, status: 'approved' },
    { id: '2', title: 'Future Single Day', startDate: '2026-10-20', endDate: null, status: 'approved' },
  ];

  const filtered = filterAdminEvents(sampleEvents, {
    referenceDate: refDate,
    showPastEvents: true,
  });
  assert.equal(filtered.length, 2);
});

test('filterAdminEvents combines past event filtering with status and category filters', () => {
  const refDate = '2026-10-15';
  const sampleEvents = [
    { id: '1', title: 'Active Sports', startDate: '2026-10-20', status: 'approved', category: 'sports' },
    { id: '2', title: 'Active Arts', startDate: '2026-10-20', status: 'approved', category: 'arts' },
    { id: '3', title: 'Past Sports', startDate: '2026-10-01', status: 'approved', category: 'sports' },
    { id: '4', title: 'Rejected Sports', startDate: '2026-10-20', status: 'rejected', category: 'sports' },
  ];

  // Sports only, approved only, active only
  const filtered = filterAdminEvents(sampleEvents, {
    referenceDate: refDate,
    filterMode: 'approved',
    categoryFilter: 'sports',
    showPastEvents: false,
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].title, 'Active Sports');
});

test('getEventSourceInfo extracts Instagram source information correctly', () => {
  const info = getEventSourceInfo({
    source: { handle: 'bayarea_toddlerexplorer', name: 'Bay Area Toddler Explorer' },
    rawPostUrl: 'https://www.instagram.com/p/C-12345/',
  });
  assert.equal(info.type, 'instagram');
  assert.equal(info.badge, 'Instagram');
  assert.equal(info.label, '@bayarea_toddlerexplorer');
  assert.equal(info.url, 'https://www.instagram.com/p/C-12345/');
  assert.equal(info.domain, 'instagram.com');
});

test('getEventSourceInfo extracts Web Submission information correctly', () => {
  const info = getEventSourceInfo({
    source: { handle: 'community_submissions', name: 'Community Submissions' },
    rawPostUrl: 'https://www.eventbrite.com/e/kids-stem-workshop-tickets-98765',
    submissionId: 'sub-123',
  });
  assert.equal(info.type, 'web_url');
  assert.equal(info.badge, 'Web URL');
  assert.equal(info.label, 'eventbrite.com');
  assert.equal(info.domain, 'eventbrite.com');
  assert.equal(info.url, 'https://www.eventbrite.com/e/kids-stem-workshop-tickets-98765');
});

test('getEventSourceInfo falls back gracefully when source or URL is missing', () => {
  const info = getEventSourceInfo({
    source: null,
    rawPostUrl: null,
  });
  assert.equal(info.type, 'other');
  assert.equal(info.badge, 'Source');
  assert.equal(info.label, 'Unknown');
  assert.equal(info.domain, null);
  assert.equal(info.url, null);
});

test('calculateMultiSourceConfidence boosts confidence based on source confirmations', () => {
  assert.equal(calculateMultiSourceConfidence(1, 0.85), 0.85);
  assert.equal(calculateMultiSourceConfidence(1, 0.95), 0.90, 'Single source confidence is capped at 0.90');
  assert.equal(calculateMultiSourceConfidence(2, 0.85), 0.95, '2 sources boosts confidence to 0.95');
  assert.equal(calculateMultiSourceConfidence(3, 0.80), 1.00, '3+ sources boosts confidence to 1.00');
  assert.equal(calculateMultiSourceConfidence(4, 0.90), 1.00);
});

test('getEventVerificationInfo calculates verification status and badges', () => {
  // Single source unverified
  const singleSourceEvent = {
    source: { handle: 'library_kids', name: 'Library' },
    rawPostUrl: 'https://instagram.com/p/story123',
    confidence: 0.85,
  };
  const singleInfo = getEventVerificationInfo(singleSourceEvent);
  assert.equal(singleInfo.isVerified, false);
  assert.equal(singleInfo.sourceCount, 1);
  assert.equal(singleInfo.badgeText, 'Single source');
  assert.equal(singleInfo.sources.length, 1);

  // Multi-source verified event (Instagram + Eventbrite)
  const multiSourceEvent = {
    confidence: 0.85,
    sources: [
      {
        rawPostUrl: 'https://instagram.com/p/harvest123',
        source: { handle: 'alamedafair', name: 'Alameda County Fair' },
        isPrimary: true,
      },
      {
        rawPostUrl: 'https://eventbrite.com/e/pleasanton-harvest-fest',
        source: { handle: 'community_submissions', name: 'Community Submissions' },
        submissionId: 'sub-456',
        isPrimary: false,
      },
    ],
  };
  const multiInfo = getEventVerificationInfo(multiSourceEvent);
  assert.equal(multiInfo.isVerified, true);
  assert.equal(multiInfo.sourceCount, 2);
  assert.equal(multiInfo.confidence, 0.95);
  assert.equal(multiInfo.badgeText, '✓ Verified (2 sources)');
  assert.equal(multiInfo.sources.length, 2);
  assert.equal(multiInfo.sources[0].badge, 'Instagram');
  assert.equal(multiInfo.sources[1].badge, 'Web URL');
});





