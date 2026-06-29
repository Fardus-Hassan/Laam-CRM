'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

type CrmStatusTab = {
  id: string;
  label: string;
  href: string;
  isActive?: (searchParams: URLSearchParams) => boolean;
};

type CrmListToolbarProps = {
  tabs: CrmStatusTab[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
};

export function CrmListToolbar({
  tabs,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  children,
}: CrmListToolbarProps) {
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get('status') ?? 'all';

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="custom-scrollbar flex gap-1 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const tabStatus = tab.id;
            const isActive = tab.isActive
              ? tab.isActive(searchParams)
              : tabStatus === 'all'
                ? !searchParams.get('status')
                : currentStatus === tabStatus;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  'shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="pl-8"
            />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
