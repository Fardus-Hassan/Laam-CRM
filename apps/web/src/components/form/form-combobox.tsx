'use client';

import * as React from 'react';
import { ChevronDown, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import { FORM_CONTROL_HEIGHT_CLASS } from './form-control';

export type FormComboboxOption = {
  value: string;
  label: string;
  description?: string;
};

type FormComboboxProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: FormComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
};

export function FormCombobox({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No results found',
  disabled,
  searchable = true,
  className,
}: FormComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const selected = options.find((option) => option.value === value);

  const filtered = React.useMemo(() => {
    if (!searchable) {
      return options;
    }

    const q = query.trim().toLowerCase();
    if (!q) {
      return options;
    }

    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        option.description?.toLowerCase().includes(q),
    );
  }, [options, query, searchable]);

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    setQuery('');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            FORM_CONTROL_HEIGHT_CLASS,
            'w-full justify-between gap-2 px-3 font-normal',
            !value && 'text-muted-foreground',
            open && 'border-primary/50 ring-1 ring-primary/20',
            className,
          )}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronDown
            className={cn(
              'size-3.5 shrink-0 opacity-60 transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] overflow-hidden p-0"
        align="start"
      >
        {searchable ? (
          <div className="border-b border-border/70 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className={cn(
                  FORM_CONTROL_HEIGHT_CLASS,
                  'flex w-full rounded-md border border-input bg-background py-0 pr-3 pl-9 outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
              />
            </div>
          </div>
        ) : null}
        <div className="custom-scrollbar max-h-56 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            filtered.map((option) => {
              const isSelected = value === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted',
                  )}
                  onClick={() => handleSelect(option.value)}
                >
                  <span className="block font-medium">{option.label}</span>
                  {option.description ? (
                    <span
                      className={cn(
                        'block text-xs',
                        isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground',
                      )}
                    >
                      {option.description}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
