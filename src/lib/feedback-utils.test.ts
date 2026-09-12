import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateFeedbackPayload,
  getReportReasonLabel,
  toggleLikedEventId,
  hasInaccurateReports,
  REPORT_REASONS,
} from './feedback-utils';

test('validateFeedbackPayload validates valid like and unlike requests', () => {
  assert.deepEqual(validateFeedbackPayload({ eventId: 'ev-123', type: 'like' }), {
    valid: true,
  });

  assert.deepEqual(validateFeedbackPayload({ eventId: 'ev-123', type: 'unlike' }), {
    valid: true,
  });
});

test('validateFeedbackPayload rejects invalid eventId or unknown type', () => {
  assert.equal(validateFeedbackPayload({ eventId: '', type: 'like' }).valid, false);
  assert.equal(validateFeedbackPayload({ eventId: 'ev-1', type: 'invalid_type' }).valid, false);
  assert.equal(validateFeedbackPayload(null).valid, false);
});

test('validateFeedbackPayload validates report_inaccurate with valid reason', () => {
  assert.deepEqual(
    validateFeedbackPayload({
      eventId: 'ev-123',
      type: 'report_inaccurate',
      reason: 'wrong_location',
      comment: 'The venue moved to San Pedro Square',
    }),
    { valid: true }
  );

  assert.equal(
    validateFeedbackPayload({
      eventId: 'ev-123',
      type: 'report_inaccurate',
      reason: 'unsupported_reason',
    }).valid,
    false
  );
});

test('getReportReasonLabel returns friendly human labels', () => {
  assert.equal(getReportReasonLabel('wrong_date'), 'Incorrect Date or Time');
  assert.equal(getReportReasonLabel('wrong_location'), 'Wrong Location or Address');
  assert.equal(getReportReasonLabel('cancelled'), 'Event Cancelled or Closed');
  assert.equal(getReportReasonLabel('unknown_key'), 'Other details');
});

test('toggleLikedEventId adds and removes IDs immutably', () => {
  const initial: string[] = ['ev-1', 'ev-2'];
  const added = toggleLikedEventId(initial, 'ev-3');
  assert.deepEqual(added, ['ev-1', 'ev-2', 'ev-3']);

  const removed = toggleLikedEventId(added, 'ev-1');
  assert.deepEqual(removed, ['ev-2', 'ev-3']);
});

test('hasInaccurateReports detects when event has 1 or more reports', () => {
  assert.equal(hasInaccurateReports({ _count: { feedbacks: 2 } }), true);
  assert.equal(hasInaccurateReports({ _count: { feedbacks: 0 } }), false);
  assert.equal(hasInaccurateReports({}), false);
  assert.equal(hasInaccurateReports(null as any), false);
});

