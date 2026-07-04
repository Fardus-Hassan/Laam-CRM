export type StickyNoteColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple';

export type StickyNote = {
  id: string;
  text: string;
  updatedAt: string;
  /** Stuck on screen (floating) */
  stuck: boolean;
  /** Position as % of viewport (0–100) */
  x: number;
  y: number;
  /** Size in pixels */
  width: number;
  height: number;
  color: StickyNoteColor;
  minimized?: boolean;
  zIndex: number;
};

export const STICKY_MIN_WIDTH = 160;
export const STICKY_MAX_WIDTH = 480;
export const STICKY_MIN_HEIGHT = 120;
export const STICKY_MAX_HEIGHT = 520;
export const STICKY_DEFAULT_WIDTH = 220;
export const STICKY_DEFAULT_HEIGHT = 180;

export type QuickEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  note?: string;
};

/** Free-form note for a calendar day */
export type DayNote = {
  date: string;
  text: string;
  updatedAt: string;
};

const NOTES_KEY = 'laam-quick-sticky-notes-v2';
const EVENTS_KEY = 'laam-quick-events';
const DAY_NOTES_KEY = 'laam-quick-day-notes';

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

function nextZIndex(notes: StickyNote[]): number {
  return notes.reduce((max, n) => Math.max(max, n.zIndex), 10) + 1;
}

export function listStickyNotes(): StickyNote[] {
  return readJson<StickyNote[]>(NOTES_KEY, []).map(normalizeNote).sort((a, b) => b.zIndex - a.zIndex);
}

function clampSize(width: number, height: number) {
  return {
    width: Math.min(STICKY_MAX_WIDTH, Math.max(STICKY_MIN_WIDTH, width)),
    height: Math.min(STICKY_MAX_HEIGHT, Math.max(STICKY_MIN_HEIGHT, height)),
  };
}

function normalizeNote(n: StickyNote & { pinned?: boolean }): StickyNote {
  const size = clampSize(
    typeof n.width === 'number' ? n.width : STICKY_DEFAULT_WIDTH,
    typeof n.height === 'number' ? n.height : STICKY_DEFAULT_HEIGHT,
  );
  return {
    id: n.id,
    text: n.text ?? '',
    updatedAt: n.updatedAt ?? new Date().toISOString(),
    stuck: n.stuck ?? Boolean(n.pinned),
    x: typeof n.x === 'number' ? n.x : 20 + Math.random() * 40,
    y: typeof n.y === 'number' ? n.y : 15 + Math.random() * 30,
    width: size.width,
    height: size.height,
    color: n.color ?? 'yellow',
    minimized: n.minimized ?? false,
    zIndex: n.zIndex ?? 20,
  };
}

export function listStuckNotes(): StickyNote[] {
  return listStickyNotes().filter((n) => n.stuck);
}

export function createStickyNote(text = ''): StickyNote[] {
  const notes = listStickyNotes();
  const note: StickyNote = {
    id: `note-${Date.now()}`,
    text,
    updatedAt: new Date().toISOString(),
    stuck: true,
    x: 12 + (notes.length % 5) * 8,
    y: 12 + (notes.length % 4) * 10,
    width: STICKY_DEFAULT_WIDTH,
    height: STICKY_DEFAULT_HEIGHT,
    color: (['yellow', 'pink', 'blue', 'green', 'purple'] as const)[notes.length % 5],
    minimized: false,
    zIndex: nextZIndex(notes),
  };
  writeJson(NOTES_KEY, [note, ...notes]);
  return listStickyNotes();
}

export function updateStickyNote(
  id: string,
  patch: Partial<Pick<StickyNote, 'text' | 'x' | 'y' | 'width' | 'height' | 'color' | 'minimized' | 'stuck' | 'zIndex'>>,
): StickyNote[] {
  const notes = listStickyNotes().map((n) => {
    if (n.id !== id) return n;
    const next = {
      ...n,
      ...patch,
      updatedAt: patch.text !== undefined ? new Date().toISOString() : n.updatedAt,
    };
    const size = clampSize(next.width, next.height);
    return { ...next, width: size.width, height: size.height };
  });
  writeJson(NOTES_KEY, notes);
  return listStickyNotes();
}

