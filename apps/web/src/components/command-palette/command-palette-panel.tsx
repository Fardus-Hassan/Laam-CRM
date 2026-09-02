'use client';

import type { CommandPaletteItem } from '@/components/command-palette/use-command-palette-search';
import { cn } from '@/lib/utils';

export function CommandPaletteResults({
  items,
  activeIndex,
  loading,
  query,
  onSelect,
  onHover,
}: {
  items: CommandPaletteItem[];
  activeIndex: number;
  loading: boolean;
  query: string;
  onSelect: (href: string) => void;
  onHover: (index: number) => void;
}) {
  return (
    <>
      <div className="custom-scrollbar max-h-[min(60vh,360px)] overflow-y-auto px-1.5 py-1.5">
        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            {loading ? 'Searching…' : query.trim() ? 'No results' : 'Type to search orders or queues'}
          </p>
        ) : (
          <ul className="space-y-0.5" role="listbox" aria-label="Search results">
            {items.map((item, index) => (
              <li key={`${item.type}-${item.id}`} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  id={`command-palette-option-${item.type}-${item.id}`}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm',
                    index === activeIndex ? 'bg-muted' : 'hover:bg-muted/60',
                  )}
                  onMouseEnter={() => onHover(index)}
                  onClick={() => onSelect(item.href)}
                >
                  <span className="w-11 shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {item.type}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.statusLabel ? (
                    <span className="max-w-[40%] shrink-0 truncate rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {item.statusLabel}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="border-t px-3 py-2 text-xs text-muted-foreground">
        ↑↓ navigate · Enter open · Esc close
      </div>
    </>
  );
}
