'use client';

import Link from 'next/link';
import type { LeadDetail } from '@laam/types';
import {
  ArrowLeft,
  MapPin,
  Megaphone,
  Phone,
  StickyNote,
  Tag,
  UserRound,
} from 'lucide-react';

import { Can } from '@/components/auth/can';
import { EntityStatusBadge } from '@/components/dashboard/entity-status-badge';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LEAD_SOURCE_LABELS } from '@/features/leads/config/lead-filters';
import { formatCurrency } from '@/lib/format';

type LeadDetailViewProps = {
  lead: LeadDetail;
};

export function LeadDetailView({ lead }: LeadDetailViewProps) {
  return (
    <PageShell
      title={lead.leadNumber}
      description={`${lead.name} · ${LEAD_SOURCE_LABELS[lead.source]}`}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/dashboard/leads">
              <ArrowLeft className="size-4" />
              Back to leads
            </Link>
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <EntityStatusBadge status={lead.status} kind="lead" />
            <Can permission="leads.assign">
              <Button type="button" size="sm" variant="secondary">
                <UserRound className="size-4" />
                Assign
              </Button>
            </Can>
            <Can permission="leads.convert">
              <Button type="button" size="sm" disabled={lead.status === 'converted'}>
                Convert to order
              </Button>
            </Can>
            <Button type="button" size="sm" variant="outline">
              <Phone className="size-4" />
              Call
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="gap-0 py-0 shadow-none lg:col-span-2">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="text-sm">Lead information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 px-4 py-4 sm:grid-cols-2">
              <InfoRow label="Name" value={lead.name} />
              <InfoRow label="Phone" value={lead.phone} />
              <InfoRow label="Email" value={lead.email ?? '—'} />
              <InfoRow label="Area" value={lead.area ?? '—'} icon={MapPin} />
              <InfoRow
                label="Est. value"
                value={lead.estimatedValue ? formatCurrency(lead.estimatedValue) : '—'}
              />
              <InfoRow
                label="Campaign"
                value={lead.campaignName ?? '—'}
                icon={Megaphone}
              />
              <InfoRow label="Agent" value={lead.assignedAgentName ?? 'Unassigned'} icon={UserRound} />
              <InfoRow label="Company" value={lead.companyName ?? '—'} />
              {lead.orderId ? (
                <InfoRow
                  label="Order"
                  value={
                    <Link href={`/dashboard/orders/${lead.orderId}`} className="text-primary hover:underline">
                      {lead.orderId}
                    </Link>
                  }
                />
              ) : null}
            </CardContent>
          </Card>

          <Card className="gap-0 py-0 shadow-none">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Tag className="size-4 text-primary" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-4">
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
              {lead.notes ? (
                <div className="mt-4 border-t border-border/70 pt-4">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <StickyNote className="size-4 text-muted-foreground" />
                    Notes
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{lead.notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="text-sm">Activity timeline</CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-4">
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
