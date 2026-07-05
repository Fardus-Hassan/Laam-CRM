import Link from 'next/link';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function CreateOrderButton() {
  return (
    <Button size="sm" className="h-8 shrink-0 gap-1.5 px-2.5 sm:px-3" asChild>
      <Link href="/dashboard/orders/new">
        <Plus className="size-3.5" />
        <span className="hidden sm:inline">Create order</span>
        <span className="sm:hidden">Order</span>
      </Link>
    </Button>
  );
}
