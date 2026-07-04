'use client';

import { Copy } from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function DataTableCopyableText({
  value,
  copyValue,
  children,
  className,
  copyToastMessage = 'Copied to clipboard',
}: {
  value?: string;
  copyValue?: string;
  children?: ReactNode;
  className?: string;
  copyToastMessage?: string;
}) {
  const text = (copyValue ?? value ?? '').trim();
  if (!text) {
    return null;
  }

  function handleCopy() {
    void navigator.clipboard.writeText(text);
    toast.success(copyToastMessage);
  }

  return (
    <div className={cn('group/copy flex items-start gap-0.5', className)}>
      <div className="min-w-0 flex-1">{children ?? <span>{value}</span>}</div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-6 shrink-0 text-muted-foreground opacity-70 hover:text-foreground hover:opacity-100"
        onClick={handleCopy}
        aria-label="Copy"
        data-no-drag-scroll
      >
        <Copy className="size-3" />
      </Button>
    </div>
  );
}
