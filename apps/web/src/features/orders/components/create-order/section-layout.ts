/** Shared spacing for Orders module section cards — keep compact. */
/** `!pb-2` overrides CardHeader's `[.border-b]:pb-6` default. */
export const ORDER_SECTION_HEADER_CLASS = 'border-b px-4 py-2 !pb-2';
export const ORDER_SECTION_BODY_CLASS = 'p-3 pt-2';
export const ORDER_SECTION_GRID_GAP = 'gap-2.5';

export const ORDER_PAGE_GAP = 'space-y-5';
export const ORDER_CARD_CLASS = 'gap-0 py-0 shadow-none';
export const ORDER_SIDEBAR_GRID_CLASS = 'xl:grid-cols-[minmax(0,1fr)_min(360px,32%)]';

/** Below fixed dashboard header (h-14 / sm:h-16) with 1rem breathing room. */
export const ORDER_STICKY_TOP_CLASS = 'top-[calc(3.5rem+1rem)] sm:top-[calc(4rem+1rem)]';
export const ORDER_STICKY_MAX_H_CLASS =
  'max-h-[calc(100vh-3.5rem-1rem)] sm:max-h-[calc(100vh-4rem-1rem)]';

/** Sticky action/selection bars sit below dashboard header. */
export const ORDER_STICKY_ACTION_CLASS =
  'sticky z-30 -mx-4 border-b bg-background/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/80 top-[calc(3.5rem)] sm:top-[calc(4rem)]';
