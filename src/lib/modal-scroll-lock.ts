import { useEffect } from 'react';

let activeLockCount = 0;
let originalOverflow: string | null = null;

export const MODAL_BACKDROP_CLASSES =
  'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 overscroll-contain';

export const MODAL_SCROLL_CONTAINER_CLASSES =
  'overflow-y-auto overscroll-contain';

/**
 * Returns the current count of active modal locks (for verification and debugging).
 */
export function getActiveModalLockCount(): number {
  return activeLockCount;
}

/**
 * Locks document.body scroll by setting overflow to hidden while preserving
 * previous styles and supporting multiple nested/stacked modals safely.
 */
export function lockBodyScroll(targetBody?: { style: { overflow: string } }): () => void {
  const body =
    targetBody || (typeof document !== 'undefined' ? document.body : null);

  if (!body) {
    return () => {};
  }

  if (activeLockCount === 0) {
    originalOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
  }

  activeLockCount++;
  let released = false;

  return () => {
    if (released) return;
    released = true;
    activeLockCount = Math.max(0, activeLockCount - 1);

    if (activeLockCount === 0 && originalOverflow !== null) {
      body.style.overflow = originalOverflow;
      originalOverflow = null;
    }
  };
}

/**
 * React hook to lock body scrolling while a modal is mounted/open.
 */
export function useBodyScrollLock(isLocked: boolean = true): void {
  useEffect(() => {
    if (!isLocked) return;
    const unlock = lockBodyScroll();
    return () => {
      unlock();
    };
  }, [isLocked]);
}
