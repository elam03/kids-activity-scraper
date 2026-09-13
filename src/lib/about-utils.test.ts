import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FEEDBACK_EMAIL,
  buildFeedbackMailtoUrl,
  getAboutContent,
} from './about-utils';

test('FEEDBACK_EMAIL is configured with valid creator contact', () => {
  assert.equal(FEEDBACK_EMAIL, 'elam03@gmail.com');
  assert.match(FEEDBACK_EMAIL, /^[^@\s]+@[^@\s]+\.[^@\s]+$/);
});

test('buildFeedbackMailtoUrl generates valid mailto link with encoded subject and body', () => {
  const defaultUrl = buildFeedbackMailtoUrl();
  assert.match(defaultUrl, /^mailto:elam03@gmail\.com\?/);
  assert.match(defaultUrl, /subject=Little%20Days%20Out%20Feedback/);

  const customUrl = buildFeedbackMailtoUrl({
    subject: 'Idea for map view',
    body: 'Can you add park filters?',
  });
  assert.match(customUrl, /subject=Idea%20for%20map%20view/);
  assert.match(customUrl, /body=Can%20you%20add%20park%20filters%3F/);
});

test('getAboutContent provides family blurb, tipping appreciation, and feedback invitation', () => {
  const content = getAboutContent();

  // Family & creator blurb
  assert.match(content.familyBlurb, /Eric/);
  assert.match(content.familyBlurb, /family|kids|partner|parent/i);
  assert.match(content.familyBlurb, /Bay Area/i);

  // Tipping blurb
  assert.match(content.tippingAppreciation, /tip|coffee|support/i);
  assert.match(content.tippingAppreciation, /appreciat/i);

  // Feedback note
  assert.match(content.feedbackNote, /positive/i);
  assert.match(content.feedbackNote, /negative/i);
  assert.match(content.feedbackNote, /feedback/i);
});
