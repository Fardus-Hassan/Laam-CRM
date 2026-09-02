'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { ordersApi } from '@/features/orders/api/orders-api';
import {
  getStatusConfigBySlug,
  MOCK_ORDER_QUEUE_PAGES,
} from '@/features/orders/data/mock-status-config';

const NAV_ACTIONS = [
  { id: 'create', label: 'Create new order', href: '/dashboard/orders/new' },
  { id: 'all', label: 'All orders', href: '/dashboard/orders' },
  { id: 'pendings', label: 'Pending orders', href: '/dashboard/orders/queues/pendings' },
  { id: 'followups', label: 'Customer follow-ups', href: '/dashboard/followups' },
  { id: 'tasks', label: 'Tasks', href: '/dashboard/tasks' },
  { id: 'inventory', label: 'Inventory — Products', href: '/dashboard/inventory/products' },
  { id: 'accounting', label: 'Accounting overview', href: '/dashboard/accounting/overview' },
  { id: 'courier', label: 'Courier Dashboard', href: '/dashboard/courier' },
  { id: 'support', label: 'Support tickets', href: '/dashboard/support' },
  { id: 'coupons', label: 'Coupons', href: '/dashboard/coupons' },
  { id: 'reports', label: 'Reports', href: '/dashboard/reports' },
  { id: 'recycle', label: 'Recycle Bin', href: '/dashboard/recycle-bin' },
  { id: 'import', label: 'Bulk import customers & orders', href: '/dashboard/settings/import' },
  { id: 'knowledge', label: 'Knowledge base', href: '/dashboard/knowledge' },
  { id: 'calendar', label: 'Calendar', href: '/dashboard/calendar' },
  { id: 'merge', label: 'Merge customers', href: '/dashboard/customers/merge' },
  { id: 'failed', label: 'Failed orders', href: '/dashboard/orders/failed' },
];

export type CommandPaletteItem = {
  type: 'nav' | 'queue' | 'order';
  id: string;
  label: string;
  href: string;
  /** Human label for order status (orders only). */
  statusLabel?: string;
};

export function useCommandPaletteSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
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
    const items: CommandPaletteItem[] = [];
    for (const nav of navMatches) {
      items.push({ type: 'nav', id: nav.id, label: nav.label, href: nav.href });
    }
    for (const page of queueMatches) {
      items.push({ type: 'queue', id: page.slug, label: page.label, href: page.href });
    }
    for (const order of orderResults) {
      const statusLabel =
        getStatusConfigBySlug(order.status)?.label ?? order.status;
      items.push({
        type: 'order',
        id: order.id,
        label: `${order.orderNumber} — ${order.customerName} (${order.customerPhone})`,
        href: `/dashboard/orders/${order.orderNumber}`,
        statusLabel,
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

  const go = React.useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router],
  );

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

  return {
    query,
    setQuery,
    loading,
    activeIndex,
    setActiveIndex,
    allItems,
    go,
    handleKeyDown,
  };
}
