import test from 'node:test';
import assert from 'node:assert/strict';
import { isNeedsReview } from './event-utils';

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
