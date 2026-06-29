'use client';

import Link from 'next/link';
import type { ContactDetail } from '@laam/types';
import { ArrowLeft, Building2, Phone } from 'lucide-react';

import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CONTACT_SOURCE_LABELS } from '@/features/contacts/config/contact-filters';

export function ContactDetailView({ contact }: { contact: ContactDetail }) {
  return (
    <PageShell title={contact.name} description={CONTACT_SOURCE_LABELS[contact.source]}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/dashboard/contacts">
              <ArrowLeft className="size-4" />
              Back to contacts
            </Link>
          </Button>
          <Button type="button" size="sm" variant="outline">
            <Phone className="size-4" />
            Call
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="gap-0 py-0 shadow-none lg:col-span-2">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="text-sm">Contact details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 px-4 py-4 sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Phone</p><p className="mt-1 font-medium">{contact.phone}</p></div>
              <div><p className="text-xs text-muted-foreground">Email</p><p className="mt-1 font-medium">{contact.email ?? '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Job title</p><p className="mt-1 font-medium">{contact.jobTitle ?? '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Agent</p><p className="mt-1 font-medium">{contact.assignedAgentName ?? '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Address</p><p className="mt-1 font-medium">{contact.address ?? '—'}</p></div>
              {contact.companyName ? (
                <div>
                  <p className="text-xs text-muted-foreground">Company</p>
                  <p className="mt-1 flex items-center gap-1.5 font-medium">
                    <Building2 className="size-3.5" />
                    {contact.companyId ? (
                      <Link href={`/dashboard/companies/${contact.companyId}`} className="text-primary hover:underline">
                        {contact.companyName}
                      </Link>
                    ) : (
                      contact.companyName
                    )}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="gap-0 py-0 shadow-none">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="text-sm">Tags & notes</CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-4">
              {contact.tags.length ? (
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tags</p>
              )}
              {contact.notes ? <p className="mt-4 text-sm text-muted-foreground">{contact.notes}</p> : null}
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
                  <p className="text-xs text-muted-foreground">{new Date(a.timestamp).toLocaleString('en-GB')}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
