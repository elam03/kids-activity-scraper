import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatEventTime,
  formatLeanDateLabel,
  filterLeanEvents,
  groupEventsByDate,
  calculateLeanSummary,
  shiftDateStr,
  formatSpelledYear,
  formatTrackedMonth,
  getPlannerMonthCells,
  getMondayStartMonthCells,
} from './lean-calendar';
import type { CalendarEvent } from './calendar-query';

const mockEvents: CalendarEvent[] = [
  {
    id: 'e1',
    sourceId: 's1',
    source: { handle: 'sj_library', name: 'SJ Library' },
    rawPostUrl: 'https://example.com/e1',
    title: 'Baby & Toddler Storytime',
    startDate: '2026-10-03',
    endDate: null,
    startTime: '10:30',
    endTime: '11:15',
    location: 'Dr. Martin Luther King, Jr. Library',
    ageRange: '0-3 years',
    ageGroup: 'infants, toddlers',
    category: 'education',
    cost: 'Free',
    isFree: true,
    registrationUrl: null,
    description: 'Songs, rhymes, and stories for little ones.',
  },
  {
    id: 'e2',
    sourceId: 's1',
    source: { handle: 'sunnyvale_arts', name: 'Sunnyvale Arts' },
    rawPostUrl: 'https://example.com/e2',
    title: 'Kids Clay Workshop',
    startDate: '2026-10-03',
    endDate: null,
    startTime: '14:00',
    endTime: '15:30',
    location: 'Sunnyvale Community Center',
    ageRange: '6-11 years',
    ageGroup: 'kids',
    category: 'arts',
    cost: '$25',
    isFree: false,
    registrationUrl: 'https://example.com/register/e2',
    description: 'Hands-on clay sculpting for creative kids.',
  },
  {
    id: 'e3',
    sourceId: 's2',
    source: { handle: 'palo_alto_rec', name: 'Palo Alto Rec' },
    rawPostUrl: 'https://example.com/e3',
    title: 'Weekend Fall Nature Festival',
    startDate: '2026-10-03',
    endDate: '2026-10-05',
    startTime: null,
    endTime: null,
    location: 'Foothills Nature Preserve',
    ageRange: 'All ages',
    ageGroup: 'all',
    category: 'nature',
    cost: 'Free entry',
    isFree: true,
    registrationUrl: null,
    description: 'Explore autumn foliage and family nature walks.',
  },
  {
    id: 'e4',
    sourceId: 's2',
    source: { handle: 'sj_sports', name: 'SJ Youth Soccer' },
    rawPostUrl: 'https://example.com/e4',
    title: 'Free Youth Soccer Clinic',
    startDate: '2026-10-04',
    endDate: null,
    startTime: '09:00',
    endTime: '11:00',
    location: 'Campbell Park',
    ageRange: '5-9 years',
    ageGroup: 'preschoolers, kids',
    category: 'sports',
    cost: 'Free',
    isFree: true,
    registrationUrl: 'https://example.com/register/e4',
    description: 'Introductory drills and fun scrimmages.',
  },
];

test('formatEventTime: formats single time, time range, and all-day correctly', () => {
  assert.equal(formatEventTime('10:30', '11:15'), '10:30 AM – 11:15 AM');
  assert.equal(formatEventTime('14:00', null), '2:00 PM');
  assert.equal(formatEventTime('09:05', '13:00'), '9:05 AM – 1:00 PM');
  assert.equal(formatEventTime(null, null), 'All Day');
  assert.equal(formatEventTime('', ''), 'All Day');
});

test('formatLeanDateLabel: returns clean date format and relative badge', () => {
  const todayStr = '2026-10-03';
  const labelToday = formatLeanDateLabel('2026-10-03', todayStr);
  assert.equal(labelToday.isToday, true);
  assert.equal(labelToday.relativeTag, 'Today');
  assert.equal(labelToday.dayOfWeek, 'Saturday');

  const labelTomorrow = formatLeanDateLabel('2026-10-04', todayStr);
  assert.equal(labelTomorrow.isToday, false);
  assert.equal(labelTomorrow.relativeTag, 'Tomorrow');
  assert.equal(labelTomorrow.dayOfWeek, 'Sunday');

  const labelFuture = formatLeanDateLabel('2026-10-08', todayStr);
  assert.equal(labelFuture.isToday, false);
  assert.equal(labelFuture.relativeTag, null);
  assert.equal(labelFuture.dayOfWeek, 'Thursday');
});

test('shiftDateStr: accurately shifts YYYY-MM-DD string by offset days', () => {
  assert.equal(shiftDateStr('2026-10-03', 1), '2026-10-04');
  assert.equal(shiftDateStr('2026-10-03', -1), '2026-10-02');
  assert.equal(shiftDateStr('2026-10-31', 1), '2026-11-01');
  assert.equal(shiftDateStr('2026-01-01', -1), '2025-12-31');
});

test('filterLeanEvents: filters by search term across title, location, and description', () => {
  const matchClay = filterLeanEvents(mockEvents, { search: 'clay' });
  assert.equal(matchClay.length, 1);
  assert.equal(matchClay[0].id, 'e2');

  const matchLocation = filterLeanEvents(mockEvents, { search: 'Foothills' });
  assert.equal(matchLocation.length, 1);
  assert.equal(matchLocation[0].id, 'e3');

  const emptyMatch = filterLeanEvents(mockEvents, { search: 'nonexistent keyword' });
  assert.equal(emptyMatch.length, 0);
});

