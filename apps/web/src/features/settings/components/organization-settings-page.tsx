'use client';

import * as React from 'react';
import type { OrgProfile } from '@laam/types';
import { Building2, Save } from 'lucide-react';

import { Can } from '@/components/auth/can';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useConnectedCouriers } from '@/features/courier/hooks/use-connected-couriers';
import { orgSettingsApi } from '@/features/settings/api/org-settings-api';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

export function OrganizationSettingsPage() {
  const [profile, setProfile] = React.useState<OrgProfile | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const { connected, loading: couriersLoading } = useConnectedCouriers();
  const courierOptions = connected.map((p) => ({
    value: p.id,
    label: p.label,
  }));

  React.useEffect(() => {
    void orgSettingsApi.getSettings().then((s) => setProfile(s.profile));
  }, []);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setSaved(false);
    try {
      const updated = await orgSettingsApi.updateProfile(profile);
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <PageShell title="Organization" description="Company profile and defaults.">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Organization"
      description="Company profile, order defaults, and regional settings."
    >
      <div className={ORDER_PAGE_GAP}>
        <Card className={ORDER_CARD_CLASS}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              <CardTitle className="text-sm">Company profile</CardTitle>
            </div>
          </CardHeader>
          <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'grid gap-4 sm:grid-cols-2')}>
            <FormField label="Business name">
              <FormInput value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            </FormField>
            <FormField label="Slug">
              <FormInput value={profile.slug} onChange={(e) => setProfile({ ...profile, slug: e.target.value })} />
            </FormField>
            <FormField label="Email">
              <FormInput type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            </FormField>
            <FormField label="Phone">
              <FormInput value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            </FormField>
            <FormField label="Address" className="sm:col-span-2">
              <FormInput value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
            </FormField>
            <FormField label="District">
              <FormInput value={profile.district} onChange={(e) => setProfile({ ...profile, district: e.target.value })} />
            </FormField>
            <FormField label="Website">
              <FormInput value={profile.website ?? ''} onChange={(e) => setProfile({ ...profile, website: e.target.value })} />
            </FormField>
          </CardContent>
        </Card>

        <Card className={ORDER_CARD_CLASS}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">Order defaults</CardTitle>
          </CardHeader>
          <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'grid gap-4 sm:grid-cols-2')}>
            <FormField label="Order prefix">
              <FormInput value={profile.orderPrefix} onChange={(e) => setProfile({ ...profile, orderPrefix: e.target.value })} placeholder="MH" />
            </FormField>
            <FormField label="Default courier">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={
                  courierOptions.some((c) => c.value === profile.defaultCourier)
                    ? profile.defaultCourier
                    : ''
                }
                onChange={(e) => setProfile({ ...profile, defaultCourier: e.target.value })}
                disabled={couriersLoading || courierOptions.length === 0}
              >
                <option value="">
                  {couriersLoading
                    ? 'Loading…'
                    : courierOptions.length
                      ? 'Select connected courier'
                      : 'No courier connected'}
                </option>
                {courierOptions.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Timezone">
              <FormInput value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })} />
            </FormField>
            <FormField label="Currency">
              <FormInput value={profile.currency} onChange={(e) => setProfile({ ...profile, currency: e.target.value })} />
            </FormField>
          </CardContent>
        </Card>

        <Can permission="settings.manage">
          <div className="flex items-center gap-3">
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              <Save className="size-4" />
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
            {saved ? <span className="text-sm text-primary">Saved!</span> : null}
          </div>
        </Can>
      </div>
    </PageShell>
  );
}
