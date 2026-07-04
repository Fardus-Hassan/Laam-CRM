'use client';

import * as React from 'react';
import type { RecycleBinItem, RecycleEntityType } from '@laam/types';
import { RotateCcw, Search, Trash2 } from 'lucide-react';

import { Can } from '@/components/auth/can';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  lead: 'Lead',
  contact: 'Contact',
};

export function RecycleBinPage() {
  const [items, setItems] = React.useState<RecycleBinItem[]>([]);
  const [search, setSearch] = React.useState('');
  const [type, setType] = React.useState<'all' | RecycleEntityType>('all');

  const refresh = React.useCallback(async () => {
    setItems(
      await recycleBinApi.list({
        search: search || undefined,
        entityType: type === 'all' ? undefined : type,
      }),
    );
  }, [search, type]);

  React.useEffect(() => {
    const t = setTimeout(() => void refresh(), search ? 250 : 0);
    return () => clearTimeout(t);
  }, [refresh, search]);

  async function handleRestore(id: string) {
    await recycleBinApi.restore(id);
    await refresh();
  }

  async function handlePurge(id: string) {
    await recycleBinApi.purge(id);
    await refresh();
  }

  return (
    <PageShell
      title="Recycle Bin"
      description="Restore soft-deleted orders, customers, products, leads, and contacts."
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
              {(['all', 'order', 'customer', 'product', 'lead', 'contact'] as const).map((t) => (
                <Button key={t} type="button" size="sm" variant={type === t ? 'default' : 'outline'} onClick={() => setType(t)}>
                  {t === 'all' ? 'All' : ENTITY_LABELS[t]}
                </Button>
              ))}
            </div>

            {!items.length ? (
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
                            <Button type="button" size="sm" variant="outline" onClick={() => void handleRestore(item.id)}>
                              <RotateCcw className="size-4" />
                              Restore
                            </Button>
                            <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => void handlePurge(item.id)}>
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
    </PageShell>
  );
}
