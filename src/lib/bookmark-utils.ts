export interface BaseUser {
  name?: string | null;
  email?: string | null;
}

/**
 * Returns the first letter of the user's name or email, or 'P' for Parent.
 */
export function getUserInitials(user?: BaseUser | null): string {
  if (!user) return 'P';
  if (user.name && user.name.trim().length > 0) {
    return user.name.trim()[0].toUpperCase();
  }
  if (user.email && user.email.trim().length > 0) {
    return user.email.trim()[0].toUpperCase();
  }
  return 'P';
}

/**
 * Returns the user's first name, or email prefix, or 'Parent'.
 */
export function getUserFirstName(user?: BaseUser | null): string {
  if (!user) return 'Parent';
  if (user.name && user.name.trim().length > 0) {
    return user.name.trim().split(' ')[0];
  }
  if (user.email && user.email.trim().length > 0) {
    return user.email.trim().split('@')[0];
  }
  return 'Parent';
}

/**
 * Immutably adds or removes an event ID from a list of bookmarked IDs.
 */
export function toggleBookmarkState(eventId: string, bookmarkedIds: string[]): string[] {
  if (!eventId) return bookmarkedIds;
  if (bookmarkedIds.includes(eventId)) {
    return bookmarkedIds.filter((id) => id !== eventId);
  }
  return [...bookmarkedIds, eventId];
}
