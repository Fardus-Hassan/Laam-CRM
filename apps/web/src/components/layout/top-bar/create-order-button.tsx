import Link from 'next/link';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function CreateOrderButton() {
  return (
    <Button
      size="sm"
      className="size-8 shrink-0 rounded-lg p-0 sm:h-8 sm:w-auto sm:gap-1.5 sm:px-3"
      asChild
    >
      <Link href="/dashboard/orders/new" aria-label="Create order">
        <Plus className="size-4 sm:size-3.5" />
        <span className="hidden sm:inline">Create order</span>
      </Link>
    </Button>
  );
}
