'use client';

import * as React from 'react';
import type { RecycleBinItem, RecycleEntityType } from '@laam/types';
import { RotateCcw, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Can } from '@/components/auth/can';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { recycleBinApi } from '@/features/recycle-bin/api/recycle-bin-api';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';

const ENTITY_LABELS: Record<RecycleEntityType, string> = {
  order: 'Order',
  customer: 'Customer',
  product: 'Product',
  brand: 'Brand',
  category: 'Category',
  lead: 'Lead',
  contact: 'Contact',
};

const FILTERS = ['all', 'product', 'brand', 'category', 'order', 'customer', 'lead', 'contact'] as const;

export function RecycleBinPage() {
  const [items, setItems] = React.useState<RecycleBinItem[]>([]);
  const [search, setSearch] = React.useState('');
  const [type, setType] = React.useState<(typeof FILTERS)[number]>('all');
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [purgeTarget, setPurgeTarget] = React.useState<RecycleBinItem | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setItems(
        await recycleBinApi.list({
          search: search || undefined,
          entityType: type === 'all' ? undefined : type,
        }),
      );
    } catch (error) {
      setItems([]);
      setLoadError(error instanceof Error ? error.message : 'Could not load recycle bin');
    } finally {
      setLoading(false);
    }
  }, [search, type]);

  React.useEffect(() => {
    const t = setTimeout(() => void refresh(), search ? 250 : 0);
    return () => clearTimeout(t);
  }, [refresh, search]);

  async function handleRestore(item: RecycleBinItem) {
    setBusyId(item.id);
    try {
      await recycleBinApi.restore(item.id);
      toast.success(`Restored “${item.title}”`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Restore failed');
    } finally {
      setBusyId(null);
    }
  }

  async function handlePurge() {
    if (!purgeTarget) return;
    setBusyId(purgeTarget.id);
    try {
      await recycleBinApi.purge(purgeTarget.id);
      toast.success(`Permanently deleted “${purgeTarget.title}”`);
      setPurgeTarget(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Permanent delete failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PageShell
      title="Recycle Bin"
      description="Restore or permanently delete archived catalog items and other soft-deleted records."
    >
      <div className={ORDER_PAGE_GAP}>
        <Card className={ORDER_CARD_CLASS}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">Deleted items</CardTitle>
          </CardHeader>
          <CardContent className={`${ORDER_SECTION_BODY_CLASS} space-y-4`}>
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[180px] flex-1">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {FILTERS.map((t) => (
                <Button
                  key={t}
                  type="button"
                  size="sm"
                  variant={type === t ? 'default' : 'outline'}
                  onClick={() => setType(t)}
                >
                  {t === 'all' ? 'All' : ENTITY_LABELS[t]}
                </Button>
              ))}
            </div>

            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
            ) : loadError ? (
              <p className="py-8 text-center text-sm text-destructive">{loadError}</p>
            ) : !items.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Recycle bin is empty.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Deleted by</TableHead>
                    <TableHead>Deleted at</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="outline">{ENTITY_LABELS[item.entityType]}</Badge>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{item.title}</p>
                        {item.subtitle ? (
                          <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>{item.deletedBy}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(item.deletedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Can permission="recycle.manage">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busyId === item.id}
                              onClick={() => void handleRestore(item)}
                            >
                              <RotateCcw className="size-4" />
                              Restore
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              disabled={busyId === item.id}
                              onClick={() => setPurgeTarget(item)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </Can>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(purgeTarget)}
        onOpenChange={(open) => !open && setPurgeTarget(null)}
        title="Delete permanently?"
        description={
          purgeTarget
            ? `Permanently delete “${purgeTarget.title}”? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete permanently"
        destructive
        loading={Boolean(purgeTarget && busyId === purgeTarget.id)}
        onConfirm={handlePurge}
      />
    </PageShell>
  );
}
