'use client';

import Link from 'next/link';
import type { ContactDetail } from '@laam/types';
import {
  ArrowLeft,
  Building2,
  MessageCircle,
  Phone,
  ShoppingBag,
  User,
} from 'lucide-react';

import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CourierScoreCell } from '@/features/customers/components/shared/courier-score-cell';
import { ContactTypeBadge } from '@/features/contacts/components/shared/contact-type-badge';
import { CONTACT_SOURCE_LABELS } from '@/features/contacts/config/contact-filters';
import { formatContactDate } from '@/features/contacts/components/contact-list/contact-table-columns';
import { formatCurrency } from '@/lib/format';

export function ContactDetailView({ contact }: { contact: ContactDetail }) {
  const phoneDigits = contact.phone.replace(/\D/g, '');
  const isCustomer = contact.contactType === 'customer';

  return (
    <PageShell
      title={contact.name}
      description={`${CONTACT_SOURCE_LABELS[contact.source]} · ${contact.assignedAgentName ?? 'Unassigned'}`}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/dashboard/contacts">
              <ArrowLeft className="size-4" />
              Back to contacts
            </Link>
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" asChild>
              <a href={`tel:${phoneDigits}`}>
                <Phone className="size-4" />
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
              <MessageCircle className="size-4" />
              WhatsApp
            </Button>
            {contact.inventorySupplierId ? (
              <Button type="button" size="sm" variant="outline" asChild>
                <Link href="/dashboard/inventory/suppliers">
                  <Building2 className="size-4" />
                  Inventory supplier
                </Link>
              </Button>
            ) : null}
            {isCustomer ? (
              <Button type="button" size="sm" asChild>
                <Link href={`/dashboard/orders/new?phone=${encodeURIComponent(contact.phone)}`}>
                  <ShoppingBag className="size-4" />
                  New order
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ContactTypeBadge type={contact.contactType} />
          {contact.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="gap-0 py-0 shadow-none lg:col-span-2">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="text-sm">Contact details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 px-4 py-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="mt-1 font-medium">{contact.phone}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="mt-1 font-medium">{contact.email ?? '—'}</p>
              </div>
              {contact.organizationName ? (
                <div>
                  <p className="text-xs text-muted-foreground">Organization</p>
                  <p className="mt-1 flex items-center gap-1.5 font-medium">
                    <Building2 className="size-3.5" />
                    {contact.organizationName}
                  </p>
                </div>
              ) : null}
              {contact.roleLabel ? (
                <div>
                  <p className="text-xs text-muted-foreground">Role</p>
                  <p className="mt-1 font-medium">{contact.roleLabel}</p>
                </div>
              ) : null}
              <div>
                <p className="text-xs text-muted-foreground">Agent</p>
                <p className="mt-1 font-medium">{contact.assignedAgentName ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last contact</p>
                <p className="mt-1 font-medium">
                  {contact.lastContactAt ? formatContactDate(contact.lastContactAt) : '—'}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="mt-1 font-medium">
                  {contact.address ??
                    ([contact.area, contact.district].filter(Boolean).join(', ') || '—')}
                </p>
              </div>
              {contact.customerId ? (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Linked customer profile</p>
                  <p className="mt-1">
                    <Link
                      href={`/dashboard/companies/${contact.customerId}`}
                      className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                    >
                      <User className="size-3.5" />
                      View customer #{contact.contactNumber}
                    </Link>
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="gap-0 py-0 shadow-none">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="text-sm">
                {isCustomer ? 'Order summary' : 'Notes'}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-4">
              {isCustomer && contact.orderCount !== undefined ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Orders</p>
                    <p className="font-semibold tabular-nums">
                      {contact.orderCount}{' '}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({contact.deliveredCount} delivered)
                      </span>
                    </p>
                  </div>
                  {contact.totalSpent !== undefined ? (
                    <div>
                      <p className="text-xs text-muted-foreground">Total spent</p>
                      <p className="font-semibold">{formatCurrency(contact.totalSpent)}</p>
                    </div>
                  ) : null}
                  {contact.courierScore ? (
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Courier score</p>
                      <CourierScoreCell score={contact.courierScore} />
                    </div>
                  ) : null}
                  {contact.recentProducts.length > 0 ? (
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Recent products</p>
                      <ul className="space-y-1 text-xs">
                        {contact.recentProducts.slice(0, 3).map((p, i) => (
                          <li key={`${p.productName}-${i}`}>
                            {formatContactDate(p.orderedAt)} — {p.productName} ×{p.quantity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {contact.notes ?? 'No notes yet.'}
                </p>
              )}
              {isCustomer && contact.notes ? (
                <p className="mt-4 border-t pt-3 text-sm text-muted-foreground">{contact.notes}</p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="text-sm">Activity</CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-4">
            <ol className="space-y-3">
              {contact.activities.map((a) => (
                <li key={a.id} className="text-sm">
                  <p className="font-medium">{a.label}</p>
                  {a.description ? <p className="text-muted-foreground">{a.description}</p> : null}
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.timestamp).toLocaleString('en-GB')}
                    {a.actorName ? ` · ${a.actorName}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
