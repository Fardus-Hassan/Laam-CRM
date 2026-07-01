'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardList,
  Package,
  PlusCircle,
  Search,
  Truck,
} from 'lucide-react';

import { FormInput } from '@/components/form/form-input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ordersApi } from '@/features/orders/api/orders-api';
import { MOCK_ORDER_QUEUE_PAGES } from '@/features/orders/data/mock-status-config';
import { cn } from '@/lib/utils';

type CommandPaletteContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const CommandPaletteContext = React.createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette() {
  const ctx = React.useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  }
  return ctx;
}

const NAV_ACTIONS = [
  { id: 'create', label: 'Create new order', href: '/dashboard/orders/new', icon: PlusCircle },
  { id: 'all', label: 'All orders', href: '/dashboard/orders', icon: ClipboardList },
  { id: 'pendings', label: 'Pending orders', href: '/dashboard/orders/queues/pendings', icon: Package },
  { id: 'followups', label: 'Follow-ups due', href: '/dashboard/orders/queues/followups', icon: Truck },
  { id: 'failed', label: 'Failed orders', href: '/dashboard/orders/failed', icon: Package },
];

function GlobalCommandPaletteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [orderResults, setOrderResults] = React.useState<
    Awaited<ReturnType<typeof ordersApi.quickSearchOrders>>
  >([]);
  const [loading, setLoading] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const navMatches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NAV_ACTIONS;
    return NAV_ACTIONS.filter((item) => item.label.toLowerCase().includes(q));
  }, [query]);

  const queueMatches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const pages = MOCK_ORDER_QUEUE_PAGES.filter((p) => p.showInNav && p.kind === 'list');
    if (!q) return pages.slice(0, 5);
    return pages.filter((p) => p.label.toLowerCase().includes(q)).slice(0, 5);
  }, [query]);

  const allItems = React.useMemo(() => {
    const items: { type: 'nav' | 'queue' | 'order'; id: string; label: string; href: string }[] = [];
    for (const nav of navMatches) {
      items.push({ type: 'nav', id: nav.id, label: nav.label, href: nav.href });
    }
    for (const page of queueMatches) {
      items.push({ type: 'queue', id: page.slug, label: page.label, href: page.href });
    }
    for (const order of orderResults) {
      items.push({
        type: 'order',
        id: order.id,
        label: `${order.orderNumber} — ${order.customerName} (${order.customerPhone})`,
        href: `/dashboard/orders/${order.orderNumber}`,
      });
    }
    return items;
  }, [navMatches, orderResults, queueMatches]);

  React.useEffect(() => {
    if (!open) {
      setQuery('');
      setOrderResults([]);
      setActiveIndex(0);
    }
  }, [open]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  React.useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setOrderResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setLoading(true);
      void ordersApi.quickSearchOrders(q, 8).then((items) => {
        setOrderResults(items);
        setLoading(false);
      });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [query, open]);

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, allItems.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter' && allItems[activeIndex]) {
      event.preventDefault();
      go(allItems[activeIndex].href);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="sr-only">Search orders and navigate</DialogTitle>
          <div className="relative">
            <Search className="pointer-events-none absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <FormInput
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search orders, phone, or jump to a queue…"
              className="border-0 bg-transparent pl-7 shadow-none focus-visible:ring-0"
            />
          </div>
        </DialogHeader>
        <div className="custom-scrollbar max-h-[min(60vh,420px)] overflow-y-auto p-2">
          {allItems.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {loading ? 'Searching…' : query.trim() ? 'No results' : 'Type to search orders or queues'}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {allItems.map((item, index) => (
                <li key={`${item.type}-${item.id}`}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm',
                      index === activeIndex ? 'bg-muted' : 'hover:bg-muted/60',
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => go(item.href)}
                  >
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {item.type}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          ↑↓ navigate · Enter open · Esc close
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen }}>
      {children}
      <GlobalCommandPaletteDialog open={open} onOpenChange={setOpen} />
    </CommandPaletteContext.Provider>
  );
}
