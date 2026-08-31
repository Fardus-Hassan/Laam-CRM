'use client';

import * as React from 'react';
import { Search } from 'lucide-react';

import { CommandPaletteResults } from '@/components/command-palette/command-palette-panel';
import { useCommandPalette } from '@/components/command-palette/command-palette-provider';
import { useCommandPaletteSearch } from '@/components/command-palette/use-command-palette-search';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type CommandPaletteTriggerProps = {
  className?: string;
};

const fieldShellClass =
  'inline-flex shrink-0 items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 transition-[border-color,box-shadow] focus-within:border-border focus-within:ring-2 focus-within:ring-ring/50';

const mobileIconBtnClass =
  'size-8 shrink-0 rounded-lg border-border/70 bg-card/80 md:hidden';

const searchInputClass =
  'h-8 min-h-0 flex-1 border-0 bg-transparent p-0 shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent placeholder:text-muted-foreground/70';

function isWithinNode(node: HTMLElement | null, target: EventTarget | null): boolean {
  return target instanceof Node && node?.contains(target) === true;
}

export function CommandPaletteTrigger({ className }: CommandPaletteTriggerProps) {
  const { open, setOpen, registerFocusHandler } = useCommandPalette();
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const desktopInputRef = React.useRef<HTMLInputElement>(null);
  const mobileInputRef = React.useRef<HTMLInputElement>(null);
  const [shortcutLabel, setShortcutLabel] = React.useState('Ctrl+K');

  const closePalette = React.useCallback(() => setOpen(false), [setOpen]);

  const search = useCommandPaletteSearch({
    open,
    onClose: closePalette,
  });

  const focusSearchInput = React.useCallback(() => {
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    const input = isDesktop ? desktopInputRef.current : mobileInputRef.current;
    input?.focus();
  }, []);

  React.useEffect(() => {
    registerFocusHandler(focusSearchInput);
    return () => registerFocusHandler(null);
  }, [focusSearchInput, registerFocusHandler]);

  React.useEffect(() => {
    if (!open) return;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (isMobile) {
      requestAnimationFrame(() => mobileInputRef.current?.focus());
    }
  }, [open]);

  React.useEffect(() => {
    setShortcutLabel(
      typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.userAgent)
        ? '⌘K'
        : 'Ctrl+K',
    );
  }, []);

  const guardAnchorDismiss = React.useCallback(
    (event: { target: EventTarget | null; preventDefault: () => void }) => {
      if (isWithinNode(anchorRef.current, event.target)) {
        event.preventDefault();
      }
    },
    [],
  );

  function openPalette() {
    setOpen(true);
    requestAnimationFrame(focusSearchInput);
  }

  function handleDesktopKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePalette();
      desktopInputRef.current?.blur();
      return;
    }
    search.handleKeyDown(event);
  }

  function handleMobileKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePalette();
      mobileInputRef.current?.blur();
      return;
    }
    search.handleKeyDown(event);
  }

  return (
    <Popover modal={false} open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={anchorRef} className="inline-flex shrink-0">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn(mobileIconBtnClass, className)}
            onClick={openPalette}
            aria-label="Search orders and navigate"
            aria-expanded={open}
            aria-controls="command-palette-results"
          >
            <Search className="size-4" />
          </Button>

          <div
            className={cn(
              fieldShellClass,
              'hidden h-9 min-w-[16rem] max-w-[22rem] md:inline-flex lg:min-w-[20rem] lg:max-w-[28rem]',
              className,
            )}
          >
            <Search className="size-4 shrink-0 text-muted-foreground/70" aria-hidden />
            <Input
              ref={desktopInputRef}
              type="search"
              autoComplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls="command-palette-results"
              value={search.query}
              onChange={(e) => search.setQuery(e.target.value)}
              onFocus={() => setOpen(true)}
              onKeyDown={handleDesktopKeyDown}
              placeholder="Search orders, phone, or jump to a queue…"
              aria-label="Search orders and navigate"
              className={searchInputClass}
            />
            <kbd className="pointer-events-none hidden shrink-0 rounded border border-border/70 bg-transparent px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground lg:inline">
              {shortcutLabel}
            </kbd>
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent
        id="command-palette-results"
        align="end"
        side="bottom"
        sideOffset={6}
        className="w-[var(--radix-popover-anchor-width)] min-w-[min(28rem,calc(100vw-1.5rem))] gap-0 overflow-hidden p-0 sm:min-w-[28rem]"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onPointerDownOutside={guardAnchorDismiss}
        onFocusOutside={guardAnchorDismiss}
        onInteractOutside={guardAnchorDismiss}
      >
        <div className="border-b px-3 py-2 md:hidden">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              ref={mobileInputRef}
              type="search"
              autoComplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls="command-palette-results"
              value={search.query}
              onChange={(e) => search.setQuery(e.target.value)}
              onKeyDown={handleMobileKeyDown}
              placeholder="Search orders, phone, or jump to a queue…"
              aria-label="Search orders and navigate"
              className={cn(searchInputClass, 'h-9 pl-8')}
            />
          </div>
        </div>
        <CommandPaletteResults
          items={search.allItems}
          activeIndex={search.activeIndex}
          loading={search.loading}
          query={search.query}
          onSelect={search.go}
          onHover={search.setActiveIndex}
        />
      </PopoverContent>
    </Popover>
  );
}
