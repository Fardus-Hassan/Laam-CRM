'use client';

import type { ContactType } from '@laam/types';
import { Building2, Handshake, UserRound, Users } from 'lucide-react';

import { CONTACT_TYPE_LABELS } from '@/features/contacts/config/contact-segments';
import { cn } from '@/lib/utils';

const TYPE_OPTIONS: {
  id: ContactType;
  label: string;
  description: string;
  icon: typeof UserRound;
}[] = [
  {
    id: 'customer',
    label: CONTACT_TYPE_LABELS.customer,
    description: 'Modhu & khejur buyers — orders and courier score',
    icon: UserRound,
  },
  {
    id: 'supplier',
    label: CONTACT_TYPE_LABELS.supplier,
    description: 'Honey, khejur importers, raw material sources',
    icon: Building2,
  },
  {
    id: 'partner',
    label: CONTACT_TYPE_LABELS.partner,
    description: 'Courier hubs, packaging, delivery partners',
    icon: Handshake,
  },
  {
    id: 'other',
    label: CONTACT_TYPE_LABELS.other,
    description: 'Influencers, FB admins, bulk coordinators',
    icon: Users,
  },
];

type CreateContactTypePickerProps = {
  value: ContactType;
  onChange: (type: ContactType) => void;
  className?: string;
};

export function CreateContactTypePicker({
  value,
  onChange,
  className,
}: CreateContactTypePickerProps) {
  return (
    <div className={cn('grid gap-2 sm:grid-cols-2', className)}>
      {TYPE_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
              isActive
                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30',
            )}
          >
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-md',
                isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{option.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
