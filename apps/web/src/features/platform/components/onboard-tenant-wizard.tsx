'use client';

import * as React from 'react';
import type { CreateTenantRequest, TenantPlan } from '@laam/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type OnboardTenantWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateTenantRequest) => Promise<void>;
};

const PLANS: TenantPlan[] = ['Starter', 'Pro', 'Enterprise'];

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function OnboardTenantWizard({
  open,
  onOpenChange,
  onSubmit,
}: OnboardTenantWizardProps) {
  const [step, setStep] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [companyName, setCompanyName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [plan, setPlan] = React.useState<TenantPlan>('Pro');
  const [ownerName, setOwnerName] = React.useState('');
  const [ownerEmail, setOwnerEmail] = React.useState('');
  const [ownerPhone, setOwnerPhone] = React.useState('');

  React.useEffect(() => {
    if (!open) {
      setStep(0);
      setIsSubmitting(false);
      setCompanyName('');
      setSlug('');
      setSlugTouched(false);
      setPlan('Pro');
      setOwnerName('');
      setOwnerEmail('');
      setOwnerPhone('');
    }
  }, [open]);

  React.useEffect(() => {
    if (!slugTouched) {
      setSlug(slugify(companyName));
    }
  }, [companyName, slugTouched]);

  const canContinueStep1 = companyName.trim().length > 0 && slug.trim().length > 0;
  const canContinueStep2 =
    ownerName.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      await onSubmit({
        name: companyName.trim(),
        slug: slug.trim(),
        plan,
        owner: {
          name: ownerName.trim(),
          email: ownerEmail.trim(),
          phone: ownerPhone.trim() || undefined,
        },
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Onboard Company</SheetTitle>
          <SheetDescription>
            Step {step + 1} of 3 — create a tenant and assign the first Org Admin.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4">
          {step === 0 ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="company-name">Company name</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="Acme Foods Ltd."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-slug">Slug</Label>
                <Input
                  id="company-slug"
                  value={slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setSlug(event.target.value);
                  }}
                  placeholder="acme-foods"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-plan">Plan</Label>
                <select
                  id="company-plan"
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={plan}
                  onChange={(event) => setPlan(event.target.value as TenantPlan)}
                >
                  {PLANS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="owner-name">Owner name</Label>
                <Input
                  id="owner-name"
                  value={ownerName}
                  onChange={(event) => setOwnerName(event.target.value)}
                  placeholder="Karim Uddin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner-email">Owner email</Label>
                <Input
                  id="owner-email"
                  type="email"
                  value={ownerEmail}
                  onChange={(event) => setOwnerEmail(event.target.value)}
                  placeholder="owner@acmefoods.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner-phone">Phone (optional)</Label>
                <Input
                  id="owner-phone"
                  value={ownerPhone}
                  onChange={(event) => setOwnerPhone(event.target.value)}
                  placeholder="+880 1XXX-XXXXXX"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                The owner gets full organization access (Org Admin) and can create roles and
                invite users.
              </p>
            </>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Company</p>
                <p className="font-medium">{companyName}</p>
                <p className="text-xs text-muted-foreground">
                  {slug} · {plan}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Owner (Org Admin)</p>
                <p className="font-medium">{ownerName}</p>
                <p className="text-xs text-muted-foreground">{ownerEmail}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Default roles (Sales Agent, Team Leader, etc.) will be cloned for this tenant.
              </p>
            </div>
          ) : null}
        </div>

        <SheetFooter className="flex-row justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0 || isSubmitting}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
          >
            Back
          </Button>
          {step < 2 ? (
            <Button
              type="button"
              disabled={(step === 0 && !canContinueStep1) || (step === 1 && !canContinueStep2)}
              onClick={() => setStep((current) => current + 1)}
            >
              Continue
            </Button>
          ) : (
            <Button type="button" disabled={isSubmitting} onClick={() => void handleSubmit()}>
              {isSubmitting ? 'Creating…' : 'Create & send invite'}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
