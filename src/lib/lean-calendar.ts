import { matchesAgeGroup } from './event-utils';
import type { CalendarEvent } from './calendar-query';

export interface LeanFilterOptions {
  search?: string;
  freeOnly?: boolean;
  ageGroup?: string;
  category?: string;
}

export interface LeanDateLabel {
  fullLabel: string;
  shortDate: string;
  dayOfWeek: string;
  isToday: boolean;
  relativeTag: string | null;
}

export interface DayGroup {
  date: string;
  dateObj: Date;
  fullLabel: string;
  shortDate: string;
  dayOfWeek: string;
  isToday: boolean;
  relativeTag: string | null;
  events: CalendarEvent[];
}

export interface GroupEventsOptions {
  startDate: string;
  daysCount?: number;
  todayDate?: string;
}

export interface LeanSummary {
  totalCount: number;
  freeCount: number;
  paidCount: number;
}

/**
 * Converts a 24-hour time string (HH:MM or H:MM) into a clean 12-hour string (e.g. "10:30 AM", "2:00 PM")
 */
function convertTo12Hour(timeStr: string): string {
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return timeStr;

  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, '0');
  if (isNaN(hours)) return timeStr;

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours === 0 ? 12 : hours;

  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Formats start and optional end times into a clean display label (e.g. "10:30 AM – 11:15 AM", "All Day")
 */
export function formatEventTime(startTime?: string | null, endTime?: string | null): string {
  if (!startTime || startTime.trim() === '') {
    return 'All Day';
  }

  const startFormatted = convertTo12Hour(startTime);
  if (endTime && endTime.trim() !== '') {
    const endFormatted = convertTo12Hour(endTime);
    return `${startFormatted} – ${endFormatted}`;
  }

  return startFormatted;
}

/**
 * Helper to parse YYYY-MM-DD safely into a local Date without timezone day shifting
 */
export function parseLocalDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Helper to format a Date into YYYY-MM-DD
 */
export function formatDateToIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Shifts a YYYY-MM-DD date string by a number of days
 */
export function shiftDateStr(dateStr: string, offsetDays: number): string {
  const d = parseLocalDateStr(dateStr);
  d.setDate(d.getDate() + offsetDays);
  return formatDateToIsoDate(d);
}

/**
 * Formats a YYYY-MM-DD string into user-friendly labels with relative context (Today, Tomorrow)
 */
export function formatLeanDateLabel(dateStr: string, todayStr?: string): LeanDateLabel {
  const dateObj = parseLocalDateStr(dateStr);
  const nowStr = todayStr || formatDateToIsoDate(new Date());

  const isToday = dateStr === nowStr;
  const isTomorrow = dateStr === shiftDateStr(nowStr, 1);
  const relativeTag = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : null;

  const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const shortDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const fullLabel = `${dayOfWeek}, ${shortDate}`;

  return {
    fullLabel,
    shortDate,
    dayOfWeek,
    isToday,
    relativeTag,
  };
}

/**
 * Filters calendar events according to lean search criteria
 */
