'use client';

import * as React from 'react';
import { CalendarClock, CalendarPlus, Check, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { FormInput } from '@/components/form/form-input';
import { useOrderMutations } from '@/features/orders/hooks/use-order-mutations';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export type FollowUpTone = 'none' | 'upcoming' | 'today' | 'overdue';

function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function getFollowUpTone(followUpDueAt?: string | null): FollowUpTone {
  if (!followUpDueAt) return 'none';
  const due = startOfLocalDay(new Date(followUpDueAt));
  if (Number.isNaN(due.getTime())) return 'none';
  const today = startOfLocalDay(new Date());
  if (due.getTime() < today.getTime()) return 'overdue';
  if (due.getTime() === today.getTime()) return 'today';
  return 'upcoming';
}

function toDateInputValue(value?: string | null): string {
  if (value) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  }
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
}

function addDaysLocal(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toneLabel(tone: FollowUpTone, followUpDueAt?: string | null): string {
  if (tone === 'none') return 'No follow-up set';
  if (tone === 'overdue') return `Overdue · ${formatDate(followUpDueAt!)}`;
  if (tone === 'today') return `Due today · ${formatDate(followUpDueAt!)}`;
  return `Scheduled · ${formatDate(followUpDueAt!)}`;
}

type OrderFollowUpControlProps = {
  orderId: string;
  orderNumber?: string;
  followUpDueAt?: string | null;
  followUpSetAt?: string | null;
  /** Called after successful save so lists/detail can refresh. */
  onSaved?: (followUpDueAt: string) => void;
  /**
   * `icon` — dense table control.
   * `panel` — order detail card with full schedule UI.
   */
  variant?: 'icon' | 'panel';
  className?: string;
};

/**
 * View + set order follow-up schedule. Uses bulk follow-up API (single order).
 */
export function OrderFollowUpControl({
  orderId,
  orderNumber,
  followUpDueAt,
  followUpSetAt,
  onSaved,
  variant = 'icon',
  className,
}: OrderFollowUpControlProps) {
  const { bulkSetFollowUp } = useOrderMutations();
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState(() => toDateInputValue(followUpDueAt));
  const [saving, setSaving] = React.useState(false);

  const tone = getFollowUpTone(followUpDueAt);
  const hasFollowUp = tone !== 'none';

  React.useEffect(() => {
    if (open) {
      setDate(toDateInputValue(followUpDueAt));
    }
  }, [open, followUpDueAt]);

  async function handleSave() {
    if (!date.trim()) return;
    setSaving(true);
    try {
      await bulkSetFollowUp([orderId], date.trim());
      const iso = new Date(`${date.trim()}T12:00:00`).toISOString();
      onSaved?.(iso);
      setOpen(false);
    } catch {
      // toast from mutation
    } finally {
      setSaving(false);
    }
  }

  const quickDays = [
    { label: 'Tomorrow', value: addDaysLocal(1) },
    { label: '+3 days', value: addDaysLocal(3) },
    { label: '+1 week', value: addDaysLocal(7) },
  ];

  const triggerIconClass = cn(
    'size-3.5',
    tone === 'overdue' && 'text-destructive',
    tone === 'today' && 'text-amber-500',
    tone === 'upcoming' && 'text-primary',
    tone === 'none' && 'text-muted-foreground',
  );

  const popoverBody = (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold leading-none">Follow-up</p>
            {orderNumber ? (
              <p className="mt-1 text-[11px] text-muted-foreground">{orderNumber}</p>
            ) : null}
          </div>
          {hasFollowUp ? (
            <Badge
              variant={
                tone === 'overdue' ? 'destructive' : tone === 'today' ? 'warning' : 'secondary'
              }
              className="rounded-md font-normal capitalize"
            >
              {tone === 'overdue' ? 'Overdue' : tone === 'today' ? 'Today' : 'Scheduled'}
            </Badge>
          ) : (
            <Badge variant="outline" className="rounded-md font-normal">
              Not set
            </Badge>
          )}
        </div>
        {hasFollowUp ? (
          <p className="text-xs text-muted-foreground">
            Due <span className="font-medium text-foreground">{formatDate(followUpDueAt!)}</span>
            {followUpSetAt ? (
              <>
                {' '}
                · set {formatDate(followUpSetAt)}
              </>
            ) : null}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Pick a callback date. Order goes to On Hold; on that date it moves to Hold
            Followup. If still unresolved at day end, it returns to On Hold.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {quickDays.map((q) => (
          <Button
            key={q.label}
            type="button"
            size="sm"
            variant={date === q.value ? 'secondary' : 'outline'}
            className="h-7 px-2 text-xs"
            onClick={() => setDate(q.value)}
            disabled={saving}
          >
            {q.label}
          </Button>
        ))}
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`follow-up-${orderId}`} className="text-xs font-medium text-muted-foreground">
          Due date
        </label>
        <FormInput
          id={`follow-up-${orderId}`}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={saving}
          className="h-9"
        />
      </div>

      <Button
        type="button"
        className="w-full"
        disabled={saving || !date.trim()}
        onClick={() => void handleSave()}
      >
        {saving ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Check className="size-3.5" />
        )}
        {hasFollowUp ? 'Update follow-up' : 'Set follow-up'}
      </Button>
    </div>
  );

  if (variant === 'panel') {
    return (
      <div
        className={cn(
          'space-y-3 rounded-lg border border-border/70 bg-muted/20 p-2.5',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Follow-up
            </p>
            <p className="text-sm font-semibold leading-snug">
              {hasFollowUp ? formatDate(followUpDueAt!) : 'Not scheduled'}
            </p>
            <p className="text-[11px] text-muted-foreground">{toneLabel(tone, followUpDueAt)}</p>
          </div>
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-md border',
              tone === 'overdue' && 'border-destructive/40 bg-destructive/10',
              tone === 'today' && 'border-amber-500/40 bg-amber-500/10',
              tone === 'upcoming' && 'border-primary/30 bg-primary/10',
              tone === 'none' && 'border-border bg-background',
            )}
          >
            {hasFollowUp ? (
              <CalendarClock className={cn('size-4', triggerIconClass)} />
            ) : (
              <CalendarPlus className={cn('size-4', triggerIconClass)} />
            )}
          </span>
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="outline" className="h-8 w-full text-xs">
              {hasFollowUp ? 'View / change' : 'Schedule follow-up'}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-3" side="left">
            {popoverBody}
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // Compact icon control for orders table
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            'size-6 shrink-0 p-0',
            tone === 'overdue' && 'border-destructive/50',
            tone === 'today' && 'border-amber-500/50',
            tone === 'upcoming' && 'border-primary/40',
            hasFollowUp && 'ring-1 ring-inset',
            tone === 'overdue' && 'ring-destructive/30',
            tone === 'today' && 'ring-amber-500/30',
            tone === 'upcoming' && 'ring-primary/25',
            className,
          )}
          aria-label={toneLabel(tone, followUpDueAt)}
          title={`${toneLabel(tone, followUpDueAt)} · Click to set or change`}
          data-no-drag-scroll
        >
          {hasFollowUp ? (
            <CalendarClock className={triggerIconClass} />
          ) : (
            <CalendarPlus className={triggerIconClass} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3" side="bottom">
        {popoverBody}
      </PopoverContent>
    </Popover>
  );
}
