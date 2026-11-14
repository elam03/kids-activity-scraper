import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getEventHighlighterStyle,
  getPlannerCellStatus,
  formatPlannerMonthTitle,
} from './planner-view-utils';
import type { CalendarEvent } from './calendar-query';

const sampleEvent: CalendarEvent = {
  id: 'e1',
  sourceId: 's1',
  source: { handle: 'test', name: 'Test Source' },
  rawPostUrl: 'https://example.com/1',
  title: 'Art in the Park',
  startDate: '2026-11-14',
  endDate: null,
  startTime: '10:00',
  endTime: '12:00',
  location: 'Palo Alto',
  ageRange: 'All ages',
  category: 'arts',
  cost: '$10',
  isFree: false,
  registrationUrl: null,
  description: 'Test art event',
};

test('getEventHighlighterStyle: free events get warm yellow highlighter', () => {
  const freeEvent = { ...sampleEvent, isFree: true, cost: 'Free' };
  const lightStyle = getEventHighlighterStyle(freeEvent, false);
  assert.ok(lightStyle.className.includes('bg-[#fef08a]') || lightStyle.className.includes('yellow'));
  assert.equal(lightStyle.label, 'Free Event');
});

test('getEventHighlighterStyle: category color mapping in light and dark mode', () => {
  // Arts in light mode
  const artsLight = getEventHighlighterStyle(sampleEvent, false);
  assert.ok(artsLight.className.includes('fbcfe8') || artsLight.className.includes('pink'));

  // Sports in light mode
  const sportsEvent = { ...sampleEvent, category: 'sports' };
  const sportsLight = getEventHighlighterStyle(sportsEvent, false);
  assert.ok(sportsLight.className.includes('86efac') || sportsLight.className.includes('green') || sportsLight.className.includes('emerald'));

  // Dark mode produces high contrast
  const artsDark = getEventHighlighterStyle(sampleEvent, true);
  assert.ok(artsDark.className.length > 0);
});

test('getPlannerCellStatus: calculates correct background based on today and month boundary', () => {
  // Current month regular day
  const regular = getPlannerCellStatus({ isCurrentMonth: true, isToday: false }, false);
  assert.ok(regular.includes('bg-white'));

  // Off-month day
  const offMonth = getPlannerCellStatus({ isCurrentMonth: false, isToday: false }, false);
  assert.ok(offMonth.includes('slate-50') || offMonth.includes('fafafa') || offMonth.includes('opacity'));

  // Today
  const today = getPlannerCellStatus({ isCurrentMonth: true, isToday: true }, false);
  assert.ok(today.includes('emerald') || today.includes('green') || today.includes('ring'));
});

test('formatPlannerMonthTitle: generates uppercase spaced month title', () => {
  const date = new Date(2026, 10, 14); // November 2026
  const title = formatPlannerMonthTitle(date);
  assert.equal(title, 'N O V E M B E R');
});
