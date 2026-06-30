'use client';

import * as React from 'react';

const INTERACTIVE_SELECTOR =
  'a, button, input, textarea, select, [role="checkbox"], [data-no-drag-scroll]';

/** Horizontal movement must exceed this before drag-scroll activates. */
const DRAG_THRESHOLD_PX = 10;

type DragState = {
  pending: boolean;
  isDragging: boolean;
  startX: number;
  startY: number;
  scrollLeft: number;
  rightHoldTimer: ReturnType<typeof setTimeout> | null;
  rightHoldActive: boolean;
};

export function useDragToScroll<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const state = React.useRef<DragState>({
    pending: false,
    isDragging: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    rightHoldTimer: null,
    rightHoldActive: false,
  });

  const endDrag = React.useCallback(() => {
    const el = ref.current;
    const s = state.current;
    if (s.rightHoldTimer) {
      clearTimeout(s.rightHoldTimer);
      s.rightHoldTimer = null;
    }
    s.pending = false;
    s.isDragging = false;
    s.rightHoldActive = false;
    if (el) {
      el.removeAttribute('data-drag-scrolling');
      el.style.cursor = '';
    }
  }, []);

  const activateDrag = React.useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const s = state.current;
    s.pending = false;
    s.isDragging = true;
    s.startX = clientX;
    s.scrollLeft = el.scrollLeft;
    el.setAttribute('data-drag-scrolling', 'true');
    el.style.cursor = 'grabbing';
  }, []);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    function isInteractiveTarget(target: EventTarget | null) {
      return Boolean(
        target instanceof Element && target.closest(INTERACTIVE_SELECTOR),
      );
    }

    function hasTextSelection() {
      const selection = window.getSelection();
      return Boolean(selection && selection.toString().length > 0);
    }

    function onMouseDown(event: MouseEvent) {
      if (isInteractiveTarget(event.target)) {
        return;
      }

      const container = ref.current;
      if (!container) {
        return;
      }

      if (event.button === 0) {
        const s = state.current;
        s.pending = true;
        s.startX = event.clientX;
        s.startY = event.clientY;
        s.scrollLeft = container.scrollLeft;
        return;
      }

      if (event.button === 2) {
        state.current.rightHoldTimer = setTimeout(() => {
          state.current.rightHoldActive = true;
          activateDrag(event.clientX);
        }, 500);
      }
    }

    function onMouseMove(event: MouseEvent) {
      const s = state.current;
      const container = ref.current;
      if (!container) {
        return;
      }

      if (s.pending && !s.isDragging) {
        const dx = Math.abs(event.clientX - s.startX);
        const dy = Math.abs(event.clientY - s.startY);

        if (hasTextSelection()) {
          s.pending = false;
          return;
        }

        if (dx > DRAG_THRESHOLD_PX && dx > dy * 1.2) {
          activateDrag(event.clientX);
        } else if (dy > DRAG_THRESHOLD_PX && dy >= dx) {
          s.pending = false;
          return;
        }
      }

      if (!s.isDragging) {
        return;
      }

      event.preventDefault();
      const dx = event.clientX - s.startX;
      container.scrollLeft = s.scrollLeft - dx;
    }

    function onMouseUp() {
      endDrag();
    }

    function onContextMenu(event: MouseEvent) {
      const s = state.current;
      if (s.isDragging || s.rightHoldActive) {
        event.preventDefault();
      }
      if (s.rightHoldTimer) {
        clearTimeout(s.rightHoldTimer);
        s.rightHoldTimer = null;
      }
    }

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('contextmenu', onContextMenu);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('contextmenu', onContextMenu);
      endDrag();
    };
  }, [activateDrag, endDrag]);

  return ref;
}
