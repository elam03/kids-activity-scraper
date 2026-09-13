export interface ReviewableEvent {
  status: string;
  confidence?: number | null;
  location?: string | null;
  startDate?: string | null;
  _count?: {
    feedbacks?: number;
  };
  feedbacks?: unknown[];
}

/**
 * Determines whether an event needs review by an administrator.
 *
 * Rules:
 * 1. Rejected events NEVER need review (they are already rejected/non-events).
 * 2. Events with 1 or more user feedback/inaccuracy reports need review.
 * 3. Pending events always need review.
 * 4. Events with confidence < 0.8 need review.
 * 5. Events missing location or startDate need review.
 * 6. Otherwise, the event does not need review.
 */
export function isNeedsReview(event: ReviewableEvent): boolean {
  if (event.status === 'rejected') {
    return false;
  }

  const feedbackCount = event._count?.feedbacks ?? (Array.isArray(event.feedbacks) ? event.feedbacks.length : 0);
  if (feedbackCount > 0) {
    return true;
  }

  if (event.status === 'pending') {
    return true;
  }

  if (typeof event.confidence === 'number' && event.confidence < 0.8) {
    return true;
  }

  if (!event.location || event.location.trim() === '') {
    return true;
  }

  if (!event.startDate || event.startDate.trim() === '') {
    return true;
  }

  if (event.confidence === undefined || event.confidence === null) {
    return true;
  }

  return false;
}

/**
 * Checks whether an event's age group matches any of the selected age groups.
 *
 * Rules:
 * 1. When selectedAgeGroups is empty or includes 'all', returns true.
 * 2. If eventAgeGroup is null/undefined or empty string, it defaults to 'all'.
 *    - If 'all' is selected, returns true; otherwise false.
 * 3. Splits eventAgeGroup by comma or slash to support compound classifications (e.g. 'toddlers, preschoolers').
 * 4. Returns true if ANY classified event age group matches ANY selected age group.
 */
export function matchesAgeGroup(
  eventAgeGroup: string | null | undefined,
  selectedAgeGroups: string[] | Set<string>
): boolean {
  const selected = Array.isArray(selectedAgeGroups)
    ? selectedAgeGroups
    : Array.from(selectedAgeGroups);

  if (selected.length === 0 || selected.includes('all')) {
    return true;
  }

  if (!eventAgeGroup || eventAgeGroup.trim() === '') {
    return selected.includes('all');
  }

  const groups = eventAgeGroup
    .split(/[,/]/)
    .map(g => g.trim().toLowerCase())
    .filter(Boolean);

  if (groups.length === 0) {
    return selected.includes('all');
  }

  return groups.some(g => selected.includes(g));
}

/**
 * Toggles an age group selection according to multi-selection interaction rules:
 * - Selecting 'all' resets to ['all'].
 * - Selecting an age group when 'all' is currently active switches to just that age group.
 * - Clicking an active age group toggles it off.
 * - Deselecting all age groups resets to ['all'].
 * - Clicking an unselected age group adds it to the active selections.
 */
export function toggleAgeGroup(currentSelected: string[], groupToToggle: string): string[] {
  if (groupToToggle === 'all') {
    return ['all'];
  }

  if (currentSelected.length === 0 || currentSelected.includes('all')) {
    return [groupToToggle];
  }

  if (currentSelected.includes(groupToToggle)) {
    const remaining = currentSelected.filter(g => g !== groupToToggle);
    return remaining.length === 0 ? ['all'] : remaining;
  }

  return [...currentSelected, groupToToggle];
}

export interface EventDateRange {
  startDate: string;
  endDate?: string | null;
}

/**
 * Checks whether an event is in the past relative to a reference date (YYYY-MM-DD).
 * If the event has an endDate, it is in the past if endDate < referenceDate.
 * If the event does not have an endDate, it is in the past if startDate < referenceDate.
 */
export function isPastEvent(event: EventDateRange, referenceDate: string): boolean {
  if (event.endDate && event.endDate.trim() !== '') {
    return event.endDate < referenceDate;
  }
  return event.startDate < referenceDate;
}

/**
 * Constructs a Prisma where clause to identify past events that can be pruned.
 * Matches events where:
 * - endDate is set and < referenceDate
 * - or endDate is null and startDate < referenceDate
 */
export function buildPastEventsPruneWhere(referenceDate: string) {
  return {
    OR: [
      {
        endDate: { not: null, lt: referenceDate },
      },
      {
        endDate: null,
        startDate: { lt: referenceDate },
      },
    ],
  };
}

/**
 * Checks whether a keyboard event corresponds to an Escape key press.
 */
export function isEscapeKey(event: { key: string }): boolean {
  return event.key === 'Escape' || event.key === 'Esc';
}

/**
 * Official Ko-fi tipping/donation URL for creator support.
 */
export const KOFI_DONATION_URL = 'https://ko-fi.com/elam03';




