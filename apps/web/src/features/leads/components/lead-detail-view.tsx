'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { LeadDetail } from '@laam/types';
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  Megaphone,
  MessageCircle,
  Phone,
  StickyNote,
  Tag,
  UserRound,
  XCircle,
} from 'lucide-react';

import { Can } from '@/components/auth/can';
import { EntityStatusBadge } from '@/components/dashboard/entity-status-badge';
import { FormField } from '@/components/form/form-field';
import { FormTextarea } from '@/components/form/form-textarea';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
  ORDER_SIDEBAR_GRID_CLASS,
  ORDER_STICKY_ACTION_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { EditableSectionCard } from '@/features/orders/components/shared/editable-section-card';
import { OrderAssignSheet } from '@/features/orders/components/shared/order-assign-sheet';
import { LeadLineItemsCard } from '@/features/leads/components/shared/lead-line-items-card';
import { LeadStatusDialog } from '@/features/leads/components/shared/lead-status-dialog';
import { LEAD_SOURCE_LABELS } from '@/features/leads/config/lead-filters';
import { useLeadDetailMutations } from '@/features/leads/hooks/use-lead-mutations';
import { navigateToConvertLead } from '@/features/leads/lib/lead-convert';
import { createLeadDetailBreadcrumbs } from '@/features/leads/lib/lead-breadcrumbs';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type LeadDetailViewProps = {
  lead: LeadDetail;
  onLeadUpdated?: (lead: LeadDetail) => void;
};

