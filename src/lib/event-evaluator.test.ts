import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAccuracyRating,
  transformDbEventToRow,
  escapeCsvField,
  formatEventsAsCsv,
  isEventActiveOnDate,
  type RawDbEvent,
} from './event-evaluator';

test('calculateAccuracyRating returns High tier for well-formed geocoded event', () => {
  const result = calculateAccuracyRating({
    title: 'Puppet Show at Childrens Discovery Museum',
    startDate: '2026-10-03',
    startTime: '10:00',
    endTime: '11:30',
    location: '180 Woz Way, San Jose, CA',
    latitude: 37.329,
    longitude: -121.893,
    confidence: 0.95,
    rawCaption: 'Join us for a magical puppet show this Saturday at 10 AM!',
    feedbacks: [],
  });

  assert.equal(result.tier, 'High');
  assert.ok(result.score >= 85);
  assert.ok(result.ratingLabel.includes('High'));
  assert.equal(result.flags.length, 0);
});

test('calculateAccuracyRating penalizes missing location and broad location', () => {
  const missingLoc = calculateAccuracyRating({
    title: 'Free Storytime',
    startDate: '2026-10-03',
    location: '',
    confidence: 0.8,
  });
  assert.ok(missingLoc.flags.includes('missing-location'));
  assert.ok(missingLoc.score < 80);

  const broadLoc = calculateAccuracyRating({
    title: 'Fall Carnival',
    startDate: '2026-10-03',
    location: 'Bay Area',
    confidence: 0.8,
  });
  assert.ok(broadLoc.flags.includes('broad-location'));
});

test('calculateAccuracyRating heavily penalizes inaccurate feedback and non-event titles', () => {
  const badEvent = calculateAccuracyRating({
    title: 'Non-event',
    startDate: '2026-10-03',
    confidence: 1.0,
    feedbacks: [{ type: 'report_inaccurate' }],
  });

  assert.equal(badEvent.tier, 'Low');
  assert.ok(badEvent.flags.includes('suspicious-title'));
  assert.ok(badEvent.flags.includes('1-inaccurate-report'));
  assert.ok(badEvent.score < 50);
});

test('transformDbEventToRow maps database columns into calendar representation correctly', () => {
  const mockDbEvent: RawDbEvent = {
    id: 'evt-123',
    sourceId: 'src-1',
    source: {
      id: 'src-1',
      handle: 'bayareakids',
      name: 'Bay Area Kids',
    },
    rawPostUrl: 'https://instagram.com/p/test1234',
    rawCaption: 'Amazing fall weekend pumpkin patch!\nDetails below: 10am to 2pm.',
    title: 'Pumpkin Patch Fun',
    startDate: '2026-10-01',
    endDate: '2026-10-03',
    startTime: '10:00',
    endTime: '14:00',
    location: 'Half Moon Bay, CA',
    ageRange: '2-8 years',
    ageGroup: 'toddlers',
    category: 'festival',
    cost: '$10',
    isFree: false,
    registrationUrl: 'https://example.com/tickets',
    status: 'approved',
    confidence: 0.9,
    latitude: 37.4636,
    longitude: -122.4286,
    likes: 5,
    feedbacks: [],
  };

  const row = transformDbEventToRow(mockDbEvent);

  assert.equal(row.id, 'evt-123');
  assert.equal(row.title, 'Pumpkin Patch Fun');
  assert.equal(row.date, '2026-10-01 to 2026-10-03');
  assert.equal(row.time, '10:00 - 14:00');
  assert.equal(row.category, 'festival');
  assert.equal(row.cost, '$10');
  assert.equal(row.age_range, '2-8 years');
  assert.equal(row.location, 'Half Moon Bay, CA');
  assert.equal(row.source, '@bayareakids');
  assert.equal(row.original_link, 'https://instagram.com/p/test1234');
  assert.equal(row.registration_url, 'https://example.com/tickets');
  assert.ok(row.description.includes('Amazing fall weekend'));
  assert.ok(row.accuracy_rating.includes('High') || row.accuracy_rating.includes('Medium'));
});

test('escapeCsvField properly escapes commas, quotes, and newlines per RFC 4180', () => {
  assert.equal(escapeCsvField('Simple text'), 'Simple text');
  assert.equal(escapeCsvField('Title, with comma'), '"Title, with comma"');
  assert.equal(escapeCsvField('He said "Hello"'), '"He said ""Hello"""');
  assert.equal(escapeCsvField('Line 1\nLine 2'), '"Line 1\nLine 2"');
  assert.equal(escapeCsvField(null), '');
  assert.equal(escapeCsvField(undefined), '');
});

test('formatEventsAsCsv creates valid CSV string with headers and escaped content', () => {
  const rows = [
    {
      id: '1',
      title: 'Art Class, Kids',
      date: '2026-10-03',
      time: 'All day',
      category: 'arts',
      age_range: 'All ages',
      cost: 'Free',
      location: 'SF Library',
      description: 'Join us for fun "hands-on" crafts!\nAll welcome.',
      source: '@sflibrary',
      original_link: 'https://instagram.com/p/art',
      registration_url: '',
      accuracy_rating: 'High (95%)',
    },
  ];

  const csv = formatEventsAsCsv(rows);
  const lines = csv.split('\n');

  assert.equal(
    lines[0],
    'id,title,date,time,category,age_range,cost,location,description,source,original_link,registration_url,accuracy_rating'
  );
  assert.ok(csv.includes('"Art Class, Kids"'));
  assert.ok(csv.includes('""hands-on""'));
});

test('isEventActiveOnDate accurately determines single-day and multi-day coverage', () => {
  assert.equal(isEventActiveOnDate({ startDate: '2026-10-03' }, '2026-10-03'), true);
  assert.equal(isEventActiveOnDate({ startDate: '2026-10-02' }, '2026-10-03'), false);
  assert.equal(
    isEventActiveOnDate({ startDate: '2026-10-01', endDate: '2026-10-05' }, '2026-10-03'),
    true
  );
  assert.equal(
    isEventActiveOnDate({ startDate: '2026-10-04', endDate: '2026-10-10' }, '2026-10-03'),
    false
  );
  assert.equal(
    isEventActiveOnDate({ startDate: '2026-09-01', endDate: '2026-10-02' }, '2026-10-03'),
    false
  );
});
