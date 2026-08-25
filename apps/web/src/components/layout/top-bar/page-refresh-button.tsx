'use client';

import * as React from 'react';
import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { requestPageDataRefresh } from '@/lib/page-data-refresh';
import { cn } from '@/lib/utils';

type PageRefreshButtonProps = {
  className?: string;
};

export function PageRefreshButton({ className }: PageRefreshButtonProps) {
  const [busy, setBusy] = React.useState(false);

  function handleClick() {
    if (busy) return;
    setBusy(true);
    requestPageDataRefresh();
    window.setTimeout(() => setBusy(false), 900);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn('size-9 shrink-0 rounded-lg border-border bg-card', className)}
      onClick={handleClick}
      disabled={busy}
      aria-label="Refresh current page"
      title="Refresh"
    >
      <RefreshCw className={cn('size-4', busy && 'animate-spin')} />
    </Button>
  );
}