export function LeadDetailView({ lead: initialLead, onLeadUpdated }: LeadDetailViewProps) {
  const router = useRouter();
  const [lead, setLead] = React.useState(initialLead);
  const [notesDraft, setNotesDraft] = React.useState(initialLead.notes ?? '');
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [statusOpen, setStatusOpen] = React.useState(false);

  const handleUpdated = React.useCallback(
    (updated: LeadDetail) => {
      setLead(updated);
      setNotesDraft(updated.notes ?? '');
      onLeadUpdated?.(updated);
    },
    [onLeadUpdated],
  );

  const { assignAgent, changeStatus, saveNotes } = useLeadDetailMutations(lead.id, (updated) => {
    if (updated) handleUpdated(updated);
  });

  React.useEffect(() => {
    setLead(initialLead);
    setNotesDraft(initialLead.notes ?? '');
  }, [initialLead]);

  const phoneDigits = lead.phone.replace(/\D/g, '');

  async function handleConvert() {
    await navigateToConvertLead(lead.id, router);
  }

  return (
    <PageShell
      title={lead.leadNumber}
      description={`${lead.name} · ${LEAD_SOURCE_LABELS[lead.source]}`}
      breadcrumbs={createLeadDetailBreadcrumbs(lead.leadNumber, lead.status)}
    >
      <div className={cn(ORDER_PAGE_GAP)}>
        <div className="rounded-xl border bg-gradient-to-br from-muted/40 to-muted/10 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">{lead.leadNumber}</h2>
                <EntityStatusBadge status={lead.status} kind="lead" />
              </div>
              <p className="text-sm text-muted-foreground">
                {lead.name} · {LEAD_SOURCE_LABELS[lead.source]}
                {lead.campaignName ? ` · ${lead.campaignName}` : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" asChild>
                  <a href={`tel:${phoneDigits}`}>
                    <Phone className="size-3.5" />
                    Call
                  </a>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    window.open(`https://wa.me/${phoneDigits}`, '_blank', 'noopener,noreferrer');
                  }}
                >
                  <MessageCircle className="size-3.5" />
                  WhatsApp
                </Button>
              </div>
            </div>
            <div className="grid min-w-[180px] grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Est. value</p>
                <p className="font-semibold tabular-nums">
                  {lead.estimatedValue ? formatCurrency(lead.estimatedValue) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Agent</p>
                <p className="font-semibold">{lead.assignedAgentName ?? 'Unassigned'}</p>
              </div>
              {lead.followUpDue ? (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Follow-up due</p>
                  <p className="font-semibold">{lead.followUpDue}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className={cn(ORDER_STICKY_ACTION_CLASS)}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/dashboard/leads">
                <ArrowLeft className="size-4" />
                Back to leads
              </Link>
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Can permission="leads.assign">
                <Button type="button" size="sm" variant="secondary" onClick={() => setAssignOpen(true)}>
                  <UserRound className="size-4" />
                  Assign
                </Button>
              </Can>
              <Button type="button" size="sm" variant="outline" onClick={() => setStatusOpen(true)}>
                Change status
              </Button>
              {lead.status !== 'converted' && lead.status !== 'lost' ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void changeStatus('lost')}
                >
                  <XCircle className="size-4" />
                  Mark lost
                </Button>
              ) : null}
              <Can permission="leads.convert">
                <Button
                  type="button"
                  size="sm"
                  disabled={lead.status === 'converted'}
                  onClick={() => void handleConvert()}
                >
                  Convert to order
                </Button>
              </Can>
              {lead.orderId ? (
                <Button type="button" size="sm" variant="outline" asChild>
                  <Link href={`/dashboard/orders/${lead.orderId}`}>
                    <ExternalLink className="size-4" />
                    View order
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className={cn('grid gap-4', ORDER_SIDEBAR_GRID_CLASS)}>
          <div className="space-y-4">
            <Card className="gap-0 py-0 shadow-none">
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <CardTitle className="text-sm">Lead information</CardTitle>
              </CardHeader>
              <CardContent className={cn('grid gap-4 sm:grid-cols-2', ORDER_SECTION_BODY_CLASS)}>
                <InfoRow label="Name" value={lead.name} />
                <InfoRow label="Phone" value={lead.phone} />
                <InfoRow label="Email" value={lead.email ?? '—'} />
                <InfoRow label="Area" value={lead.area ?? '—'} icon={MapPin} />
                <InfoRow label="Address" value={lead.address ?? '—'} icon={MapPin} />
                <InfoRow
                  label="Est. value"
                  value={lead.estimatedValue ? formatCurrency(lead.estimatedValue) : '—'}
                />
                <InfoRow label="Campaign" value={lead.campaignName ?? '—'} icon={Megaphone} />
                <InfoRow label="Agent" value={lead.assignedAgentName ?? 'Unassigned'} icon={UserRound} />
              </CardContent>
            </Card>

            <LeadLineItemsCard lead={lead} />
          </div>

          <div className="space-y-4">
            <Card className="gap-0 py-0 shadow-none">
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Tag className="size-4 text-primary" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent className={ORDER_SECTION_BODY_CLASS}>
                {lead.tags.length ? (
                  <div className="flex flex-wrap gap-2">
                    {lead.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No tags</p>
                )}
              </CardContent>
            </Card>

            <EditableSectionCard
              title="Notes"
              icon={<StickyNote className="size-4 text-primary" />}
              editContent={
                <FormField label="Internal note">
                  <FormTextarea
                    rows={5}
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                  />
                </FormField>
              }
              onSave={async () => {
                await saveNotes(notesDraft);
              }}
              onCancel={() => setNotesDraft(lead.notes ?? '')}
            >
              {lead.notes ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No internal notes yet.</p>
              )}
            </EditableSectionCard>

            <Card className="gap-0 py-0 shadow-none">
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <CardTitle className="text-sm">Activity timeline</CardTitle>
              </CardHeader>
              <CardContent className={ORDER_SECTION_BODY_CLASS}>
                <ol className="space-y-4">
                  {lead.activities.map((activity) => (
                    <li key={activity.id} className="flex gap-3 text-sm">
                      <div className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{activity.label}</p>
                        {activity.description ? (
                          <p className="text-muted-foreground">{activity.description}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleString('en-GB')}
                          {activity.actorName ? ` · ${activity.actorName}` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <OrderAssignSheet
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onAssign={assignAgent}
      />

      <LeadStatusDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        currentStatus={lead.status}
        onSelect={changeStatus}
      />
    </PageShell>
  );
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 font-medium">
        {Icon ? <Icon className="size-3.5 text-muted-foreground" /> : null}
        {value}
      </p>
    </div>
  );
}
