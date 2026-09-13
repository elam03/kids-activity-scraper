import { useMemo } from 'react';
import { matchesAgeGroup } from './event-utils';

export interface CalendarEvent {
  id: string;
  sourceId: string;
  source: {
    handle: string;
    name: string;
  };
  rawPostUrl: string;
  title: string;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  ageRange: string | null;
  ageGroup?: string;
  category: string;
  cost: string | null;
  isFree: boolean;
  registrationUrl: string | null;
  description: string;
  latitude?: number | null;
  longitude?: number | null;
  likes?: number;
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isMultiDayEvent(event: { startDate: string; endDate?: string | null }): boolean {
  return event.endDate !== null && event.endDate !== undefined && event.startDate !== event.endDate;
}

export interface CalendarFilterOptions {
  ageGroups?: string[];
  category?: string;
}

export function filterCalendarEvents(
  events: CalendarEvent[],
  filters: CalendarFilterOptions
): CalendarEvent[] {
  const { ageGroups = ['all'], category = 'all' } = filters;

  return events.filter((e) => {
    const matchesAge = matchesAgeGroup(e.ageGroup, ageGroups);
    const matchesCategory = category === 'all' || e.category === category;
    return matchesAge && matchesCategory;
  });
}

export function getWeekDates(pivot: Date): Date[] {
  const dates: Date[] = [];
  const day = pivot.getDay();
  const startOfWeek = new Date(pivot);
  startOfWeek.setDate(pivot.getDate() - day); // Start on Sunday

  // 14 days (Current Week + Next Week)
  for (let i = 0; i < 14; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    dates.push(d);
  }
  return dates;
}

export function getMonthDates(pivot: Date): Date[] {
  const year = pivot.getFullYear();
  const month = pivot.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const dates: Date[] = [];
  const startOffset = firstDayOfMonth.getDay();
  for (let i = startOffset; i > 0; i--) {
    const d = new Date(year, month, 1 - i);
    dates.push(d);
  }
  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    const d = new Date(year, month, i);
    dates.push(d);
  }
  const endOffset = 42 - dates.length; // 6 rows of 7 days
  for (let i = 1; i <= endOffset; i++) {
    const d = new Date(year, month + 1, i);
    dates.push(d);
  }
  return dates;
}

export function getSingleDayEventsForDate(date: Date, singleDayEvents: CalendarEvent[]): CalendarEvent[] {
  const dateStr = formatLocalDate(date);
  return singleDayEvents.filter((e) => e.startDate === dateStr);
}

export function isMultiDayActiveInRange(
  event: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date
): boolean {
  if (!event.endDate) return false;
  const startStr = formatLocalDate(rangeStart);
  const endStr = formatLocalDate(rangeEnd);
  return event.startDate <= endStr && event.endDate >= startStr;
}

export function getActiveMultiDayEvents(
  events: CalendarEvent[],
  viewMode: 'day' | 'month' | 'map',
  pivot: Date
): CalendarEvent[] {
  const multiDayOnly = events.filter(isMultiDayEvent);
  if (viewMode === 'map') {
    return multiDayOnly;
  }

  if (viewMode === 'day') {
    const weekDates = getWeekDates(pivot);
    return multiDayOnly.filter((e) => isMultiDayActiveInRange(e, weekDates[0], weekDates[13]));
  }

  const monthDates = getMonthDates(pivot);
  return multiDayOnly.filter((e) => isMultiDayActiveInRange(e, monthDates[0], monthDates[41]));
}

export function calculateNextPivotDate(
  pivot: Date,
  viewMode: 'day' | 'month',
  offset: number
): Date {
  const newPivot = new Date(pivot);
  if (viewMode === 'day') {
    newPivot.setDate(pivot.getDate() + offset * 14);
  } else if (viewMode === 'month') {
    newPivot.setMonth(pivot.getMonth() + offset);
  }
  return newPivot;
}

export interface UseCalendarQueryOptions {
  viewMode: 'day' | 'month' | 'map';
  currentPivotDate: Date;
  selectedAgeGroups: string[];
  selectedCategory: string;
}

