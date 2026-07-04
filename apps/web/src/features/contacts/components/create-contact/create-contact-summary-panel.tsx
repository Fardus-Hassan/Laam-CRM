'use client';

import Link from 'next/link';
import type { ContactType, OrderSource } from '@laam/types';
import { CheckCircle2, Circle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContactTypeBadge } from '@/features/contacts/components/shared/contact-type-badge';
import { CONTACT_SOURCE_LABELS } from '@/features/contacts/config/contact-filters';
import { ORDER_CARD_CLASS, ORDER_SECTION_BODY_CLASS, ORDER_SECTION_HEADER_CLASS } from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

type CreateContactSummaryPanelProps = {
  contactType: ContactType;
  name: string;
  phone: string;
  source: OrderSource;
  organizationName?: string;
  roleLabel?: string;
  isLoading?: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
  className?: string;
  showActions?: boolean;
};

export function CreateContactSummaryPanel({
  contactType,
  name,
  phone,
  source,
  organizationName,
  roleLabel,
  isLoading,
  canSubmit,
  onSubmit,
  className,
  showActions = true,
}: CreateContactSummaryPanelProps) {
  const checks = [
    { label: 'Name', done: name.trim().length > 0 },
    { label: 'Mobile', done: phone.trim().length > 0 },
  ];
  const doneCount = checks.filter((c) => c.done).length;

  return (
    <Card className={cn(ORDER_CARD_CLASS, className)}>
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="text-sm">Preview</CardTitle>
      </CardHeader>
      <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-4')}>
        <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <ContactTypeBadge type={contactType} className="text-[11px]" />
            <span className="text-xs text-muted-foreground">{CONTACT_SOURCE_LABELS[source]}</span>
          </div>
          <p className="text-base font-semibold">{name.trim() || 'Contact name'}</p>
          <p className="text-sm text-muted-foreground">{phone.trim() || '01XXXXXXXXX'}</p>
          {organizationName ? (
            <p className="text-xs text-muted-foreground">
              {organizationName}
              {roleLabel ? ` · ${roleLabel}` : ''}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Required fields ({doneCount}/{checks.length})
          </p>
          <ul className="space-y-1.5">
            {checks.map((check) => (
              <li key={check.label} className="flex items-center gap-2 text-sm">
                {check.done ? (
                  <CheckCircle2 className="size-4 text-primary" />
                ) : (
                  <Circle className="size-4 text-muted-foreground/50" />
                )}
                <span className={check.done ? 'text-foreground' : 'text-muted-foreground'}>
                  {check.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {showActions ? (
          <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
            <Button
              type="button"
              className="w-full"
              disabled={!canSubmit || isLoading}
              onClick={onSubmit}
            >
              Create contact
            </Button>
            <Button type="button" variant="outline" className="w-full" asChild>
              <Link href="/dashboard/contacts">Cancel</Link>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
