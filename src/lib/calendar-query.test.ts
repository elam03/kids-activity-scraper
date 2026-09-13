import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatLocalDate,
  isMultiDayEvent,
  filterCalendarEvents,
  getWeekDates,
  getMonthDates,
  getSingleDayEventsForDate,
  isMultiDayActiveInRange,
  getActiveMultiDayEvents,
  calculateNextPivotDate,
  handleModalEscapeKey,
  formatWeekdayHeader,
  getMobileDaySummary,
  getWeekdayHeaderClasses,
  getMonthGridContainerClasses,
  getMonthDayNumberClasses,
  type CalendarEvent,
} from './calendar-query';

const sampleEvents: CalendarEvent[] = [
  {
    id: '1',
    sourceId: 's1',
    source: { handle: 'kids_sj', name: 'Kids SJ' },
    rawPostUrl: 'https://instagr.am/p/1',
    title: 'Toddler Music Hour',
    startDate: '2026-09-15',
    endDate: null,
    startTime: '10:00',
    endTime: '11:00',
    location: 'San Jose',
    ageRange: '1-3',
    ageGroup: 'toddlers',
    category: 'music',
    cost: 'Free',
    isFree: true,
    registrationUrl: null,
    description: 'Music for toddlers',
  },
  {
    id: '2',
    sourceId: 's1',
    source: { handle: 'kids_sj', name: 'Kids SJ' },
    rawPostUrl: 'https://instagr.am/p/2',
    title: 'Fall STEM Camp',
    startDate: '2026-09-14',
    endDate: '2026-09-18',
    startTime: '09:00',
    endTime: '15:00',
    location: 'Sunnyvale',
    ageRange: '6-10',
    ageGroup: 'kids',
    category: 'education',
    cost: '$200',
    isFree: false,
    registrationUrl: null,
    description: 'Weeklong STEM camp',
  },
  {
    id: '3',
    sourceId: 's1',
    source: { handle: 'kids_sj', name: 'Kids SJ' },
    rawPostUrl: 'https://instagr.am/p/3',
    title: 'Art in the Park',
    startDate: '2026-09-20',
    endDate: null,
    startTime: '13:00',
    endTime: '15:00',
    location: 'Campbell',
    ageRange: 'All ages',
    ageGroup: 'all',
    category: 'arts',
    cost: 'Free',
    isFree: true,
    registrationUrl: null,
    description: 'Outdoor painting',
  },
];

test('formatLocalDate formats Date object to YYYY-MM-DD string', () => {
  const d = new Date(2026, 8, 15); // Sept 15, 2026
  assert.equal(formatLocalDate(d), '2026-09-15');
});

test('isMultiDayEvent identifies multi-day vs single-day events', () => {
  assert.equal(isMultiDayEvent(sampleEvents[0]), false);
  assert.equal(isMultiDayEvent(sampleEvents[1]), true);
  assert.equal(isMultiDayEvent({ ...sampleEvents[0], endDate: '2026-09-15' }), false, 'Same start and end date is single-day');
});

test('filterCalendarEvents filters by multi-selection age groups and category', () => {
  // All ages and all categories
  const all = filterCalendarEvents(sampleEvents, { ageGroups: ['all'], category: 'all' });
  assert.equal(all.length, 3);

  // Category filter
  const musicOnly = filterCalendarEvents(sampleEvents, { ageGroups: ['all'], category: 'music' });
  assert.equal(musicOnly.length, 1);
  assert.equal(musicOnly[0].title, 'Toddler Music Hour');

  // Age group filter
  const toddlersOnly = filterCalendarEvents(sampleEvents, { ageGroups: ['toddlers'], category: 'all' });
  assert.equal(toddlersOnly.length, 1);
  assert.equal(toddlersOnly[0].title, 'Toddler Music Hour');

  const multipleGroups = filterCalendarEvents(sampleEvents, { ageGroups: ['toddlers', 'kids'], category: 'all' });
  assert.equal(multipleGroups.length, 2);

  // Combination
  const combo = filterCalendarEvents(sampleEvents, { ageGroups: ['kids'], category: 'education' });
  assert.equal(combo.length, 1);
  assert.equal(combo[0].title, 'Fall STEM Camp');
});

test('getWeekDates returns 14 consecutive days starting on Sunday', () => {
  const pivot = new Date(2026, 8, 16); // Wednesday Sept 16, 2026
  const weekDates = getWeekDates(pivot);
  assert.equal(weekDates.length, 14);
  assert.equal(weekDates[0].getDay(), 0, 'First day should be Sunday');
  assert.equal(formatLocalDate(weekDates[0]), '2026-09-13');
  assert.equal(formatLocalDate(weekDates[13]), '2026-09-26');
});

test('getMonthDates returns 42 days grid for full calendar view', () => {
  const pivot = new Date(2026, 8, 1); // September 2026
  const monthDates = getMonthDates(pivot);
  assert.equal(monthDates.length, 42);
  assert.equal(monthDates[0].getDay(), 0, 'Grid starts on Sunday');
});

test('getSingleDayEventsForDate returns only single-day events matching given date', () => {
  const targetDate = new Date(2026, 8, 15);
  const singleDayEvs = sampleEvents.filter((e) => !isMultiDayEvent(e));
  const matches = getSingleDayEventsForDate(targetDate, singleDayEvs);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].title, 'Toddler Music Hour');
});

