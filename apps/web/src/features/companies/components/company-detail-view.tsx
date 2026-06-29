'use client';

import Link from 'next/link';
import type { CompanyDetail } from '@laam/types';
import { ArrowLeft } from 'lucide-react';

import { EntityStatusBadge } from '@/components/dashboard/entity-status-badge';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';

export function CompanyDetailView({ company }: { company: CompanyDetail }) {
  return (
    <PageShell title={company.name} description={company.industry ?? 'Customer account'}>
      <div className="space-y-4">
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/dashboard/companies">
            <ArrowLeft className="size-4" />
            Back to customers
          </Link>
        </Button>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="gap-0 py-0 shadow-none lg:col-span-2">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                Account overview
                <EntityStatusBadge status={company.status} kind="company" />
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 px-4 py-4 sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Phone</p><p className="mt-1 font-medium">{company.phone ?? '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Email</p><p className="mt-1 font-medium">{company.email ?? '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">City</p><p className="mt-1 font-medium">{company.city ?? '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Deal value</p><p className="mt-1 font-medium">{formatCurrency(company.dealValue)}</p></div>
              <div><p className="text-xs text-muted-foreground">Contacts</p><p className="mt-1 font-medium">{company.contactCount}</p></div>
              <div><p className="text-xs text-muted-foreground">Agent</p><p className="mt-1 font-medium">{company.assignedAgentName ?? '—'}</p></div>
              <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Address</p><p className="mt-1 font-medium">{company.address ?? '—'}</p></div>
              {company.website ? (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Website</p>
                  <a href={company.website} className="mt-1 block font-medium text-primary hover:underline" target="_blank" rel="noreferrer">{company.website}</a>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="gap-0 py-0 shadow-none">
            <CardHeader className="border-b px-4 py-3"><CardTitle className="text-sm">Tags & notes</CardTitle></CardHeader>
            <CardContent className="px-4 py-4">
              {company.tags.length ? (
                <div className="flex flex-wrap gap-2">{company.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}</div>
              ) : <p className="text-sm text-muted-foreground">No tags</p>}
              {company.notes ? <p className="mt-4 text-sm text-muted-foreground">{company.notes}</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
