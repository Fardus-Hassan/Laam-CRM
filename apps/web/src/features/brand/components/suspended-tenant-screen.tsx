'use client';

import Link from 'next/link';
import { Ban } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { platformLoginUrl } from '@/lib/tenant';

type SuspendedTenantScreenProps = {
  slug: string;
  companyName?: string;
};

/** Shown when a tenant subdomain exists but the company is suspended. */
export function SuspendedTenantScreen({ slug, companyName }: SuspendedTenantScreenProps) {
  const label = companyName?.trim() || slug;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 py-12 text-center">
      <div className="mb-6 flex size-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
        <Ban className="size-6 text-zinc-400" aria-hidden />
      </div>
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
        Workspace suspended
      </p>
      <h1 className="mt-3 max-w-md text-2xl font-semibold tracking-tight text-zinc-50">
        “{label}” is temporarily unavailable
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
        This company account has been suspended. Data is kept, but sign-in is disabled until a
        platform admin reactivates it.
      </p>
      <div className="mt-8">
        <Button type="button" className="bg-zinc-100 text-zinc-950 hover:bg-white" asChild>
          <Link href={platformLoginUrl()}>Go to platform login</Link>
        </Button>
      </div>
      <p className="mt-10 font-mono text-[11px] text-zinc-600">{slug}.localhost</p>
    </div>
  );
}
