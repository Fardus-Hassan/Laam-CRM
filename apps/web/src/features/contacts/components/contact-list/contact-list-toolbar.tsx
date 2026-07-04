'use client';

import * as React from 'react';
import { Search } from 'lucide-react';

import { FormInput } from '@/components/form/form-input';
import { cn } from '@/lib/utils';

type ContactListToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  className?: string;
};

export function ContactListToolbar({
  search,
  onSearchChange,
  className,
}: ContactListToolbarProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <FormInput
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search name, mobile, ID, organization, tag…"
        className="pl-9"
      />
    </div>
  );
}
