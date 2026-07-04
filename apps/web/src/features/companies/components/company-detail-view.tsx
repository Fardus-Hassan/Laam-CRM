'use client';

import Link from 'next/link';
import type { CompanyDetail } from '@laam/types';
import { ArrowLeft, ShoppingBag } from 'lucide-react';

import { EntityStatusBadge } from '@/components/dashboard/entity-status-badge';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';

export function CompanyDetailView({ company }: { company: CompanyDetail }) {
  const areaLabel = [company.industry, company.city].filter(Boolean).join(', ');

  return (
    <PageShell
      title={company.name}
      description={areaLabel || 'Customer profile'}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/dashboard/companies">
              <ArrowLeft className="size-4" />
              Back to customers
            </Link>
          </Button>
          <Button type="button" size="sm" asChild>
            <Link href={`/dashboard/orders/new?phone=${encodeURIComponent(company.phone ?? '')}`}>
              <ShoppingBag className="size-4" />
              New order
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="gap-0 py-0 shadow-none lg:col-span-2">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                Customer profile
                <EntityStatusBadge status={company.status} kind="company" />
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 px-4 py-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Mobile</p>
                <p className="mt-1 font-medium">{company.phone ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="mt-1 font-medium">{company.email ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Area</p>
                <p className="mt-1 font-medium">{company.industry ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">District</p>
                <p className="mt-1 font-medium">{company.city ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total spent</p>
                <p className="mt-1 font-medium">{formatCurrency(company.dealValue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Orders</p>
                <p className="mt-1 font-medium">{company.contactCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Agent</p>
                <p className="mt-1 font-medium">{company.assignedAgentName ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Member since</p>
                <p className="mt-1 font-medium">
                  {new Date(company.createdAt).toLocaleDateString('en-GB')}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Delivery address</p>
                <p className="mt-1 font-medium">{company.address ?? '—'}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="gap-0 py-0 shadow-none">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="text-sm">Tags & notes</CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-4">
              {company.tags.length ? (
                <div className="flex flex-wrap gap-2">
                  {company.tags.map((t) => (
                    <Badge key={t} variant="secondary">
                      {t}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tags</p>
              )}
              {company.notes ? (
                <p className="mt-4 text-sm text-muted-foreground">{company.notes}</p>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">No internal notes yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
