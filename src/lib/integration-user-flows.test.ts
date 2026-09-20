import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatLocalDate,
  filterCalendarEvents,
  isMultiDayEvent,
  calculateNextPivotDate,
  handleModalEscapeKey,
  getSingleDayEventsForDate,
  isMultiDayActiveInRange,
  type CalendarEvent,
} from './calendar-query';
import {
  validateFeedbackPayload,
  toggleLikedEventId,
  hasInaccurateReports,
} from './feedback-utils';
import {
  toggleAgeGroup,
  isNeedsReview,
  ensureHttps,
} from './event-utils';
import {
  calculateDistanceMiles,
  formatDistanceMiles,
  getDirectionsUrl,
  getEffectiveCoords,
} from './location-utils';
import { sanitizeText } from './security-utils';

test('Integration Flow 1: User filters calendar by multiple age groups, navigates months, and handles modal dismissals', () => {
  const mockEvents = [
    {
      id: 'ev-1',
      title: 'Toddler Music & Movement',
      startDate: '2026-10-05',
      category: 'music',
      ageGroup: 'toddlers',
    },
    {
      id: 'ev-2',
      title: 'Preschool Nature Exploration',
      startDate: '2026-10-05',
      endDate: '2026-10-07',
      category: 'outdoors',
      ageGroup: 'preschoolers',
    },
    {
      id: 'ev-3',
      title: 'Teen Robotics Workshop',
      startDate: '2026-10-06',
      category: 'stem',
      ageGroup: 'teens',
    },
    {
      id: 'ev-4',
      title: 'Family Autumn Farm Days',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      category: 'outdoors',
      ageGroup: 'toddlers, preschoolers, kids',
    },
  ] as unknown as CalendarEvent[];

  // Step 1: User toggles age groups: starts at 'all', clicks 'toddlers', then adds 'preschoolers'
  let activeAges = ['all'];
  activeAges = toggleAgeGroup(activeAges, 'toddlers');
  assert.deepEqual(activeAges, ['toddlers']);

  activeAges = toggleAgeGroup(activeAges, 'preschoolers');
  assert.deepEqual(activeAges, ['toddlers', 'preschoolers']);

  // Step 2: Filter calendar by selected age groups without category filter
  const filteredEvents = filterCalendarEvents(mockEvents, { ageGroups: activeAges, category: 'all' });
  const filteredIds = filteredEvents.map((e) => e.id);
  assert.ok(filteredIds.includes('ev-1'), 'Includes toddler event');
  assert.ok(filteredIds.includes('ev-2'), 'Includes preschooler event');
  assert.ok(filteredIds.includes('ev-4'), 'Includes all-ages event');
  assert.equal(filteredIds.includes('ev-3'), false, 'Excludes teen event');

  // Step 3: User filters further by category 'outdoors'
  const outdoorEvents = filterCalendarEvents(mockEvents, { ageGroups: activeAges, category: 'outdoors' });
  const outdoorIds = outdoorEvents.map((e) => e.id);
  assert.equal(outdoorIds.includes('ev-1'), false, 'Music event filtered out');
  assert.ok(outdoorIds.includes('ev-2'), 'Preschool outdoors included');
  assert.ok(outdoorIds.includes('ev-4'), 'Family outdoors included');

  // Step 4: Month navigation (user steps forward one month from 2026-10-01)
  const nextMonth = calculateNextPivotDate(new Date(2026, 9, 1), 'month', 1);
  assert.equal(formatLocalDate(nextMonth), '2026-11-01');

  // Step 5: Day inspection on 2026-10-05
  const singleDayEvents = getSingleDayEventsForDate(
    new Date(2026, 9, 5),
    filteredEvents.filter((e) => !isMultiDayEvent(e))
  );
  assert.equal(singleDayEvents.length, 1);
  assert.equal(singleDayEvents[0].id, 'ev-1');

  const multiDayActive = isMultiDayActiveInRange(mockEvents[1], new Date(2026, 9, 5), new Date(2026, 9, 5));
  assert.equal(multiDayActive, true, 'Multi-day event is active on 2026-10-05');

  // Step 6: Modal Escape hierarchy: when both day modal and event detail modal are open,
  // pressing Escape closes the event detail modal first, keeping the day modal open.
  let modalState = {
    selectedEvent: mockEvents[0],
    selectedDateForDetails: new Date(2026, 9, 5),
  };

  const escapeResult1 = handleModalEscapeKey(modalState);
  assert.equal(escapeResult1.selectedEvent, null);
  assert.notEqual(escapeResult1.selectedDateForDetails, null);

  // Pressing Escape a second time closes the day modal
  const escapeResult2 = handleModalEscapeKey(escapeResult1);
  assert.equal(escapeResult2.selectedEvent, null);
  assert.equal(escapeResult2.selectedDateForDetails, null);
});

