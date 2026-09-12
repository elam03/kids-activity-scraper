export const REPORT_REASONS = [
  { id: 'wrong_date', label: 'Incorrect Date or Time' },
  { id: 'wrong_location', label: 'Wrong Location or Address' },
  { id: 'cancelled', label: 'Event Cancelled or Closed' },
  { id: 'pricing_age', label: 'Pricing or Age Range Incorrect' },
  { id: 'other', label: 'Other details' },
] as const;

export type ReportReasonId = typeof REPORT_REASONS[number]['id'];

export interface FeedbackPayload {
  eventId?: string;
  type?: string; // 'like' | 'unlike' | 'report_inaccurate'
  reason?: string;
  comment?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFeedbackPayload(payload: any): ValidationResult {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const { eventId, type, reason } = payload as FeedbackPayload;

  if (!eventId || typeof eventId !== 'string' || eventId.trim() === '') {
    return { valid: false, error: 'Event ID is required' };
  }

  if (type !== 'like' && type !== 'unlike' && type !== 'report_inaccurate') {
    return { valid: false, error: 'Invalid feedback type' };
  }

  if (type === 'report_inaccurate') {
    const validReasonIds = REPORT_REASONS.map(r => r.id as string);
    if (!reason || !validReasonIds.includes(reason)) {
      return { valid: false, error: 'A valid report reason is required' };
    }
  }

  return { valid: true };
}

export function getReportReasonLabel(reasonId?: string | null): string {
  const found = REPORT_REASONS.find(r => r.id === reasonId);
  return found ? found.label : 'Other details';
}

export function toggleLikedEventId(currentLikedIds: string[], eventId: string): string[] {
  if (currentLikedIds.includes(eventId)) {
    return currentLikedIds.filter(id => id !== eventId);
  }
  return [...currentLikedIds, eventId];
}