export function bringStickyNoteToFront(id: string): StickyNote[] {
  const notes = listStickyNotes();
  const z = nextZIndex(notes);
  return updateStickyNote(id, { zIndex: z });
}

export function deleteStickyNote(id: string): StickyNote[] {
  writeJson(
    NOTES_KEY,
    listStickyNotes().filter((n) => n.id !== id),
  );
  return listStickyNotes();
}

/** @deprecated */
export function saveStickyNote(text: string, id?: string): StickyNote[] {
  if (id) return updateStickyNote(id, { text });
  return createStickyNote(text);
}

/** @deprecated */
export function togglePinStickyNote(id: string): StickyNote[] {
  const note = listStickyNotes().find((n) => n.id === id);
  if (!note) return listStickyNotes();
  return updateStickyNote(id, { stuck: !note.stuck });
}

export function listQuickEvents(): QuickEvent[] {
  return readJson<QuickEvent[]>(EVENTS_KEY, []).sort((a, b) =>
    a.date === b.date
      ? (a.time ?? '').localeCompare(b.time ?? '')
      : a.date.localeCompare(b.date),
  );
}

export function listEventsForDate(date: string): QuickEvent[] {
  return listQuickEvents().filter((e) => e.date === date);
}

export function saveQuickEvent(input: Omit<QuickEvent, 'id'> & { id?: string }): QuickEvent[] {
  const events = listQuickEvents();
  if (input.id) {
    writeJson(
      EVENTS_KEY,
      events.map((e) => (e.id === input.id ? { ...e, ...input, id: e.id } : e)),
    );
    return listQuickEvents();
  }
  const event: QuickEvent = {
    id: `evt-${Date.now()}`,
    title: input.title,
    date: input.date,
    time: input.time,
    note: input.note,
  };
  writeJson(EVENTS_KEY, [...events, event]);
  return listQuickEvents();
}

export function deleteQuickEvent(id: string): QuickEvent[] {
  writeJson(
    EVENTS_KEY,
    listQuickEvents().filter((e) => e.id !== id),
  );
  return listQuickEvents();
}

export function getDayNote(date: string): DayNote | null {
  const all = readJson<DayNote[]>(DAY_NOTES_KEY, []);
  return all.find((n) => n.date === date) ?? null;
}

export function saveDayNote(date: string, text: string): DayNote {
  const all = readJson<DayNote[]>(DAY_NOTES_KEY, []);
  const updatedAt = new Date().toISOString();
  const existing = all.findIndex((n) => n.date === date);
  const note: DayNote = { date, text, updatedAt };
  if (existing >= 0) {
    all[existing] = note;
  } else if (text.trim()) {
    all.push(note);
  }
  writeJson(
    DAY_NOTES_KEY,
    all.filter((n) => n.text.trim()),
  );
  return note;
}

export function datesWithContent(year: number, month: number): Set<string> {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const set = new Set<string>();
  for (const e of listQuickEvents()) {
    if (e.date.startsWith(prefix)) set.add(e.date);
  }
  for (const n of readJson<DayNote[]>(DAY_NOTES_KEY, [])) {
    if (n.date.startsWith(prefix) && n.text.trim()) set.add(n.date);
  }
  return set;
}

export function getTodayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const STICKY_COLORS: Record<StickyNoteColor, string> = {
  yellow: 'bg-amber-100 border-amber-300/80 text-amber-950 dark:bg-amber-900/90 dark:border-amber-700 dark:text-amber-50',
  pink: 'bg-pink-100 border-pink-300/80 text-pink-950 dark:bg-pink-900/90 dark:border-pink-700 dark:text-pink-50',
  blue: 'bg-sky-100 border-sky-300/80 text-sky-950 dark:bg-sky-900/90 dark:border-sky-700 dark:text-sky-50',
  green: 'bg-emerald-100 border-emerald-300/80 text-emerald-950 dark:bg-emerald-900/90 dark:border-emerald-700 dark:text-emerald-50',
  purple: 'bg-violet-100 border-violet-300/80 text-violet-950 dark:bg-violet-900/90 dark:border-violet-700 dark:text-violet-50',
};