test('Integration Flow 2: User likes/unlikes, reports inaccurate event, and triggers admin review pipeline', () => {
  // Step 1: User clicks like on an event
  let likedEventIds: string[] = [];
  likedEventIds = toggleLikedEventId(likedEventIds, 'ev-100');
  assert.deepEqual(likedEventIds, ['ev-100']);

  // User clicks like again -> unlikes
  likedEventIds = toggleLikedEventId(likedEventIds, 'ev-100');
  assert.deepEqual(likedEventIds, []);

  // Step 2: User submits a report with malicious script injection attempt
  const untrustedReportPayload = {
    eventId: 'ev-100',
    type: 'report_inaccurate',
    reason: 'wrong_location',
    comment: '   <script>alert("hack")</script>The venue moved to Central Park!   ',
  };

  const validation = validateFeedbackPayload(untrustedReportPayload);
  assert.equal(validation.valid, true);

  const sanitizedComment = sanitizeText(untrustedReportPayload.comment, 500);
  assert.equal(sanitizedComment.includes('<script>'), false);
  assert.equal(sanitizedComment, 'The venue moved to Central Park!');

  // Step 3: Event in DB now has 1 report
  const eventRecord = {
    id: 'ev-100',
    status: 'approved',
    confidence: 0.95,
    location: '123 Main St, San Jose, CA',
    startDate: '2026-10-15',
    _count: {
      feedbacks: 1,
    },
  };

  // Step 4: System detects report and automatically transitions event into "Needs Review"
  assert.equal(hasInaccurateReports(eventRecord), true);
  assert.equal(
    isNeedsReview(eventRecord),
    true,
    'Event with community reports must appear in Needs Review queue regardless of high confidence'
  );
});

test('Integration Flow 3: User geolocation resolution, distance calculation, and directions generation', () => {
  // User coordinates (e.g., Mountain View, CA)
  const userLat = 37.3861;
  const userLng = -122.0839;

  // Candidate events
  const events = [
    {
      id: 'ev-near',
      title: 'Palo Alto Junior Museum & Zoo',
      latitude: 37.4444,
      longitude: -122.1388,
      location: '1451 Middlefield Rd, Palo Alto, CA',
    },
    {
      id: 'ev-far',
      title: 'San Francisco Childrens Creativity Museum',
      latitude: 37.7825,
      longitude: -122.4018,
      location: '221 4th St, San Francisco, CA',
    },
    {
      id: 'ev-no-coords',
      title: 'Online Story Hour',
      latitude: null,
      longitude: null,
      location: 'Virtual',
    },
  ];

  // Step 1: Distance calculation and radius filtering (within 10 miles)
  const nearbyEvents = events
    .map((e) => {
      const coords = getEffectiveCoords(e);
      if (!coords) return null;
      const distance = calculateDistanceMiles(userLat, userLng, coords.lat, coords.lng);
      return { ...e, distance };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null && e.distance <= 10);

  assert.equal(nearbyEvents.length, 1);
  assert.equal(nearbyEvents[0].id, 'ev-near');
  assert.ok(nearbyEvents[0].distance < 6); // Palo Alto is ~5 miles from Mountain View
  assert.match(formatDistanceMiles(nearbyEvents[0].distance), /\d+\.\d+\s*mi/);

  // Step 2: Generate Google Maps directions link
  const directionsUrl = getDirectionsUrl(
    nearbyEvents[0].location,
    { lat: nearbyEvents[0].latitude!, lng: nearbyEvents[0].longitude! }
  );

  assert.ok(directionsUrl.startsWith('https://www.google.com/maps/dir/'));
  assert.match(directionsUrl, /destination=37\.4444,-122\.1388/);
  assert.equal(ensureHttps(directionsUrl), directionsUrl);
});
