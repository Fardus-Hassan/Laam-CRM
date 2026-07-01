'use client';

import { Search } from 'lucide-react';

import { useCommandPalette } from '@/components/command-palette/command-palette-provider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CommandPaletteTriggerProps = {
  className?: string;
};

export function CommandPaletteTrigger({ className }: CommandPaletteTriggerProps) {
  const { setOpen } = useCommandPalette();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn('hidden h-8 gap-2 text-muted-foreground md:inline-flex', className)}
      onClick={() => setOpen(true)}
    >
      <Search className="size-3.5" />
      <span className="text-xs">Search…</span>
      <kbd className="pointer-events-none rounded border bg-muted px-1.5 font-mono text-[10px]">
        ⌘K
      </kbd>
    </Button>
  );
}