export function useCalendarQuery(events: CalendarEvent[], options: UseCalendarQueryOptions) {
  const { viewMode, currentPivotDate, selectedAgeGroups, selectedCategory } = options;

  const filteredEvents = useMemo(() => {
    return filterCalendarEvents(events, {
      ageGroups: selectedAgeGroups,
      category: selectedCategory,
    });
  }, [events, selectedAgeGroups, selectedCategory]);

  const singleDayEvents = useMemo(() => {
    return filteredEvents.filter((e) => !isMultiDayEvent(e));
  }, [filteredEvents]);

  const multiDayEvents = useMemo(() => {
    return filteredEvents.filter(isMultiDayEvent);
  }, [filteredEvents]);

  const weekDates = useMemo(() => {
    return getWeekDates(currentPivotDate);
  }, [currentPivotDate]);

  const monthDates = useMemo(() => {
    return getMonthDates(currentPivotDate);
  }, [currentPivotDate]);

  const activeMultiDayEvents = useMemo(() => {
    return getActiveMultiDayEvents(filteredEvents, viewMode, currentPivotDate);
  }, [filteredEvents, viewMode, currentPivotDate]);

  const getEventsForDate = useMemo(() => {
    return (date: Date) => getSingleDayEventsForDate(date, singleDayEvents);
  }, [singleDayEvents]);

  return {
    filteredEvents,
    singleDayEvents,
    multiDayEvents,
    weekDates,
    monthDates,
    activeMultiDayEvents,
    getEventsForDate,
  };
}

export interface CalendarModalState<T = unknown> {
  selectedEvent: T | null;
  selectedDateForDetails: Date | null;
}

/**
 * Handles Escape key navigation for calendar modals.
 * Prioritizes dismissing the topmost modal (event detail) first,
 * returning the user to the underlying day detail modal if active.
 */
export function handleModalEscapeKey<T = unknown>(state: CalendarModalState<T>): CalendarModalState<T> {
  if (state.selectedEvent) {
    return { ...state, selectedEvent: null };
  }
  if (state.selectedDateForDetails) {
    return { ...state, selectedDateForDetails: null };
  }
  return state;
}

/**
 * Formats a Date object into weekday label ('Sun' for short, 'S' for narrow on compact mobile screens).
 */
export function formatWeekdayHeader(date: Date, format: 'short' | 'narrow' = 'short'): string {
  return date.toLocaleDateString('en-US', { weekday: format });
}

/**
 * Returns a concise summary label for event counts on compact mobile screens.
 */
export function getMobileDaySummary(eventsCount: number): string {
  if (eventsCount <= 0) return '';
  if (eventsCount === 1) return '1 event';
  return `${eventsCount} events`;
}

export interface CalendarThemeConfig {
  weekdayHeader?: string;
  monthGridBg?: string;
  dayNumber?: string;
  [key: string]: any;
}

/**
 * Resolves Tailwind classes for weekday header columns in the month grid view.
 * Ensures strong contrast across light and dark themes.
 */
export function getWeekdayHeaderClasses(theme?: Partial<CalendarThemeConfig> | null): string {
  if (theme?.weekdayHeader) {
    return theme.weekdayHeader;
  }
  return 'text-slate-200 bg-slate-950/60 font-bold';
}

/**
 * Resolves Tailwind classes for the month grid container background.
 */
export function getMonthGridContainerClasses(theme?: Partial<CalendarThemeConfig> | null): string {
  if (theme?.monthGridBg) {
    return theme.monthGridBg;
  }
  return 'bg-slate-950/20';
}

/**
 * Resolves Tailwind classes for calendar day numbers in month view cells.
 */
export function getMonthDayNumberClasses(isToday: boolean, theme?: Partial<CalendarThemeConfig> | null): string {
  if (isToday) {
    return 'text-violet-500 font-bold';
  }
  if (theme?.dayNumber) {
    return theme.dayNumber;
  }
  return 'text-slate-400 font-medium';
}

export type CalendarThemeName = 'cosmo' | 'bubblegum' | 'jungle';

export const VALID_THEMES: readonly CalendarThemeName[] = ['cosmo', 'bubblegum', 'jungle'] as const;

export const DEFAULT_CALENDAR_THEME: CalendarThemeName = 'jungle';

/**
 * Resolves the active calendar theme name, defaulting to 'jungle' if undefined or invalid.
 */
export function resolveCalendarTheme(savedTheme?: string | null): CalendarThemeName {
  if (savedTheme && (VALID_THEMES as readonly string[]).includes(savedTheme)) {
    return savedTheme as CalendarThemeName;
  }
  return DEFAULT_CALENDAR_THEME;
}
