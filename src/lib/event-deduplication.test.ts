import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEventTitle,
  computeTitleSimilarity,
  isDuplicateCandidate,
  mergeEventMetadata,
  findDuplicateEvent,
} from './event-deduplication';

test('normalizeEventTitle cleans, lowercases, removes punctuation, stop words, and emojis', () => {
  assert.equal(
    normalizeEventTitle('🎃 Annual Fall Pumpkin Patch & Festival at the Park!'),
    'annual fall pumpkin patch festival park'
  );
  assert.equal(
    normalizeEventTitle('Storytime: Music, Movement & Bubbles (Ages 1-3)'),
    'storytime music movement bubbles ages 1 3'
  );
  assert.equal(normalizeEventTitle(''), '');
});

test('computeTitleSimilarity scores identical and rearranged titles highly', () => {
  const sim1 = computeTitleSimilarity(
    'Preschool Storytime at Central Library',
    'Central Library Preschool Storytime'
  );
  assert.ok(sim1 >= 0.80, `Expected similarity >= 0.80, got ${sim1}`);

  const sim2 = computeTitleSimilarity(
    'Halloween Trunk or Treat Extravaganza',
    'Halloween Trunk or Treat Extravaganza'
  );
  assert.equal(sim2, 1.0);

  const simDifferent = computeTitleSimilarity(
    'Toddler Gym & Sensory Play',
    'Teens Coding Robotics Workshop'
  );
  assert.ok(simDifferent < 0.25, `Expected low similarity, got ${simDifferent}`);
});

test('isDuplicateCandidate matches events with identical date and high title similarity', () => {
  const existing = {
    id: 'evt-1',
    title: 'Halloween Pumpkin Patch & Corn Maze',
    startDate: '2026-10-24',
    location: 'Ardenwood Historic Farm',
    latitude: 37.558,
    longitude: -122.046,
  };

  const incoming = {
    title: 'Pumpkin Patch and Corn Maze at Ardenwood',
    startDate: '2026-10-24',
    location: 'Ardenwood Historic Farm, Fremont',
    latitude: 37.559,
    longitude: -122.045,
  };

  const result = isDuplicateCandidate(existing, incoming);
  assert.equal(result.isMatch, true);
  assert.ok(result.confidence >= 0.85);
});

test('isDuplicateCandidate rejects events on different start dates', () => {
  const existing = {
    id: 'evt-1',
    title: 'Toddler Storytime',
    startDate: '2026-10-15',
  };

  const incoming = {
    title: 'Toddler Storytime',
    startDate: '2026-10-22',
  };

  const result = isDuplicateCandidate(existing, incoming);
  assert.equal(result.isMatch, false);
  assert.equal(result.reason, 'different_start_date');
});

test('isDuplicateCandidate rejects identical title if coordinates are far apart', () => {
  const existing = {
    id: 'evt-1',
    title: 'Toddler Storytime & Songs',
    startDate: '2026-10-20',
    latitude: 37.7749, // San Francisco
    longitude: -122.4194,
  };

  const incoming = {
    title: 'Toddler Storytime & Songs',
    startDate: '2026-10-20',
    latitude: 37.3382, // San Jose (~40+ miles away)
    longitude: -121.8863,
  };

  const result = isDuplicateCandidate(existing, incoming);
  assert.equal(result.isMatch, false);
  assert.equal(result.reason, 'location_too_far');
});

test('mergeEventMetadata non-destructively backfills missing fields', () => {
  const existing = {
    id: 'evt-1',
    title: 'Community STEM Fair',
    startDate: '2026-11-05',
    startTime: null,
    endTime: null,
    location: 'Civic Center Library',
    cost: 'Free',
    isFree: true,
    registrationUrl: null,
    latitude: null,
    longitude: null,
  };

  const incoming = {
    title: 'Annual Community STEM Fair',
    startDate: '2026-11-05',
    startTime: '10:00',
    endTime: '14:00',
    location: 'Civic Center Library, 100 Main St',
    registrationUrl: 'https://example.com/register',
    latitude: 37.78,
    longitude: -122.41,
  };

  const patch = mergeEventMetadata(existing, incoming);
  assert.equal(patch.startTime, '10:00');
  assert.equal(patch.endTime, '14:00');
  assert.equal(patch.registrationUrl, 'https://example.com/register');
  assert.equal(patch.latitude, 37.78);
  assert.equal(patch.longitude, -122.41);
  assert.equal(patch.location, 'Civic Center Library, 100 Main St');
});

test('findDuplicateEvent returns the highest scoring candidate above threshold', () => {
  const candidates = [
    { id: '1', title: 'Toddler Music Jam', startDate: '2026-10-25' },
    { id: '2', title: 'Halloween Carnival & Parade', startDate: '2026-10-25' },
    { id: '3', title: 'Puppet Show', startDate: '2026-10-25' },
  ];

  const incoming = {
    title: 'Halloween Carnival & Parade in Downtown',
    startDate: '2026-10-25',
  };

  const match = findDuplicateEvent(candidates, incoming);
  assert.ok(match !== null);
  assert.equal(match.candidate.id, '2');
  assert.ok(match.confidence >= 0.80);
});

test('findDuplicateEvent returns null when no candidate meets similarity threshold', () => {
  const candidates = [
    { id: '1', title: 'Nature Walk for Tots', startDate: '2026-10-25' },
    { id: '2', title: 'Cooking with Kids', startDate: '2026-10-25' },
  ];

  const incoming = {
    title: 'Halloween Robotics Workshop',
    startDate: '2026-10-25',
  };

  const match = findDuplicateEvent(candidates, incoming);
  assert.equal(match, null);
});
