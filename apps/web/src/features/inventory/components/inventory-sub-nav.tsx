'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { INVENTORY_SUB_NAV } from '@/features/inventory/config/inventory-nav';
import { cn } from '@/lib/utils';

export function InventorySubNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        'custom-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1',
        className,
      )}
      aria-label="Inventory sections"
    >
      {INVENTORY_SUB_NAV.map((item) => {
        const isProducts =
          item.href === '/dashboard/inventory/products' &&
          (pathname === item.href ||
            pathname.startsWith('/dashboard/inventory/products/'));
        const isActive =
          item.href === '/dashboard/inventory/products'
            ? isProducts
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              isActive
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <item.icon className="size-3.5 shrink-0" />
            <span className="whitespace-nowrap">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
