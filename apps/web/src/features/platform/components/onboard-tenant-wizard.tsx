'use client';

import * as React from 'react';
import type { CreateTenantRequest, TenantPlan } from '@laam/types';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetBody,
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

type ExtraAdmin = { name: string; email: string };

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
  const [extraAdmins, setExtraAdmins] = React.useState<ExtraAdmin[]>([]);

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
      setExtraAdmins([]);
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

  const extraAdminsValid = extraAdmins.every(
    (admin) =>
      admin.name.trim().length > 0 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email.trim()),
  );

  const handleSubmit = async () => {
    if (!extraAdminsValid) {
      return;
    }
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
        additionalAdmins: extraAdmins.map((admin) => ({
          name: admin.name.trim(),
          email: admin.email.trim(),
        })),
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
            Step {step + 1} of 3 — create a tenant and assign Org Admin(s).
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="flex-1 space-y-4 overflow-y-auto">
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
                <Label htmlFor="owner-name">Primary admin name</Label>
                <Input
                  id="owner-name"
                  value={ownerName}
                  onChange={(event) => setOwnerName(event.target.value)}
                  placeholder="Karim Uddin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner-email">Primary admin email</Label>
                <Input
                  id="owner-email"
                  type="email"
                  value={ownerEmail}
                  onChange={(event) => setOwnerEmail(event.target.value)}
                  placeholder="owner@acmefoods.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner-phone">Company phone (optional)</Label>
                <Input
                  id="owner-phone"
                  value={ownerPhone}
                  onChange={(event) => setOwnerPhone(event.target.value)}
                  placeholder="+880 1XXX-XXXXXX"
                />
              </div>

              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Additional admins</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setExtraAdmins((prev) => [...prev, { name: '', email: '' }])}
                  >
                    <Plus className="size-3.5" />
                    Add admin
                  </Button>
                </div>
                {extraAdmins.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Optional — add more Org Admins now, or later from the tenants table.
                  </p>
                ) : (
                  extraAdmins.map((admin, index) => (
                    <div key={index} className="space-y-2 rounded-md border p-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">
                          Admin {index + 2}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setExtraAdmins((prev) => prev.filter((_, i) => i !== index))
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                      <Input
                        value={admin.name}
                        onChange={(event) =>
                          setExtraAdmins((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, name: event.target.value } : item,
                            ),
                          )
                        }
                        placeholder="Name"
                      />
                      <Input
                        type="email"
                        value={admin.email}
                        onChange={(event) =>
                          setExtraAdmins((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, email: event.target.value } : item,
                            ),
                          )
                        }
                        placeholder="email@company.com"
                      />
                    </div>
                  ))
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Each admin gets full organization access (Org Admin) and can manage roles and
                users.
              </p>
            </>
          ) : null}

          {step === 2 ? (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
              <p>
                <span className="text-muted-foreground">Company:</span> {companyName} ({slug})
              </p>
              <p>
                <span className="text-muted-foreground">Plan:</span> {plan}
              </p>
              <p>
                <span className="text-muted-foreground">Phone:</span> {ownerPhone || '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Primary admin:</span> {ownerName} (
                {ownerEmail})
              </p>
              {extraAdmins.length ? (
                <div>
                  <p className="text-muted-foreground">Additional admins:</p>
                  <ul className="mt-1 list-inside list-disc">
                    {extraAdmins.map((admin) => (
                      <li key={admin.email}>
                        {admin.name} ({admin.email})
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </SheetBody>

        <SheetFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0 || isSubmitting}
            onClick={() => setStep((prev) => Math.max(0, prev - 1))}
          >
            Back
          </Button>
          {step < 2 ? (
            <Button
              type="button"
              disabled={
                (step === 0 && !canContinueStep1) ||
                (step === 1 && (!canContinueStep2 || !extraAdminsValid))
              }
              onClick={() => setStep((prev) => prev + 1)}
            >
              Continue
            </Button>
          ) : (
            <Button type="button" disabled={isSubmitting} onClick={() => void handleSubmit()}>
              {isSubmitting ? 'Creating…' : 'Create company'}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
