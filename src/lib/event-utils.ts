export interface ReviewableEvent {
  status: string;
  confidence?: number | null;
  location?: string | null;
  startDate?: string | null;
}

/**
 * Determines whether an event needs review by an administrator.
 *
 * Rules:
 * 1. Rejected events NEVER need review (they are already rejected/non-events).
 * 2. Pending events always need review.
 * 3. Events with confidence < 0.8 need review.
 * 4. Events missing location or startDate need review.
 * 5. Otherwise, the event does not need review.
 */
export function isNeedsReview(event: ReviewableEvent): boolean {
  if (event.status === 'rejected') {
    return false;
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