test('filterLeanEvents: filters by freeOnly, ageGroup, and category', () => {
  const freeOnly = filterLeanEvents(mockEvents, { freeOnly: true });
  assert.equal(freeOnly.length, 3);
  assert.ok(freeOnly.every((e) => e.isFree));

  const toddlersOnly = filterLeanEvents(mockEvents, { ageGroup: 'toddlers' });
  // e1 has toddlers; e3 is all ages which matches all
  assert.equal(toddlersOnly.length, 2);
  assert.ok(toddlersOnly.some((e) => e.id === 'e1'));
  assert.ok(toddlersOnly.some((e) => e.id === 'e3'));

  const sportsOnly = filterLeanEvents(mockEvents, { category: 'sports' });
  assert.equal(sportsOnly.length, 1);
  assert.equal(sportsOnly[0].id, 'e4');
});

test('groupEventsByDate: organizes events into daily buckets and includes overlapping multi-day events', () => {
  const groups = groupEventsByDate(mockEvents, {
    startDate: '2026-10-03',
    daysCount: 3, // 10-03, 10-04, 10-05
    todayDate: '2026-10-03',
  });

  assert.equal(groups.length, 3);

  // Day 1: 2026-10-03 (e1, e2, e3)
  assert.equal(groups[0].date, '2026-10-03');
  assert.equal(groups[0].isToday, true);
  assert.equal(groups[0].events.length, 3);
  // Check sorting: timed events first in chronological order (10:30, then 14:00), then all-day (e3)
  assert.equal(groups[0].events[0].id, 'e1');
  assert.equal(groups[0].events[1].id, 'e2');
  assert.equal(groups[0].events[2].id, 'e3');

  // Day 2: 2026-10-04 (e4 single day, plus multi-day e3)
  assert.equal(groups[1].date, '2026-10-04');
  assert.equal(groups[1].events.length, 2);
  assert.equal(groups[1].events[0].id, 'e4');
  assert.equal(groups[1].events[1].id, 'e3');

  // Day 3: 2026-10-05 (only multi-day e3)
  assert.equal(groups[2].date, '2026-10-05');
  assert.equal(groups[2].events.length, 1);
  assert.equal(groups[2].events[0].id, 'e3');
});

test('calculateLeanSummary: calculates total, free, and day counts accurately', () => {
  const summary = calculateLeanSummary(mockEvents);
  assert.equal(summary.totalCount, 4);
  assert.equal(summary.freeCount, 3);
  assert.equal(summary.paidCount, 1);
});

test('formatSpelledYear: converts numeric year to spaced-out capital words', () => {
  assert.equal(formatSpelledYear(2026), 'T W E N T Y   T W E N T Y   S I X');
  assert.equal(formatSpelledYear(2024), 'T W E N T Y   T W E N T Y   F O U R');
  assert.equal(formatSpelledYear(2025), 'T W E N T Y   T W E N T Y   F I V E');
});

test('formatTrackedMonth: formats month name into spaced uppercase characters', () => {
  const jan = new Date(2026, 0, 15);
  assert.equal(formatTrackedMonth(jan), 'J A N U A R Y');

  const oct = new Date(2026, 9, 3);
  assert.equal(formatTrackedMonth(oct), 'O C T O B E R');
});

test('getPlannerMonthCells: produces correct monthly grid structure matching Sunday-first planner layout', () => {
  const jan2026 = new Date(2026, 0, 15);
  const cells = getPlannerMonthCells(jan2026, mockEvents, '2026-01-01');

  // Should have 35 cells (5 rows of 7) for January 2026
  assert.equal(cells.length, 35);

  // First 4 cells are prior month padding (Sun Dec 28 to Wed Dec 31)
  assert.equal(cells[0].isCurrentMonth, false);
  assert.equal(cells[3].isCurrentMonth, false);

  // Fifth cell (Thursday) is Jan 1
  assert.equal(cells[4].isCurrentMonth, true);
  assert.equal(cells[4].dayNumber, 1);
  assert.equal(cells[4].dateStr, '2026-01-01');

  // Last cell of Jan 31
  const jan31 = cells.find((c) => c.dateStr === '2026-01-31');
  assert.ok(jan31);
  assert.equal(jan31.dayNumber, 31);
  assert.equal(jan31.isCurrentMonth, true);
});

test('getMondayStartMonthCells: produces correct Monday-first monthly grid matching Screenshot 2', () => {
  const sept2026 = new Date(2026, 8, 15); // September 2026
  const cells = getMondayStartMonthCells(sept2026, mockEvents, '2026-09-01');

  // Should have 35 cells (5 rows of 7)
  assert.equal(cells.length, 35);

  // Cell 0 is Monday (Aug 31) -> isCurrentMonth: false
  assert.equal(cells[0].isCurrentMonth, false);
  assert.equal(cells[0].dayNumber, 31);

  // Cell 1 is Tuesday (Sept 1) -> isCurrentMonth: true
  assert.equal(cells[1].isCurrentMonth, true);
  assert.equal(cells[1].dayNumber, 1);
  assert.equal(cells[1].dateStr, '2026-09-01');

  // Cell 30 is Wednesday (Sept 30) -> isCurrentMonth: true
  const sept30 = cells.find((c) => c.dateStr === '2026-09-30');
  assert.ok(sept30);
  assert.equal(sept30.dayNumber, 30);
  assert.equal(sept30.isCurrentMonth, true);

  // Trailing cells (Thu Oct 1 to Sun Oct 4) -> isCurrentMonth: false
  assert.equal(cells[31].isCurrentMonth, false);
  assert.equal(cells[34].isCurrentMonth, false);
});
