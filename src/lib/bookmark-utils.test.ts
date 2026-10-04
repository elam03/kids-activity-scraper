import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getUserInitials,
  getUserFirstName,
  toggleBookmarkState,
} from './bookmark-utils';

test('getUserInitials extracts first letter or fallback', () => {
  assert.equal(getUserInitials({ name: 'Jane Doe', email: 'jane@example.com' }), 'J');
  assert.equal(getUserInitials({ name: null, email: 'alex@example.com' }), 'A');
  assert.equal(getUserInitials(null), 'P');
});

test('getUserFirstName returns first name only', () => {
  assert.equal(getUserFirstName({ name: 'Jane Doe', email: 'jane@example.com' }), 'Jane');
  assert.equal(getUserFirstName({ name: 'Bob', email: 'bob@example.com' }), 'Bob');
  assert.equal(getUserFirstName({ name: null, email: 'parent@example.com' }), 'parent');
  assert.equal(getUserFirstName(null), 'Parent');
});

test('toggleBookmarkState immutably adds and removes event IDs', () => {
  const initial: string[] = ['evt-1', 'evt-2'];

  const added = toggleBookmarkState('evt-3', initial);
  assert.deepEqual(added, ['evt-1', 'evt-2', 'evt-3']);

  const removed = toggleBookmarkState('evt-2', added);
  assert.deepEqual(removed, ['evt-1', 'evt-3']);

  const removedLast = toggleBookmarkState('evt-1', removed);
  assert.deepEqual(removedLast, ['evt-3']);
});
