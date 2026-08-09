'use client';

import * as React from 'react';
import type { BlockedEntry, BlockedListResponse, CreateBlockedEntryPayload } from '@laam/types';
import { Ban, Plus, RefreshCw, Search, Smartphone, Trash2 } from 'lucide-react';

import { Can } from '@/components/auth/can';
import { ActiveFilterChips } from '@/components/filters/active-filter-chips';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { FormTextarea } from '@/components/form/form-textarea';
import { EmptyState } from '@/components/layout/empty-state';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { securityApi } from '@/features/security/api/security-api';
import {
  BLOCK_REASON_LABELS,
  BLOCK_REASON_OPTIONS,
  BLOCK_TYPE_LABELS,
  BLOCK_TYPE_OPTIONS,
} from '@/features/security/config/security-labels';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

export function BlockedListShell() {
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<'all' | 'ip' | 'mobile'>('all');
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<BlockedListResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [draft, setDraft] = React.useState<CreateBlockedEntryPayload>({
    type: 'mobile',
    value: '',
    reason: 'fraud',
    note: '',
    expiresInDays: 3,
  });

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await securityApi.listBlocked({
        search: search || undefined,
        type: typeFilter === 'all' ? undefined : typeFilter,
        page,
        pageSize: PAGE_SIZE,
      });
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter]);

  React.useEffect(() => {
    const timer = setTimeout(() => void refresh(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [refresh, search]);

  async function handleCreate() {
    if (!draft.value.trim()) return;
    setSaving(true);
    try {
      await securityApi.createBlocked(draft);
      setCreateOpen(false);
      setDraft({ type: 'mobile', value: '', reason: 'fraud', note: '', expiresInDays: 3 });
      setPage(1);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry: BlockedEntry) {
    await securityApi.deleteBlocked(entry.id);
    await refresh();
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <PageShell
      title="Blocked IPs & Mobiles"
      description="Fraud prevention — block suspicious IPs and phone numbers. Auto-expires after 3 days by default."
    >
      <div className={ORDER_PAGE_GAP}>
        <CrmSummaryStrip
          items={[
            { id: 'total', label: 'Total blocked', value: data ? String(data.summary.total) : '—' },
            { id: 'ip', label: 'IP addresses', value: data ? String(data.summary.ipCount) : '—' },
            { id: 'mobile', label: 'Mobile numbers', value: data ? String(data.summary.mobileCount) : '—' },
            { id: 'expiring', label: 'Expiring soon', value: data ? String(data.summary.expiringSoon) : '—' },
          ]}
          className="sm:grid-cols-2 lg:grid-cols-4"
        />

        <Card className={ORDER_CARD_CLASS}>
          <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-4')}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
                    placeholder="Search IP, mobile, or note…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  />
                </div>
                <div className="flex gap-1">
                  {(['all', 'ip', 'mobile'] as const).map((t) => (
                    <Button
                      key={t}
                      type="button"
                      size="sm"
                      variant={typeFilter === t ? 'default' : 'outline'}
                      onClick={() => { setTypeFilter(t); setPage(1); }}
                    >
                      {t === 'all' ? 'All' : BLOCK_TYPE_LABELS[t]}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => void refresh()}>
                  <RefreshCw className="size-4" />
                </Button>
                <Can permission="security.manage">
                  <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus className="size-4" />
                    Block
                  </Button>
                </Can>
              </div>
            </div>

            <ActiveFilterChips
              chips={[
                ...(typeFilter !== 'all'
                  ? [{ id: 'type', label: BLOCK_TYPE_LABELS[typeFilter] }]
                  : []),
                ...(search.trim()
                  ? [{ id: 'search', label: `Search: ${search.trim()}` }]
                  : []),
              ]}
              onRemove={(id) => {
                if (id === 'type') setTypeFilter('all');
                if (id === 'search') setSearch('');
                setPage(1);
              }}
              onClearAll={() => {
                setTypeFilter('all');
                setSearch('');
                setPage(1);
              }}
            />

            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
            ) : !data?.items.length ? (
              <EmptyState
                title="No blocked entries"
                description="Block suspicious IPs or mobile numbers to prevent fraud orders."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Blocked by</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {entry.type === 'ip' ? (
                            <Ban className="size-3.5 text-muted-foreground" />
                          ) : (
                            <Smartphone className="size-3.5 text-muted-foreground" />
                          )}
                          <Badge variant="outline" className="text-[10px]">
                            {BLOCK_TYPE_LABELS[entry.type]}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium">{entry.value}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {BLOCK_REASON_LABELS[entry.reason]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{entry.blockedByName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(entry.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.expiresAt
                          ? formatDate(entry.expiresAt)
                          : 'Permanent'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Can permission="security.manage">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => void handleDelete(entry)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </Can>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {totalPages > 1 ? (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {totalPages} · {data?.total ?? 0} entries
                </p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <Button type="button" size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block IP or mobile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Type">
              <FormSearchSelect
                value={draft.type}
                options={BLOCK_TYPE_OPTIONS}
                onChange={(v) => setDraft((d) => ({ ...d, type: v as 'ip' | 'mobile' }))}
              />
            </FormField>
            <FormField label={draft.type === 'ip' ? 'IP address' : 'Mobile number'}>
              <FormInput
                value={draft.value}
                onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
                placeholder={draft.type === 'ip' ? '103.148.72.44' : '01712345678'}
              />
            </FormField>
            <FormField label="Reason">
              <FormSearchSelect
                value={draft.reason}
                options={BLOCK_REASON_OPTIONS}
                onChange={(v) => setDraft((d) => ({ ...d, reason: v as CreateBlockedEntryPayload['reason'] }))}
              />
            </FormField>
            <FormField label="Note (optional)">
              <FormTextarea
                value={draft.note ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                rows={2}
              />
            </FormField>
            <FormField label="Auto-expire (days, leave blank for permanent)">
              <FormInput
                type="number"
                value={draft.expiresInDays ?? ''}
                onChange={(e) => setDraft((d) => ({
                  ...d,
                  expiresInDays: e.target.value ? Number(e.target.value) : undefined,
                }))}
                placeholder="3"
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="button" onClick={() => void handleCreate()} disabled={saving || !draft.value.trim()}>
              {saving ? 'Blocking…' : 'Block'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