export function filterLeanEvents(
  events: CalendarEvent[],
  filters: LeanFilterOptions
): CalendarEvent[] {
  const { search, freeOnly, ageGroup, category } = filters;
  const searchQuery = search ? search.trim().toLowerCase() : '';

  return events.filter((event) => {
    // Search filter across title, description, location
    if (searchQuery) {
      const titleMatch = event.title?.toLowerCase().includes(searchQuery);
      const descMatch = event.description?.toLowerCase().includes(searchQuery);
      const locMatch = event.location?.toLowerCase().includes(searchQuery);
      if (!titleMatch && !descMatch && !locMatch) {
        return false;
      }
    }

    // Free only filter
    if (freeOnly) {
      const isMarkedFree = event.isFree === true;
      const costHasFree = Boolean(event.cost && /free/i.test(event.cost));
      if (!isMarkedFree && !costHasFree) {
        return false;
      }
    }

    // Age group filter
    if (ageGroup && ageGroup !== 'all') {
      const eventGroups = (event.ageGroup || '')
        .split(/[,/]/)
        .map((g) => g.trim().toLowerCase());
      const isAllAges = eventGroups.includes('all');
      if (!isAllAges && !matchesAgeGroup(event.ageGroup, [ageGroup])) {
        return false;
      }
    }

    // Category filter
    if (category && category !== 'all') {
      if (event.category !== category) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Groups events by date across a sliding window of days.
 * Includes both single-day and overlapping multi-day events.
 */
export function groupEventsByDate(
  events: CalendarEvent[],
  options: GroupEventsOptions
): DayGroup[] {
  const { startDate, daysCount = 7, todayDate } = options;
  const groups: DayGroup[] = [];

  for (let i = 0; i < daysCount; i++) {
    const currDateStr = shiftDateStr(startDate, i);
    const dateObj = parseLocalDateStr(currDateStr);
    const { fullLabel, shortDate, dayOfWeek, isToday, relativeTag } = formatLeanDateLabel(
      currDateStr,
      todayDate
    );

    // Filter events matching this date
    const dayEvents = events.filter((e) => {
      if (!e.endDate || e.endDate === e.startDate) {
        return e.startDate === currDateStr;
      }
      return e.startDate <= currDateStr && e.endDate >= currDateStr;
    });

    // Sort: timed events first in chronological order, then all-day events
    dayEvents.sort((a, b) => {
      const aHasTime = Boolean(a.startTime && a.startTime.trim() !== '');
      const bHasTime = Boolean(b.startTime && b.startTime.trim() !== '');

      if (aHasTime && bHasTime) {
        return (a.startTime || '').localeCompare(b.startTime || '');
      }
      if (aHasTime && !bHasTime) return -1;
      if (!aHasTime && bHasTime) return 1;

      return a.title.localeCompare(b.title);
    });

    groups.push({
      date: currDateStr,
      dateObj,
      fullLabel,
      shortDate,
      dayOfWeek,
      isToday,
      relativeTag,
      events: dayEvents,
    });
  }

  return groups;
}

/**
 * Converts a 4-digit year (e.g. 2026) to spaced uppercase words: "T W E N T Y   T W E N T Y   S I X"
 */
export function formatSpelledYear(year: number): string {
  const words: Record<number, string> = {
    0: 'ZERO', 1: 'ONE', 2: 'TWO', 3: 'THREE', 4: 'FOUR', 5: 'FIVE',
    6: 'SIX', 7: 'SEVEN', 8: 'EIGHT', 9: 'NINE', 10: 'TEN',
    11: 'ELEVEN', 12: 'TWELVE', 13: 'THIRTEEN', 14: 'FOURTEEN', 15: 'FIFTEEN',
    16: 'SIXTEEN', 17: 'SEVENTEEN', 18: 'EIGHTEEN', 19: 'NINETEEN',
    20: 'TWENTY', 21: 'TWENTY ONE', 22: 'TWENTY TWO', 23: 'TWENTY THREE',
    24: 'TWENTY FOUR', 25: 'TWENTY FIVE', 26: 'TWENTY SIX', 27: 'TWENTY SEVEN',
    28: 'TWENTY EIGHT', 29: 'TWENTY NINE', 30: 'THIRTY',
  };

  const century = Math.floor(year / 100);
  const remainder = year % 100;

  const centuryStr = words[century] || String(century);
  const remainderStr = words[remainder] || String(remainder);

  const wordList = `${centuryStr} ${remainderStr}`.split(/\s+/).filter(Boolean);
  return wordList.map((w) => w.split('').join(' ')).join('   ');
}

/**
 * Formats a Date's month into spaced uppercase letters: "J A N U A R Y", "O C T O B E R"
 */
export function formatTrackedMonth(date: Date): string {
  const monthName = date.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  return monthName.split('').join(' ');
}

export interface PlannerDayCell {
  dateStr: string;
  dateObj: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

export const PLANNER_WEEKDAYS = [
  { name: 'SUNDAY', short: 'SUN', bg: 'bg-[#dceaf7]', border: 'border-[#b8d4ee]', text: 'text-[#1e3a8a]' },
  { name: 'MONDAY', short: 'MON', bg: 'bg-[#d9ebd9]', border: 'border-[#b4d8b4]', text: 'text-[#164e28]' },
  { name: 'TUESDAY', short: 'TUE', bg: 'bg-[#fdf1c8]', border: 'border-[#fae392]', text: 'text-[#714b0b]' },
  { name: 'WEDNESDAY', short: 'WED', bg: 'bg-[#fce9dc]', border: 'border-[#f6ccb3]', text: 'text-[#7c2d12]' },
  { name: 'THURSDAY', short: 'THU', bg: 'bg-[#fadde4]', border: 'border-[#f2b9c7]', text: 'text-[#831843]' },
  { name: 'FRIDAY', short: 'FRI', bg: 'bg-[#ebdcf0]', border: 'border-[#d6b7e0]', text: 'text-[#581c87]' },
  { name: 'SATURDAY', short: 'SAT', bg: 'bg-[#d2eceb]', border: 'border-[#a8dcdb]', text: 'text-[#134e4a]' },
] as const;

function getEventsForPlannerDay(dateStr: string, events: CalendarEvent[]): CalendarEvent[] {
  return events
    .filter((e) => {
      if (!e.endDate || e.endDate === e.startDate) {
        return e.startDate === dateStr;
      }
      return e.startDate <= dateStr && e.endDate >= dateStr;
    })
    .sort((a, b) => {
      const aHasTime = Boolean(a.startTime && a.startTime.trim() !== '');
      const bHasTime = Boolean(b.startTime && b.startTime.trim() !== '');
      if (aHasTime && bHasTime) return (a.startTime || '').localeCompare(b.startTime || '');
      if (aHasTime && !bHasTime) return -1;
      if (!aHasTime && bHasTime) return 1;
      return a.title.localeCompare(b.title);
    });
}

/**
 * Builds monthly calendar grid cells starting on Sunday.
 * Fills up complete weeks (35 or 42 cells).
 */
export function getPlannerMonthCells(
  pivotDate: Date,
  events: CalendarEvent[],
  todayStr?: string
): PlannerDayCell[] {
  const year = pivotDate.getFullYear();
  const month = pivotDate.getMonth();
  const activeToday = todayStr || formatDateToIsoDate(new Date());

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const cells: PlannerDayCell[] = [];
  const startOffset = firstDayOfMonth.getDay(); // 0 for Sunday

  // Previous month padding
  for (let i = startOffset; i > 0; i--) {
    const d = new Date(year, month, 1 - i);
    const dateStr = formatDateToIsoDate(d);
    cells.push({
      dateStr,
      dateObj: d,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: dateStr === activeToday,
      events: getEventsForPlannerDay(dateStr, events),
    });
  }

  // Current month days
  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    const d = new Date(year, month, i);
    const dateStr = formatDateToIsoDate(d);
    cells.push({
      dateStr,
      dateObj: d,
      dayNumber: i,
      isCurrentMonth: true,
      isToday: dateStr === activeToday,
      events: getEventsForPlannerDay(dateStr, events),
    });
  }

  // Next month padding to complete full 7-day rows
  const totalRows = Math.ceil(cells.length / 7);
  const targetTotal = totalRows * 7;
  const endOffset = targetTotal - cells.length;

  for (let i = 1; i <= endOffset; i++) {
    const d = new Date(year, month + 1, i);
    const dateStr = formatDateToIsoDate(d);
    cells.push({
      dateStr,
      dateObj: d,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: dateStr === activeToday,
      events: getEventsForPlannerDay(dateStr, events),
    });
  }

  return cells;
}

export const CLASSROOM_WEEKDAYS = [
  { name: 'MON', label: 'Monday', bg: 'bg-[#fcd5ce]', text: 'text-slate-900' },
  { name: 'TUE', label: 'Tuesday', bg: 'bg-[#cbf3f0]', text: 'text-slate-900' },
  { name: 'WED', label: 'Wednesday', bg: 'bg-[#dcfce7]', text: 'text-slate-900' },
  { name: 'THU', label: 'Thursday', bg: 'bg-[#fef08a]', text: 'text-slate-900' },
  { name: 'FRI', label: 'Friday', bg: 'bg-[#f0e6ef]', text: 'text-slate-900' },
  { name: 'SAT', label: 'Saturday', bg: 'bg-[#ffd6d6]', text: 'text-slate-900' },
  { name: 'SUN', label: 'Sunday', bg: 'bg-[#fed7aa]', text: 'text-slate-900' },
] as const;

/**
 * Builds monthly calendar grid cells starting on Monday (matching Screenshot 2).
 */
export function getMondayStartMonthCells(
  pivotDate: Date,
  events: CalendarEvent[],
  todayStr?: string
): PlannerDayCell[] {
  const year = pivotDate.getFullYear();
  const month = pivotDate.getMonth();
  const activeToday = todayStr || formatDateToIsoDate(new Date());

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const cells: PlannerDayCell[] = [];
  // Monday start: Sunday (0) becomes 6, Monday (1) becomes 0, etc.
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;

  // Previous month padding
  for (let i = startOffset; i > 0; i--) {
    const d = new Date(year, month, 1 - i);
    const dateStr = formatDateToIsoDate(d);
    cells.push({
      dateStr,
      dateObj: d,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: dateStr === activeToday,
      events: getEventsForPlannerDay(dateStr, events),
    });
  }

  // Current month days
  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    const d = new Date(year, month, i);
    const dateStr = formatDateToIsoDate(d);
    cells.push({
      dateStr,
      dateObj: d,
      dayNumber: i,
      isCurrentMonth: true,
      isToday: dateStr === activeToday,
      events: getEventsForPlannerDay(dateStr, events),
    });
  }

  // Next month padding to complete full 7-day rows
  const totalRows = Math.ceil(cells.length / 7);
  const targetTotal = totalRows * 7;
  const endOffset = targetTotal - cells.length;

  for (let i = 1; i <= endOffset; i++) {
    const d = new Date(year, month + 1, i);
    const dateStr = formatDateToIsoDate(d);
    cells.push({
      dateStr,
      dateObj: d,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: dateStr === activeToday,
      events: getEventsForPlannerDay(dateStr, events),
    });
  }

  return cells;
}

/**
 * Calculates aggregate summary metrics for lean view
 */
export function calculateLeanSummary(events: CalendarEvent[]): LeanSummary {
  let freeCount = 0;
  for (const event of events) {
    if (event.isFree || (event.cost && /free/i.test(event.cost))) {
      freeCount++;
    }
  }

  return {
    totalCount: events.length,
    freeCount,
    paidCount: events.length - freeCount,
  };
}