test('isMultiDayActiveInRange detects overlaps correctly', () => {
  const multiEvent = sampleEvents[1]; // 2026-09-14 to 2026-09-18
  const range1Start = new Date(2026, 8, 13);
  const range1End = new Date(2026, 8, 19);
  assert.equal(isMultiDayActiveInRange(multiEvent, range1Start, range1End), true);

  const rangePastStart = new Date(2026, 8, 1);
  const rangePastEnd = new Date(2026, 8, 10);
  assert.equal(isMultiDayActiveInRange(multiEvent, rangePastStart, rangePastEnd), false);
});

test('getActiveMultiDayEvents filters multi-day events for viewMode', () => {
  const pivot = new Date(2026, 8, 15);
  const activeWeek = getActiveMultiDayEvents(sampleEvents, 'day', pivot);
  assert.equal(activeWeek.length, 1);
  assert.equal(activeWeek[0].title, 'Fall STEM Camp');
});

test('calculateNextPivotDate steps forward and backward correctly', () => {
  const pivot = new Date(2026, 8, 15); // Sept 15, 2026
  const forwardDay = calculateNextPivotDate(pivot, 'day', 1);
  assert.equal(formatLocalDate(forwardDay), '2026-09-29', 'Steps forward by 14 days in day view');

  const forwardMonth = calculateNextPivotDate(pivot, 'month', 1);
  assert.equal(forwardMonth.getMonth(), 9, 'Steps forward by 1 month in month view');

  const backwardMonth = calculateNextPivotDate(pivot, 'month', -1);
  assert.equal(backwardMonth.getMonth(), 7, 'Steps backward by 1 month in month view');
});

test('handleModalEscapeKey dismisses top modal first when both day and event modals are active', () => {
  const dayDate = new Date(2026, 8, 15);
  const sampleEvent = { id: '1', title: 'Music' };

  // When both event and day modal are active, dismissing escape closes event first, retaining day modal
  const next1 = handleModalEscapeKey({ selectedEvent: sampleEvent, selectedDateForDetails: dayDate });
  assert.equal(next1.selectedEvent, null);
  assert.equal(next1.selectedDateForDetails, dayDate);

  // When only day modal is active, dismissing escape closes day modal
  const next2 = handleModalEscapeKey(next1);
  assert.equal(next2.selectedEvent, null);
  assert.equal(next2.selectedDateForDetails, null);
});

test('formatWeekdayHeader formats weekday for mobile narrow and standard short view', () => {
  // Sunday
  const sunday = new Date(2026, 8, 13);
  assert.equal(formatWeekdayHeader(sunday, 'short'), 'Sun');
  assert.equal(formatWeekdayHeader(sunday, 'narrow'), 'S');

  // Wednesday
  const wednesday = new Date(2026, 8, 16);
  assert.equal(formatWeekdayHeader(wednesday, 'short'), 'Wed');
  assert.equal(formatWeekdayHeader(wednesday, 'narrow'), 'W');
});

test('getMobileDaySummary generates concise badges for compact mobile screens', () => {
  assert.equal(getMobileDaySummary(0), '');
  assert.equal(getMobileDaySummary(1), '1 event');
  assert.equal(getMobileDaySummary(4), '4 events');
});

test('getWeekdayHeaderClasses resolves high-contrast classes for playful, jungle, and default themes', () => {
  // Playful (bubblegum) theme
  const playfulTheme = {
    weekdayHeader: 'text-purple-950 bg-purple-200/90 font-extrabold',
  };
  assert.equal(getWeekdayHeaderClasses(playfulTheme), 'text-purple-950 bg-purple-200/90 font-extrabold');

  // Jungle theme
  const jungleTheme = {
    weekdayHeader: 'text-emerald-950 bg-emerald-200/90 font-extrabold',
  };
  assert.equal(getWeekdayHeaderClasses(jungleTheme), 'text-emerald-950 bg-emerald-200/90 font-extrabold');

  // Cosmo / fallback
  assert.match(getWeekdayHeaderClasses(null), /text-slate-[1-3]00/);
  assert.match(getWeekdayHeaderClasses({}), /text-slate-[1-3]00/);
});

test('getMonthGridContainerClasses resolves theme monthGridBg or safe default', () => {
  assert.equal(getMonthGridContainerClasses({ monthGridBg: 'bg-white/80' }), 'bg-white/80');
  assert.equal(getMonthGridContainerClasses(null), 'bg-slate-950/20');
  assert.equal(getMonthGridContainerClasses({}), 'bg-slate-950/20');
});

test('getMonthDayNumberClasses prioritizes today highlight and resolves theme colors', () => {
  // Today is highlighted in violet
  assert.equal(getMonthDayNumberClasses(true, { dayNumber: 'text-purple-950' }), 'text-violet-500 font-bold');

  // Regular day with theme dayNumber
  assert.equal(getMonthDayNumberClasses(false, { dayNumber: 'text-purple-950 font-bold' }), 'text-purple-950 font-bold');
  assert.equal(getMonthDayNumberClasses(false, { dayNumber: 'text-emerald-950 font-bold' }), 'text-emerald-950 font-bold');

  // Default fallback
  assert.match(getMonthDayNumberClasses(false, null), /text-slate-/);
});


