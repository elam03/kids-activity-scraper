import test from 'node:test';
import assert from 'node:assert/strict';
import {
  lockBodyScroll,
  getActiveModalLockCount,
  MODAL_BACKDROP_CLASSES,
  MODAL_SCROLL_CONTAINER_CLASSES,
} from './modal-scroll-lock';

test('lockBodyScroll manages body overflow and reference count safely', () => {
  // Simulate mock DOM document.body
  const mockBody = {
    style: {
      overflow: '',
    },
  };

  // Lock 1: First modal opens
  const unlock1 = lockBodyScroll(mockBody as any);
  assert.equal(mockBody.style.overflow, 'hidden');
  assert.equal(getActiveModalLockCount(), 1);

  // Lock 2: Second stacked modal opens on top (e.g. EventDetailModal over DayDetailModal)
  const unlock2 = lockBodyScroll(mockBody as any);
  assert.equal(mockBody.style.overflow, 'hidden');
  assert.equal(getActiveModalLockCount(), 2);

  // Release Lock 2: Still 1 modal open -> body must stay hidden
  unlock2();
  assert.equal(mockBody.style.overflow, 'hidden');
  assert.equal(getActiveModalLockCount(), 1);

  // Release Lock 1: All modals closed -> body restored
  unlock1();
  assert.equal(mockBody.style.overflow, '');
  assert.equal(getActiveModalLockCount(), 0);
});

test('lockBodyScroll preserves pre-existing inline overflow style', () => {
  const mockBody = {
    style: {
      overflow: 'auto',
    },
  };

  const unlock = lockBodyScroll(mockBody as any);
  assert.equal(mockBody.style.overflow, 'hidden');

  unlock();
  assert.equal(mockBody.style.overflow, 'auto');
  assert.equal(getActiveModalLockCount(), 0);
});

test('MODAL CSS utility constants contain overscroll-contain for scroll containment', () => {
  assert.ok(
    MODAL_BACKDROP_CLASSES.includes('overscroll-contain'),
    'Backdrop must include overscroll-contain to isolate scroll events'
  );
  assert.ok(
    MODAL_SCROLL_CONTAINER_CLASSES.includes('overscroll-contain'),
    'Scroll container must include overscroll-contain to prevent scroll bleed'
  );
});
