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

