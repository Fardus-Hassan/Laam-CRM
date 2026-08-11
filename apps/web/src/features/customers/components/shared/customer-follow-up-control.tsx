'use client';

import * as React from 'react';
import { CalendarClock, CalendarPlus, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { FormInput } from '@/components/form/form-input';
import { followupsApi } from '@/features/followups/api/followups-api';
import {
  getFollowUpTone,
  type FollowUpTone,
} from '@/features/orders/components/shared/order-follow-up-control';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

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

function toneLabel(tone: FollowUpTone, followUpDue?: string | null): string {
  if (tone === 'none') return 'No follow-up set';
  if (tone === 'overdue') return `Overdue · ${formatDate(followUpDue!)}`;
  if (tone === 'today') return `Due today · ${formatDate(followUpDue!)}`;
  return `Scheduled · ${formatDate(followUpDue!)}`;
}

type CustomerFollowUpControlProps = {
  customerId: string;
  customerName?: string;
  followUpDue?: string | null;
  hasFollowUp?: boolean;
  assignedAgentName?: string | null;
  onSaved?: (followUpDue: string) => void;
  variant?: 'icon' | 'panel';
  className?: string;
};

/**
 * BizMation-style follow-up: see due state at a glance + set/reschedule in-place.
 * Laam design tokens; creates a CRM Follow-up (+ customer hasFollowUp/followUpDue).
 */
export function CustomerFollowUpControl({
  customerId,
  customerName,
  followUpDue,
  hasFollowUp: hasFollowUpProp,
  assignedAgentName,
  onSaved,
  variant = 'icon',
  className,
}: CustomerFollowUpControlProps) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState(() => toDateInputValue(followUpDue));
  const [saving, setSaving] = React.useState(false);

  const tone = getFollowUpTone(followUpDue);
  const hasFollowUp = hasFollowUpProp || tone !== 'none';

  React.useEffect(() => {
    if (open) setDate(toDateInputValue(followUpDue));
  }, [open, followUpDue]);

  async function handleSave() {
    if (!date.trim()) return;
    setSaving(true);
    try {
      await followupsApi.createFollowup({
        customerId,
        scheduleDate: date.trim(),
        note: customerName
          ? `Follow-up for ${customerName}`
          : 'Follow-up from customers workspace',
        assignedAgentName: assignedAgentName ?? undefined,
      });
      toast.success('Follow-up scheduled');
      onSaved?.(date.trim());
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to set follow-up');
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
            {customerName ? (
              <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{customerName}</p>
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
        {hasFollowUp && followUpDue ? (
          <p className="text-xs text-muted-foreground">
            Due <span className="font-medium text-foreground">{formatDate(followUpDue)}</span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Callback date for this buyer — shows in Follow-ups queue.
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
        <label htmlFor={`cust-fu-${customerId}`} className="text-xs font-medium text-muted-foreground">
          Due date
        </label>
        <FormInput
          id={`cust-fu-${customerId}`}
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
        {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
        {hasFollowUp ? 'Update follow-up' : 'Set follow-up'}
      </Button>
    </div>
  );

  if (variant === 'panel') {
    return (
      <div
        className={cn(
          'space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Follow-up
            </p>
            <p className="text-base font-semibold leading-snug">
              {hasFollowUp && followUpDue ? formatDate(followUpDue) : 'Not scheduled'}
            </p>
            <p className="text-xs text-muted-foreground">{toneLabel(tone, followUpDue)}</p>
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
            <Button type="button" size="sm" variant="outline" className="w-full">
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
          aria-label={toneLabel(tone, followUpDue)}
          title={`${toneLabel(tone, followUpDue)} · Click to set or change`}
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
