'use client';

import * as React from 'react';

/** Horizontal movement must exceed this before drag-scroll activates. */
const DRAG_THRESHOLD_PX = 8;

type DragState = {
  pending: boolean;
  isDragging: boolean;
  didDrag: boolean;
  startX: number;
  startY: number;
  scrollLeft: number;
};

type UseDragToScrollOptions = {
  /**
   * Only start drag when mousedown is inside this selector (within the scroll container).
   * Defaults to `thead` so body text stays selectable.
   */
  handleSelector?: string;
};

export function useDragToScroll<T extends HTMLElement>(options?: UseDragToScrollOptions) {
  const handleSelector = options?.handleSelector ?? 'thead';
  const ref = React.useRef<T>(null);
  const state = React.useRef<DragState>({
    pending: false,
    isDragging: false,
    didDrag: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
  });

  const endDrag = React.useCallback(() => {
    const el = ref.current;
    const s = state.current;
    s.pending = false;
    s.isDragging = false;
    if (el) {
      el.removeAttribute('data-drag-scrolling');
    }
  }, []);

  const activateDrag = React.useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const s = state.current;
    s.pending = false;
    s.isDragging = true;
    s.didDrag = true;
    s.startX = clientX;
    s.scrollLeft = el.scrollLeft;
    el.setAttribute('data-drag-scrolling', 'true');
    window.getSelection()?.removeAllRanges();
  }, []);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function isOnHandle(target: EventTarget | null) {
      if (!(target instanceof Element)) return false;
      const handle = target.closest(handleSelector);
      return Boolean(handle && el!.contains(handle));
    }

    function onMouseDown(event: MouseEvent) {
      if (event.button !== 0) return;
      if (!isOnHandle(event.target)) return;

      const container = ref.current;
      if (!container) return;

      const s = state.current;
      s.pending = true;
      s.didDrag = false;
      s.startX = event.clientX;
      s.startY = event.clientY;
      s.scrollLeft = container.scrollLeft;
    }

    function onMouseMove(event: MouseEvent) {
      const s = state.current;
      const container = ref.current;
      if (!container) return;

      if (s.pending && !s.isDragging) {
        const dx = Math.abs(event.clientX - s.startX);
        const dy = Math.abs(event.clientY - s.startY);

        if (dx > DRAG_THRESHOLD_PX && dx > dy) {
          activateDrag(event.clientX);
        } else if (dy > DRAG_THRESHOLD_PX && dy >= dx) {
          s.pending = false;
          return;
        }
      }

      if (!s.isDragging) return;

      event.preventDefault();
      const dx = event.clientX - s.startX;
      container.scrollLeft = s.scrollLeft - dx;
    }

    function onMouseUp() {
      endDrag();
    }

    /** After a header drag, block the click so sort buttons don't fire. */
    function onClickCapture(event: MouseEvent) {
      if (!state.current.didDrag) return;
      if (!isOnHandle(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      state.current.didDrag = false;
    }

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('click', onClickCapture, true);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('click', onClickCapture, true);
      endDrag();
    };
  }, [activateDrag, endDrag, handleSelector]);

  return ref;
}
