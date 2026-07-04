'use client';

import * as React from 'react';
import Link from 'next/link';
import type { CreateTicketPayload, SupportTicket, TicketListResponse } from '@laam/types';
import { MessageSquare, Plus, RefreshCw, Search } from 'lucide-react';

import { Can } from '@/components/auth/can';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormTextarea } from '@/components/form/form-textarea';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supportApi } from '@/features/support/api/support-api';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  open: 'warning',
  pending: 'secondary',
  resolved: 'success',
  closed: 'secondary',
};

const PRIORITY_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  low: 'secondary',
  medium: 'secondary',
  high: 'warning',
  urgent: 'destructive',
};

export function SupportTicketsPage() {
  const [data, setData] = React.useState<TicketListResponse | null>(null);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<string>('all');
  const [selected, setSelected] = React.useState<SupportTicket | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [reply, setReply] = React.useState('');
  const [draft, setDraft] = React.useState<CreateTicketPayload>({
    subject: '',
    body: '',
    priority: 'medium',
    customerName: '',
    customerMobile: '',
    orderNumber: '',
  });

  const refresh = React.useCallback(async () => {
    const typed = await supportApi.listTickets({
      search: search || undefined,
      status: status === 'all' ? undefined : (status as 'open' | 'pending' | 'resolved' | 'closed'),
    });
    setData(typed);
  }, [search, status]);

  React.useEffect(() => {
    const t = setTimeout(() => void refresh(), search ? 250 : 0);
    return () => clearTimeout(t);
  }, [refresh, search]);

  async function handleCreate() {
    const ticket = await supportApi.createTicket(draft);
    setCreateOpen(false);
    setDraft({ subject: '', body: '', priority: 'medium', customerName: '', customerMobile: '', orderNumber: '' });
    await refresh();
    setSelected(ticket);
  }

  async function handleReply() {
    if (!selected || !reply.trim()) return;
    const updated = await supportApi.reply(selected.id, reply.trim());
    setSelected(updated);
    setReply('');
    await refresh();
  }

  return (
    <PageShell
      title="Support Tickets"
      description="Customer complaints linked to orders — assign, reply, resolve."
    >
      <div className={ORDER_PAGE_GAP}>
        <CrmSummaryStrip
          items={[
            { id: 'open', label: 'Open', value: data ? String(data.summary.open) : '—' },
            { id: 'pending', label: 'Pending', value: data ? String(data.summary.pending) : '—' },
            { id: 'resolved', label: 'Resolved', value: data ? String(data.summary.resolved) : '—' },
            { id: 'urgent', label: 'Urgent', value: data ? String(data.summary.urgent) : '—' },
          ]}
        />

        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <Card className={ORDER_CARD_CLASS}>
            <CardHeader className={cn(ORDER_SECTION_HEADER_CLASS, 'flex-row items-center justify-between')}>
              <CardTitle className="text-sm">Tickets</CardTitle>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => void refresh()}>
                  <RefreshCw className="size-4" />
                </Button>
                <Can permission="support.create">
                  <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus className="size-4" />
                    New
                  </Button>
                </Can>
              </div>
            </CardHeader>
            <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3')}>
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-[160px] flex-1">
                  <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
                    placeholder="Search…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                {(['all', 'open', 'pending', 'resolved'] as const).map((s) => (
                  <Button key={s} type="button" size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => setStatus(s)}>
                    {s}
                  </Button>
                ))}
              </div>
              <div className="space-y-2">
                {data?.items.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelected(ticket)}
                    className={cn(
                      'w-full rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted/40',
                      selected?.id === ticket.id && 'border-primary/40 bg-primary/5',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_VARIANT[ticket.status]} className="text-[10px]">{ticket.status}</Badge>
                      <Badge variant={PRIORITY_VARIANT[ticket.priority]} className="text-[10px]">{ticket.priority}</Badge>
                    </div>
                    <p className="mt-1 text-sm font-medium">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {ticket.customerName}
                      {ticket.orderNumber ? ` · ${ticket.orderNumber}` : ''}
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className={ORDER_CARD_CLASS}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">
                {selected ? selected.subject : 'Select a ticket'}
              </CardTitle>
            </CardHeader>
            <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-4')}>
              {selected ? (
                <>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{selected.customerName} · {selected.customerMobile}</span>
                    {selected.orderNumber ? (
                      <Link href={`/dashboard/orders/${selected.orderId ?? ''}`} className="text-primary hover:underline">
                        {selected.orderNumber}
                      </Link>
                    ) : null}
                    {selected.assigneeName ? <span>Assignee: {selected.assigneeName}</span> : null}
                  </div>
                  <div className="max-h-72 space-y-3 overflow-y-auto">
                    {selected.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          'rounded-md border px-3 py-2 text-sm',
                          msg.authorRole === 'agent' && 'border-primary/20 bg-primary/5',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{msg.authorName}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1 text-muted-foreground">{msg.body}</p>
                      </div>
                    ))}
                  </div>
                  <Can permission="support.manage">
                    <div className="flex flex-wrap gap-2">
                      {(['open', 'pending', 'resolved', 'closed'] as const).map((s) => (
                        <Button
                          key={s}
                          type="button"
                          size="sm"
                          variant={selected.status === s ? 'default' : 'outline'}
                          onClick={() =>
                            void supportApi.updateStatus(selected.id, s).then((t) => {
                              setSelected(t);
                              void refresh();
                            })
                          }
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                        placeholder="Write a reply…"
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                      />
                      <Button type="button" size="sm" onClick={() => void handleReply()} disabled={!reply.trim()}>
                        <MessageSquare className="size-4" />
                        Reply
                      </Button>
                    </div>
                  </Can>
                </>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">Pick a ticket to view the thread.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New support ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <FormField label="Subject">
              <FormInput value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
            </FormField>
            <FormField label="Customer name">
              <FormInput value={draft.customerName} onChange={(e) => setDraft({ ...draft, customerName: e.target.value })} />
            </FormField>
            <FormField label="Mobile">
              <FormInput value={draft.customerMobile} onChange={(e) => setDraft({ ...draft, customerMobile: e.target.value })} />
            </FormField>
            <FormField label="Order number (optional)">
              <FormInput value={draft.orderNumber ?? ''} onChange={(e) => setDraft({ ...draft, orderNumber: e.target.value })} />
            </FormField>
            <FormField label="Priority">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={draft.priority}
                onChange={(e) => setDraft({ ...draft, priority: e.target.value as CreateTicketPayload['priority'] })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </FormField>
            <FormField label="Message">
              <FormTextarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={3} />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="button" onClick={() => void handleCreate()} disabled={!draft.subject || !draft.body}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
