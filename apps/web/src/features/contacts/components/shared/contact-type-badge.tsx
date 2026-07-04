'use client';

import type { ContactType } from '@laam/types';

import { Badge } from '@/components/ui/badge';
import { CONTACT_TYPE_LABELS } from '@/features/contacts/config/contact-segments';
import { cn } from '@/lib/utils';

const TYPE_VARIANT: Record<ContactType, string> = {
  customer: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  supplier: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  partner: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  other: 'bg-muted text-muted-foreground',
};

export function ContactTypeBadge({
  type,
  className,
}: {
  type: ContactType;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn('text-[10px] font-medium', TYPE_VARIANT[type], className)}>
      {CONTACT_TYPE_LABELS[type]}
    </Badge>
  );
}
