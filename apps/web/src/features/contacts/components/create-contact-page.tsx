'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ContactType, OrderSource } from '@laam/types';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormPhoneInput } from '@/components/form/form-phone-input';
import { FormSelect } from '@/components/form/form-select';
import { FormTextarea } from '@/components/form/form-textarea';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateContactSummaryPanel } from '@/features/contacts/components/create-contact/create-contact-summary-panel';
import { CreateContactTypePicker } from '@/features/contacts/components/create-contact/create-contact-type-picker';
import { CONTACT_SOURCE_LABELS } from '@/features/contacts/config/contact-filters';
import { useContactMutations } from '@/features/contacts/hooks/use-contact-mutations';
import { createContactsListBreadcrumbs } from '@/features/contacts/lib/contact-breadcrumbs';
import { useAgentOptions } from '@/features/rbac/hooks/use-agent-options';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_GRID_GAP,
  ORDER_SECTION_HEADER_CLASS,
  ORDER_SIDEBAR_GRID_CLASS,
  ORDER_STICKY_MAX_H_CLASS,
  ORDER_STICKY_TOP_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

const SOURCE_OPTIONS = (Object.keys(CONTACT_SOURCE_LABELS) as OrderSource[]).map((source) => ({
  id: source,
  label: CONTACT_SOURCE_LABELS[source],
}));

