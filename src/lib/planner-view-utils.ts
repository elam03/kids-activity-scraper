import type { CalendarEvent } from './calendar-query';

export interface HighlighterStyle {
  className: string;
  dotColor: string;
  label: string;
}

/**
 * Maps event to authentic paper planner highlighter marker styling.
 * Supports light (desk blotter paper) and dark modes.
 */
export function getEventHighlighterStyle(
  event: CalendarEvent,
  isDarkMode: boolean = false
): HighlighterStyle {
  if (event.isFree) {
    return {
      className: isDarkMode
        ? 'bg-amber-950/80 text-amber-200 border border-amber-700/80'
        : 'bg-[#fef08a] text-[#713f12] border border-[#facc15]',
      dotColor: '#eab308',
      label: 'Free Event',
    };
  }

  switch (event.category) {
    case 'arts':
    case 'music':
      return {
        className: isDarkMode
          ? 'bg-pink-950/80 text-pink-200 border border-pink-700/80'
          : 'bg-[#fbcfe8] text-[#831843] border border-[#f472b6]',
        dotColor: '#ec4899',
        label: 'Arts & Music',
      };
    case 'sports':
    case 'nature':
      return {
        className: isDarkMode
          ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-700/80'
          : 'bg-[#86efac] text-[#14532d] border border-[#4ade80]',
        dotColor: '#22c55e',
        label: 'Sports & Nature',
      };
    case 'education':
      return {
        className: isDarkMode
          ? 'bg-orange-950/80 text-orange-200 border border-orange-700/80'
          : 'bg-[#fed7aa] text-[#7c2d12] border border-[#fb923c]',
        dotColor: '#f97316',
        label: 'Science & Camps',
      };
    default:
      return {
        className: isDarkMode
          ? 'bg-sky-950/80 text-sky-200 border border-sky-700/80'
          : 'bg-[#bae6fd] text-[#0c4a6e] border border-[#38bdf8]',
        dotColor: '#0284c7',
        label: 'Festivals & Events',
      };
  }
}

/**
 * Resolves cell background classes for planner grid
 */
export function getPlannerCellStatus(
  cell: { isCurrentMonth: boolean; isToday: boolean; isSelected?: boolean },
  isDarkMode: boolean = false
): string {
  if (isDarkMode) {
    if (!cell.isCurrentMonth) {
      return 'bg-slate-950/80 text-slate-500 opacity-60';
    }
    if (cell.isToday) {
      return 'bg-slate-900 border-emerald-500/80 ring-1 ring-emerald-500/40';
    }
    if (cell.isSelected) {
      return 'bg-slate-800 text-slate-100';
    }
    return 'bg-slate-900/90 hover:bg-slate-800/80';
  }

  // Light paper mode
  if (!cell.isCurrentMonth) {
    return 'bg-slate-50/80 text-slate-400 opacity-70';
  }
  if (cell.isToday) {
    return 'bg-white border-emerald-500 ring-2 ring-emerald-500/20';
  }
  if (cell.isSelected) {
    return 'bg-amber-50/80 text-slate-900';
  }
  return 'bg-white hover:bg-slate-50/80';
}

/**
 * Formats date into spaced uppercase month title (e.g. "N O V E M B E R")
 */
export function formatPlannerMonthTitle(date: Date): string {
  const monthName = date.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  return monthName.split('').join(' ');
}
