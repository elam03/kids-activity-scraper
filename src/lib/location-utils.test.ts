import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDistanceMiles,
  formatDistanceMiles,
  getDirectionsUrl,
  getEffectiveCoords,
} from './location-utils';

test('calculateDistanceMiles computes distance between two coordinates', () => {
  // San Jose (37.3387, -121.8853) to Santa Clara (37.3541, -121.9552) is ~4.0 miles
  const distance = calculateDistanceMiles(37.3387, -121.8853, 37.3541, -121.9552);
  assert.ok(distance > 3.5 && distance < 4.5, `Expected ~4.0 miles, got ${distance}`);
});

test('calculateDistanceMiles returns 0 for identical coordinates', () => {
  const distance = calculateDistanceMiles(37.3387, -121.8853, 37.3387, -121.8853);
  assert.equal(distance, 0);
});

test('formatDistanceMiles formats distances nicely', () => {
  assert.equal(formatDistanceMiles(0.24), '0.2 mi');
  assert.equal(formatDistanceMiles(1.56), '1.6 mi');
  assert.equal(formatDistanceMiles(12.04), '12 mi');
});

test('getDirectionsUrl generates Google Maps directions or search URL', () => {
  const urlWithCoords = getDirectionsUrl('Discovery Museum', { lat: 37.33, lng: -121.89 });
  assert.match(urlWithCoords, /google\.com\/maps\/dir/);
  assert.match(urlWithCoords, /37\.33,-121\.89/);

  const urlWithLocationOnly = getDirectionsUrl('180 Woz Way, San Jose, CA');
  assert.match(urlWithLocationOnly, /google\.com\/maps\/dir/);
  assert.match(urlWithLocationOnly, /180%20Woz%20Way/);
});

test('getEffectiveCoords extracts valid coordinates and rejects null/undefined/NaN', () => {
  assert.deepEqual(getEffectiveCoords({ latitude: 37.33, longitude: -121.89 }), {
    lat: 37.33,
    lng: -121.89,
  });

  assert.equal(getEffectiveCoords({ latitude: null, longitude: -121.89 }), null);
  assert.equal(getEffectiveCoords({ latitude: undefined, longitude: undefined }), null);
  assert.equal(getEffectiveCoords({ latitude: NaN, longitude: -121.89 }), null);
  assert.equal(getEffectiveCoords(null), null);
});
