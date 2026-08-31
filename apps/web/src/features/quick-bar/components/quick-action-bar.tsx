'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  Package,
  Phone,
  ShoppingCart,
  Sparkles,
  StickyNote,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { FloatingStickyNotes } from '@/features/quick-bar/components/floating-sticky-notes';
import {
  createStickyNote,
  getTodayIsoDate,
  listEventsForDate,
  listStuckNotes,
} from '@/features/quick-bar/data/quick-bar-store';
import { followupsApi } from '@/features/followups/api/followups-api';
import { tasksApi } from '@/features/tasks/api/tasks-api';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import { cn } from '@/lib/utils';

const QUICK_LINKS = [
  { id: 'order', label: 'Order', href: '/dashboard/orders/new', icon: ShoppingCart },
  { id: 'followups', label: 'Follow-ups', href: '/dashboard/followups', icon: Phone },
  { id: 'tasks', label: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
  { id: 'customers', label: 'Customers', href: '/dashboard/customers', icon: Users },
  { id: 'knowledge', label: 'Knowledge', href: '/dashboard/knowledge', icon: BookOpen },
] as const;

const ITEM_CLASS =
  'relative flex h-11 w-[4.25rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-medium leading-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95';

/**
 * Right-edge docked quick launcher — vertically centered on desktop.
 * Mobile: bottom-right FAB with horizontal action sheet when open.
 */
export function QuickActionBar() {
  const [open, setOpen] = React.useState(false);
  const [notesVersion, setNotesVersion] = React.useState(0);
  const [followups, setFollowups] = React.useState(0);
  const [tasks, setTasks] = React.useState(0);
  const [lowStock, setLowStock] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);

  const stuckCount = listStuckNotes().length;
  const todayEvents = listEventsForDate(getTodayIsoDate()).length;

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [taskRes, fuRes, invRes] = await Promise.all([
          tasksApi.listTasks({ filter: 'today', page: 1, pageSize: 1 }),
          followupsApi.listFollowups({ queue: 1, filter: 'today', page: 1, pageSize: 1 }),
          inventoryApi.listProducts({ page: 1, pageSize: 1, filter: 'low_stock' }).catch(() => null),
        ]);
        if (cancelled) return;
        setTasks(taskRes.summary?.todayCount ?? taskRes.total ?? 0);
        setFollowups(fuRes.summary?.todayCount ?? fuRes.total ?? 0);
        setLowStock(invRes?.summary?.lowStockCount ?? 0);
      } catch {
        if (!cancelled) {
          setTasks(0);
          setFollowups(0);
          setLowStock(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function handleNewSticky() {
    createStickyNote('');
    setNotesVersion((v) => v + 1);
    setOpen(true);
    toast.success('Sticky note — drag it anywhere on screen');
  }

  return (
    <>
      <FloatingStickyNotes
        version={notesVersion}
        onChange={() => setNotesVersion((v) => v + 1)}
      />

      <div
        ref={rootRef}
        className={cn(
          'pointer-events-none fixed z-40',
          /* Mobile: bottom-right FAB */
          'right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-auto flex flex-col items-end gap-2',
          /* Desktop: vertical middle, right edge */
          'sm:inset-x-auto sm:bottom-auto sm:left-auto sm:right-0 sm:top-1/2 sm:-translate-y-1/2 sm:gap-0',
        )}
      >
        <div
          className={cn(
            'pointer-events-auto flex items-center gap-0.5 backdrop-blur supports-[backdrop-filter]:bg-background/85',
            open
              ? 'max-w-[calc(100vw-1.5rem)] rounded-2xl border bg-background/95 p-1 shadow-xl sm:max-w-none sm:rounded-l-2xl sm:rounded-r-none sm:border-r-0 sm:shadow-lg'
              : 'border-0 bg-transparent p-0 shadow-none sm:rounded-l-2xl sm:rounded-r-none sm:border sm:bg-background/95 sm:p-0 sm:shadow-lg',
            open && 'flex-row-reverse sm:flex-row',
          )}
        >
          {!open ? (
            <Button
              type="button"
              size="icon"
              className={cn(
                'size-14 shrink-0 rounded-full shadow-lg shadow-primary/30 ring-2 ring-primary/15',
                'bg-primary text-primary-foreground transition-transform hover:bg-primary/90 hover:scale-[1.02] active:scale-95',
                'sm:size-12 sm:rounded-l-2xl sm:rounded-r-none sm:shadow-md sm:ring-0',
              )}
              onClick={() => setOpen(true)}
              aria-label="Open quick actions"
              aria-expanded={false}
            >
              <Sparkles className="size-6 shrink-0 sm:size-5" strokeWidth={2} />
            </Button>
          ) : (
            <>
              <div className="flex max-w-[calc(100vw-5rem)] items-center gap-0.5 overflow-x-auto sm:max-w-[min(32rem,72vw)]">
                <QuickIconButton
                  label="Sticky"
                  icon={StickyNote}
                  badge={stuckCount || undefined}
                  onClick={handleNewSticky}
                />
                <QuickLinkButton
                  href="/dashboard/calendar"
                  label="Calendar"
                  icon={CalendarDays}
                  badge={todayEvents || undefined}
                  onNavigate={() => setOpen(false)}
                />
                <div className="mx-0.5 hidden h-8 w-px shrink-0 bg-border sm:block" aria-hidden />
                {QUICK_LINKS.map((link) => (
                  <QuickLinkButton
                    key={link.id}
                    href={link.href}
                    label={link.label}
                    icon={link.icon}
                    badge={
                      link.id === 'followups'
                        ? followups || undefined
                        : link.id === 'tasks'
                          ? tasks || undefined
                          : undefined
                    }
                    onNavigate={() => setOpen(false)}
                  />
                ))}
                {lowStock > 0 ? (
                  <QuickLinkButton
                    href="/dashboard/inventory/products?filter=low_stock"
                    label="Low stock"
                    icon={Package}
                    badge={lowStock}
                    onNavigate={() => setOpen(false)}
                    tone="warn"
                  />
                ) : null}
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-9 shrink-0 self-center rounded-lg"
                onClick={() => setOpen(false)}
                aria-label="Close quick actions"
                aria-expanded={true}
              >
                <X className="size-4 shrink-0" />
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function QuickGlyph({
  icon: Icon,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <span className="flex size-4 shrink-0 items-center justify-center">
      <Icon className="size-4" strokeWidth={2} />
    </span>
  );
}

function QuickIconButton({
  label,
  icon: Icon,
  onClick,
  badge,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button type="button" onClick={onClick} className={ITEM_CLASS} title={label}>
      <QuickGlyph icon={Icon} />
      <span className="max-w-full truncate">{label}</span>
      {badge ? <QuickBadge value={badge} /> : null}
    </button>
  );
}

function QuickLinkButton({
  href,
  label,
  icon: Icon,
  badge,
  onNavigate,
  tone,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: number;
  onNavigate?: () => void;
  tone?: 'warn';
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        ITEM_CLASS,
        tone === 'warn' && 'text-amber-700 hover:bg-amber-500/10 dark:text-amber-400',
      )}
      title={label}
    >
      <QuickGlyph icon={Icon} />
      <span className="max-w-full truncate">{label}</span>
      {badge ? <QuickBadge value={badge} /> : null}
    </Link>
  );
}

function QuickBadge({ value }: { value: number }) {
  return (
    <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-semibold leading-none text-amber-950">
      {value > 9 ? '9+' : value}
    </span>
  );
}
