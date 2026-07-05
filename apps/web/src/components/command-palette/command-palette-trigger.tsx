'use client';

import * as React from 'react';
import { Search } from 'lucide-react';

import { useCommandPalette } from '@/components/command-palette/command-palette-provider';
import { cn } from '@/lib/utils';

type CommandPaletteTriggerProps = {
  className?: string;
};

const triggerBaseClass =
  'inline-flex shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/30 text-muted-foreground transition-colors hover:border-border hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

export function CommandPaletteTrigger({ className }: CommandPaletteTriggerProps) {
  const { setOpen } = useCommandPalette();
  const [shortcutLabel, setShortcutLabel] = React.useState('Ctrl+K');

  React.useEffect(() => {
    setShortcutLabel(
      typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.userAgent)
        ? '⌘K'
        : 'Ctrl+K',
    );
  }, []);

  return (
    <>
      <button
        type="button"
        className={cn(triggerBaseClass, 'size-8 md:hidden', className)}
        onClick={() => setOpen(true)}
        aria-label="Search orders and navigate"
      >
        <Search className="size-4" />
      </button>

      <button
        type="button"
        className={cn(
          triggerBaseClass,
          'hidden h-9 min-w-[10.5rem] max-w-[14rem] gap-2 px-3 md:inline-flex lg:min-w-[13rem] lg:max-w-[18rem]',
          className,
        )}
        onClick={() => setOpen(true)}
        aria-label="Search orders and navigate"
      >
        <Search className="size-4 shrink-0 opacity-70" />
        <span className="min-w-0 flex-1 truncate text-left text-sm">Search orders…</span>
        <kbd className="hidden shrink-0 rounded border border-border/70 bg-background/90 px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground lg:inline">
          {shortcutLabel}
        </kbd>
      </button>
    </>
  );
}
