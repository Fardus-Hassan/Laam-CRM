'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { OrderStatusType } from '@laam/types';

import { cn } from '@/lib/utils';
import { getStatusConfigBySlug } from '@/features/orders/data/mock-status-config';

type OrderQueueTabsProps = {
  childStatusSlugs: OrderStatusType[];
  parentHref: string;
};

export function OrderQueueTabs({ childStatusSlugs, parentHref }: OrderQueueTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeStatus = searchParams.get('status') ?? childStatusSlugs[0];

  return (
    <div className="flex flex-wrap gap-1 border-b border-border/70 pb-2">
      {childStatusSlugs.map((slug) => {
        const config = getStatusConfigBySlug(slug);
        const href = `${parentHref}?status=${slug}`;
        const isActive = pathname.includes(parentHref) && activeStatus === slug;

        return (
          <Link
            key={slug}
            href={href}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {config?.label ?? slug}
          </Link>
        );
      })}
    </div>
  );
}
