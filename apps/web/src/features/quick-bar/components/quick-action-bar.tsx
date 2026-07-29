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
  StickyNote,
  Users,
  X,
  Zap,
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
  { id: 'order', label: 'New order', href: '/dashboard/orders/new', icon: ShoppingCart },
  { id: 'followups', label: 'Follow-ups', href: '/dashboard/followups', icon: Phone },
  { id: 'tasks', label: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
  { id: 'customers', label: 'Customers', href: '/dashboard/customers', icon: Users },
  { id: 'knowledge', label: 'Knowledge', href: '/dashboard/knowledge', icon: BookOpen },
] as const;

export function QuickActionBar() {
  const [open, setOpen] = React.useState(false);
  const [notesVersion, setNotesVersion] = React.useState(0);
  const [followups, setFollowups] = React.useState(0);
  const [tasks, setTasks] = React.useState(0);
  const [lowStock, setLowStock] = React.useState(0);

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

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:justify-end sm:p-0">
        <div
          className={cn(
            'pointer-events-auto flex max-w-[calc(100vw-1rem)] items-center gap-0.5 rounded-2xl border bg-background/95 p-1 shadow-lg backdrop-blur transition-all duration-300 supports-[backdrop-filter]:bg-background/80 sm:max-w-none sm:gap-1 sm:p-1.5',
            open && 'animate-in fade-in-0 zoom-in-95',
          )}
        >
          {!open ? (
            <Button
              type="button"
              size="icon"
              className="size-12 rounded-xl shadow-md transition-transform hover:scale-105 active:scale-95"
              onClick={() => setOpen(true)}
              aria-label="Open quick actions"
            >
              <Zap className="size-5" />
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-0.5 overflow-x-auto px-0.5">
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
                <div className="mx-1 hidden h-8 w-px bg-border sm:block" />
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
                className="size-9 shrink-0 rounded-lg"
                onClick={() => setOpen(false)}
                aria-label="Close quick actions"
              >
                <X className="size-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function QuickIconButton({
  label,
  icon: Icon,
  onClick,
  badge,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex h-10 min-w-10 flex-col items-center justify-center rounded-xl px-2.5 text-[10px] font-medium text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground active:scale-95"
      title={label}
    >
      <Icon className="size-4" />
      <span className="mt-0.5 hidden sm:block">{label}</span>
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-semibold text-amber-950">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
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
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  onNavigate?: () => void;
  tone?: 'warn';
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'relative flex h-10 min-w-10 flex-col items-center justify-center rounded-xl px-2.5 text-[10px] font-medium text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground active:scale-95',
        tone === 'warn' && 'text-amber-700 hover:bg-amber-500/10 dark:text-amber-400',
      )}
      title={label}
    >
      <Icon className="size-4" />
      <span className="mt-0.5 hidden sm:block">{label}</span>
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-semibold text-amber-950">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </Link>
  );
}
