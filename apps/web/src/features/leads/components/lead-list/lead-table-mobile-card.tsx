'use client';

import * as React from 'react';
import Link from 'next/link';
import type { LeadListItem } from '@laam/types';
import { MessageCircle, MessageSquare, MessageSquarePlus, Phone, ShoppingBag } from 'lucide-react';

import type { CrmRowContext } from '@/components/data-table';
import {
  DataTableCopyableText,
  DataTableDateTime,
  DataTablePersonCell,
  TruncatedText,
} from '@/components/data-table/cells';
import { EntityStatusBadge } from '@/components/dashboard/entity-status-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { LEAD_SOURCE_LABELS } from '@/features/leads/config/lead-filters';
import { formatLeadDateTime } from '@/features/leads/components/lead-list/lead-table-columns';
import { formatCurrency } from '@/lib/format';

type LeadTableMobileCardProps = {
  row: LeadListItem;
  ctx: CrmRowContext<LeadListItem>;
  onNoteClick?: (row: LeadListItem) => void;
  onConvertClick?: (row: LeadListItem) => void;
};

export function LeadTableMobileCard({
  row,
  ctx,
  onNoteClick,
  onConvertClick,
}: LeadTableMobileCardProps) {
  const displayId = row.leadNumber.replace(/^LD-/, '');
  const phoneDigits = row.phone.replace(/\D/g, '');

  return (
    <div className="divide-y divide-border/60">
      <header className="flex items-start gap-3 p-4">
        <Checkbox
          checked={ctx.isSelected}
          onCheckedChange={(value) => ctx.toggleSelected(Boolean(value))}
          aria-label={`Select lead ${row.leadNumber}`}
          className="mt-1"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <EntityStatusBadge status={row.status} kind="lead" />
            <Link
              href={`/dashboard/leads/${row.leadNumber}`}
              className="text-base font-semibold text-primary hover:underline"
            >
              #{displayId}
            </Link>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => onNoteClick?.(row)}
              aria-label="View notes"
            >
              {row.hasNotes ? (
                <MessageSquare className="size-3.5 text-primary" />
              ) : (
                <MessageSquarePlus className="size-3.5 text-muted-foreground" />
              )}
            </Button>
          </div>
          <DataTablePersonCell name={row.name} phone={row.area} />
          <div className="flex flex-wrap gap-1.5">
            <Button type="button" size="sm" variant="outline" className="h-7 px-2" asChild>
              <a href={`tel:${phoneDigits}`}>
                <Phone className="size-3.5" />
                Call
              </a>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2"
              onClick={() => {
                window.open(`https://wa.me/${phoneDigits}`, '_blank', 'noopener,noreferrer');
              }}
            >
              <MessageCircle className="size-3.5" />
              WhatsApp
            </Button>
            {row.status !== 'converted' ? (
              <Button
                type="button"
                size="sm"
                className="h-7 px-2"
                onClick={() => onConvertClick?.(row)}
              >
                <ShoppingBag className="size-3.5" />
                Convert
              </Button>
            ) : null}
          </div>
        </div>
      </header>
      <div className="grid gap-3 p-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Source</p>
          <p>{LEAD_SOURCE_LABELS[row.source]}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Agent</p>
          <p>{row.assignedAgentName ?? 'Unassigned'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Campaign</p>
          <p>{row.campaignName ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Est. value</p>
          <p className="font-medium tabular-nums">
            {row.estimatedValue ? formatCurrency(row.estimatedValue) : '—'}
          </p>
        </div>
        {row.productSummary ? (
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">Products</p>
            <TruncatedText>{row.productSummary}</TruncatedText>
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <p className="text-xs text-muted-foreground">Phone</p>
          <DataTableCopyableText value={row.phone} />
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs text-muted-foreground">Created</p>
          <DataTableDateTime value={row.createdAt} formatter={formatLeadDateTime} />
        </div>
      </div>
    </div>
  );
}
