'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  StickyNote,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  datesWithContent,
  deleteQuickEvent,
  getDayNote,
  getTodayIsoDate,
  listEventsForDate,
  listQuickEvents,
  saveDayNote,
  saveQuickEvent,
  type QuickEvent,
} from '@/features/quick-bar/data/quick-bar-store';
import {
  ORDER_CARD_CLASS,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function monthLabel(year: number, month: number, compact?: boolean): string {
  return new Date(year, month, 1).toLocaleString('en-GB', {
    month: compact ? 'short' : 'long',
    year: 'numeric',
  });
}

function formatSelectedDate(iso: string, today: string): string {
  if (iso === today) return 'Today';
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function FullCalendarPage() {
  const today = getTodayIsoDate();
  const initial = new Date();
  const [year, setYear] = React.useState(initial.getFullYear());
  const [month, setMonth] = React.useState(initial.getMonth());
  const [selected, setSelected] = React.useState(today);
  const [events, setEvents] = React.useState<QuickEvent[]>([]);
  const [dayNote, setDayNote] = React.useState('');
  const [eventTitle, setEventTitle] = React.useState('');
  const [eventTime, setEventTime] = React.useState('');
  const [animKey, setAnimKey] = React.useState(0);
  const detailRef = React.useRef<HTMLDivElement>(null);

  const marked = React.useMemo(() => datesWithContent(year, month), [year, month, events, dayNote]);

  React.useEffect(() => {
    setEvents(listQuickEvents());
    setDayNote(getDayNote(selected)?.text ?? '');
  }, [selected]);

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setAnimKey((k) => k + 1);
  }

  function selectDay(day: number) {
    setSelected(toIso(year, month, day));
    // On small screens, bring the day panel into view after selecting
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      window.setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }

  function handleAddEvent() {
    if (!eventTitle.trim()) return;
    setEvents(
      saveQuickEvent({
        title: eventTitle.trim(),
        date: selected,
        time: eventTime || undefined,
      }),
    );
    setEventTitle('');
    setEventTime('');
    toast.success('Event added');
  }

  function handleSaveDayNote() {
    saveDayNote(selected, dayNote);
    toast.success('Day note saved');
  }

  const dayEvents = listEventsForDate(selected);
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <PageShell
      title="Calendar"
      description="Month view — events and personal notes by date."
    >
      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start">
        <Card className={cn(ORDER_CARD_CLASS, 'min-w-0 overflow-hidden')}>
          <CardHeader
            className={cn(
              ORDER_SECTION_HEADER_CLASS,
              'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
            )}
          >
            <div className="flex min-w-0 items-center justify-between gap-1 sm:justify-start sm:gap-2">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-9 shrink-0 sm:size-8"
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <CardTitle className="min-w-0 flex-1 truncate text-center text-sm sm:min-w-[9rem] sm:flex-none sm:text-base">
                <span className="sm:hidden">{monthLabel(year, month, true)}</span>
                <span className="hidden sm:inline">{monthLabel(year, month)}</span>
              </CardTitle>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-9 shrink-0 sm:size-8"
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full shrink-0 sm:w-auto"
              onClick={() => {
                const d = new Date();
                setYear(d.getFullYear());
                setMonth(d.getMonth());
                setSelected(today);
                setAnimKey((k) => k + 1);
              }}
            >
              Today
            </Button>
          </CardHeader>
          <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'px-2 sm:px-4')}>
            <div
              key={animKey}
              className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
            >
              <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-muted-foreground sm:mb-2 sm:gap-1 sm:text-[11px]">
                {WEEKDAYS.map((d, i) => (
                  <div key={`${d}-${i}`} className="py-1">
                    <span className="sm:hidden">{WEEKDAYS_SHORT[i]}</span>
                    <span className="hidden sm:inline">{d}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {cells.map((day, i) => {
                  if (day == null) {
                    return (
                      <div
                        key={`e-${i}`}
                        className="min-h-9 rounded-md sm:aspect-square sm:min-h-0 sm:rounded-lg"
                      />
                    );
                  }
                  const iso = toIso(year, month, day);
                  const isToday = iso === today;
                  const isSelected = iso === selected;
                  const hasContent = marked.has(iso);
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => selectDay(day)}
                      className={cn(
                        'relative flex min-h-9 flex-col items-center justify-center rounded-md text-xs transition-colors duration-200 sm:aspect-square sm:min-h-0 sm:rounded-xl sm:text-sm sm:transition-all',
                        'hover:bg-muted active:bg-muted',
                        'sm:hover:scale-[1.03]',
                        isSelected && 'bg-primary text-primary-foreground shadow-md hover:bg-primary active:bg-primary',
                        !isSelected && isToday && 'ring-2 ring-primary/40',
                      )}
                    >
                      <span className="font-medium tabular-nums">{day}</span>
                      {hasContent ? (
                        <span
                          className={cn(
                            'mt-0.5 size-1 rounded-full sm:size-1.5',
                            isSelected ? 'bg-primary-foreground' : 'bg-primary',
                          )}
                        />
                      ) : (
                        <span className="mt-0.5 size-1 sm:size-1.5" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div
          ref={detailRef}
          className="min-w-0 scroll-mt-16 space-y-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 sm:space-y-4 lg:slide-in-from-right-2"
          key={selected}
        >
          <Card className={cn(ORDER_CARD_CLASS, 'min-w-0')}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="truncate text-sm">
                {formatSelectedDate(selected, today)}
              </CardTitle>
            </CardHeader>
            <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3')}>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                <input
                  className="h-9 min-w-0 w-full flex-1 rounded-md border border-input bg-background px-3 text-sm"
                  placeholder="Event title…"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddEvent()}
                />
                <div className="flex gap-2">
                  <input
                    type="time"
                    className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm sm:w-[7rem] sm:flex-none"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="size-9 shrink-0"
                    onClick={handleAddEvent}
                    aria-label="Add event"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>

              {!dayEvents.length ? (
                <p className="text-sm text-muted-foreground">
                  No events — add meetings or reminders.
                </p>
              ) : (
                <ul className="space-y-2">
                  {dayEvents.map((ev) => (
                    <li
                      key={ev.id}
                      className="flex min-w-0 items-start justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="break-words font-medium">{ev.title}</p>
                        {ev.time ? (
                          <Badge variant="outline" className="mt-1 text-[10px]">
                            {ev.time}
                          </Badge>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7 shrink-0 text-destructive"
                        onClick={() => {
                          setEvents(deleteQuickEvent(ev.id));
                        }}
                        aria-label="Delete event"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className={cn(ORDER_CARD_CLASS, 'min-w-0')}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="flex items-center gap-2 text-sm">
                <StickyNote className="size-4 shrink-0 text-primary" />
                Day note
              </CardTitle>
            </CardHeader>
            <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-2')}>
              <textarea
                className="min-h-[100px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring sm:min-h-[120px]"
                placeholder="Personal notes for this date…"
                value={dayNote}
                onChange={(e) => setDayNote(e.target.value)}
              />
              <Button
                type="button"
                size="sm"
                className="w-full sm:w-auto"
                onClick={handleSaveDayNote}
              >
                Save day note
              </Button>
            </CardContent>
          </Card>

          <Button type="button" size="sm" variant="outline" className="w-full sm:w-auto" asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