export function CreateContactPage() {
  const router = useRouter();
  const { createContact, isLoading } = useContactMutations();
  const { agents } = useAgentOptions();
  const [draft, setDraft] = React.useState({
    name: '',
    phone: '',
    email: '',
    contactType: 'supplier' as ContactType,
    organizationName: '',
    roleLabel: '',
    source: 'call' as OrderSource,
    area: '',
    district: '',
    address: '',
    assignedAgentName: '',
    notes: '',
  });

  function patch(values: Partial<typeof draft>) {
    setDraft((current) => ({ ...current, ...values }));
  }

  const isCustomer = draft.contactType === 'customer';
  const showOrgFields = !isCustomer;
  const canSubmit = draft.name.trim().length > 0 && draft.phone.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit) {
      toast.error('Name and mobile are required');
      return;
    }

    const contact = await createContact({
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim() || undefined,
      contactType: draft.contactType,
      organizationName: showOrgFields ? draft.organizationName.trim() || undefined : undefined,
      roleLabel: showOrgFields ? draft.roleLabel.trim() || undefined : undefined,
      source: draft.source,
      area: draft.area.trim() || undefined,
      district: draft.district.trim() || undefined,
      address: draft.address.trim() || undefined,
      assignedAgentName: draft.assignedAgentName || undefined,
      notes: draft.notes.trim() || undefined,
      syncInventorySupplier: draft.contactType === 'supplier',
    });

    router.push(`/dashboard/contacts/${contact.id}`);
  }

  return (
    <PageShell
      title="New contact"
      description="Add a buyer, supplier, courier partner, or anyone else you need to reach."
      breadcrumbs={[
        ...createContactsListBreadcrumbs(),
        { label: 'New contact' },
      ]}
    >
      <div className={ORDER_PAGE_GAP}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/dashboard/contacts">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            <span className="text-destructive">*</span> Name and mobile required
          </p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
          className={cn('grid gap-4', ORDER_SIDEBAR_GRID_CLASS)}
        >
          <div className="space-y-4 pb-28 lg:pb-0">
            <Card className={ORDER_CARD_CLASS}>
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <CardTitle className="text-sm">Who is this contact?</CardTitle>
              </CardHeader>
              <CardContent className={ORDER_SECTION_BODY_CLASS}>
                <CreateContactTypePicker
                  value={draft.contactType}
                  onChange={(contactType) => patch({ contactType })}
                />
                {isCustomer ? (
                  <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                    Buyers with orders belong in Customers.{' '}
                    <Link href="/dashboard/customers/new" className="font-medium underline">
                      Create a customer instead
                    </Link>{' '}
                    so phone, courier score, and order history stay linked.
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card className={ORDER_CARD_CLASS}>
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <CardTitle className="text-sm">How did you reach them?</CardTitle>
              </CardHeader>
              <CardContent className={ORDER_SECTION_BODY_CLASS}>
                <div className="flex flex-wrap gap-2">
                  {SOURCE_OPTIONS.map((option) => {
                    const isActive = draft.source === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => patch({ source: option.id })}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                          isActive
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className={ORDER_CARD_CLASS}>
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <CardTitle className="text-sm">Contact details</CardTitle>
              </CardHeader>
              <CardContent
                className={cn('grid sm:grid-cols-2', ORDER_SECTION_BODY_CLASS, ORDER_SECTION_GRID_GAP)}
              >
                <FormField label="Name" required>
                  <FormInput
                    value={draft.name}
                    onChange={(e) => patch({ name: e.target.value })}
                    placeholder={isCustomer ? 'e.g. Fatema Akter' : 'Contact person name'}
                    autoComplete="name"
                    autoFocus
                  />
                </FormField>
                <FormField label="Mobile" required>
                  <FormPhoneInput
                    value={draft.phone}
                    onChange={(e) => patch({ phone: e.target.value })}
                    layout="stacked"
                    autoComplete="tel"
                  />
                </FormField>
                <FormField label="Email">
                  <FormInput
                    type="email"
                    value={draft.email}
                    onChange={(e) => patch({ email: e.target.value })}
                    placeholder="Optional"
                    autoComplete="email"
                  />
                </FormField>
                <FormField label="Assigned agent">
                  <FormSelect
                    value={draft.assignedAgentName}
                    onChange={(value) => patch({ assignedAgentName: value })}
                    options={[
                      { value: '', label: 'Unassigned' },
                      ...agents.map((name) => ({ value: name, label: name })),
                    ]}
                    placeholder="Optional"
                  />
                </FormField>

                {showOrgFields ? (
                  <>
                    <FormField label="Organization">
                      <FormInput
                        value={draft.organizationName}
                        onChange={(e) => patch({ organizationName: e.target.value })}
                        placeholder="e.g. Sundarban Honey Co-op"
                      />
                    </FormField>
                    <FormField label="Role">
                      <FormInput
                        value={draft.roleLabel}
                        onChange={(e) => patch({ roleLabel: e.target.value })}
                        placeholder="e.g. Honey supplier"
                      />
                    </FormField>
                  </>
                ) : null}

                <FormField label="Area">
                  <FormInput
                    value={draft.area}
                    onChange={(e) => patch({ area: e.target.value })}
                    placeholder="e.g. Mirpur"
                  />
                </FormField>
                <FormField label="District">
                  <FormInput
                    value={draft.district}
                    onChange={(e) => patch({ district: e.target.value })}
                    placeholder="e.g. Dhaka"
                  />
                </FormField>
                <FormField label="Full address" className="sm:col-span-2">
                  <FormInput
                    value={draft.address}
                    onChange={(e) => patch({ address: e.target.value })}
                    placeholder="House, road, area"
                  />
                </FormField>
                <FormField label="Notes" className="sm:col-span-2">
                  <FormTextarea
                    rows={3}
                    value={draft.notes}
                    onChange={(e) => patch({ notes: e.target.value })}
                    placeholder="Prefers WhatsApp, bulk buyer, callback after 8pm, etc."
                  />
                </FormField>
              </CardContent>
            </Card>
          </div>

          <div className="hidden lg:block">
            <div
              className={cn(
                'custom-scrollbar sticky z-30 overflow-y-auto',
                ORDER_STICKY_TOP_CLASS,
                ORDER_STICKY_MAX_H_CLASS,
              )}
            >
              <CreateContactSummaryPanel
                contactType={draft.contactType}
                name={draft.name}
                phone={draft.phone}
                source={draft.source}
                organizationName={draft.organizationName}
                roleLabel={draft.roleLabel}
                isLoading={isLoading}
                canSubmit={canSubmit}
                onSubmit={() => void handleSubmit()}
              />
            </div>
          </div>

          <div className="lg:hidden">
            <CreateContactSummaryPanel
              contactType={draft.contactType}
              name={draft.name}
              phone={draft.phone}
              source={draft.source}
              organizationName={draft.organizationName}
              roleLabel={draft.roleLabel}
              isLoading={isLoading}
              canSubmit={canSubmit}
              onSubmit={() => void handleSubmit()}
              showActions={false}
            />
          </div>
        </form>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{draft.name.trim() || 'New contact'}</p>
            <p className="truncate text-xs text-muted-foreground">
              {draft.phone.trim() || 'Add mobile to continue'}
            </p>
          </div>
          <Button
            type="button"
            className="shrink-0"
            disabled={!canSubmit || isLoading}
            onClick={() => void handleSubmit()}
          >
            Create
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
