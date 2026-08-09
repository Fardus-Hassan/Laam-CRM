'use client';

import Link from 'next/link';
import { Building2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { platformLoginUrl } from '@/lib/tenant';

type UnknownTenantScreenProps = {
  slug: string;
};

/** Shown for unknown / missing tenant hosts — no app shell or login chrome. */
export function UnknownTenantScreen({ slug }: UnknownTenantScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 py-12 text-center">
      <div className="mb-6 flex size-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
        <Building2 className="size-6 text-zinc-400" aria-hidden />
      </div>
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
        Workspace not found
      </p>
      <h1 className="mt-3 max-w-md text-2xl font-semibold tracking-tight text-zinc-50">
        We couldn’t find a company for “{slug}”
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
        That subdomain isn’t registered on Laam. Double-check the URL you were invited with, or
        open the platform login if you manage workspaces.
      </p>
      <div className="mt-8">
        <Button
          type="button"
          className="bg-zinc-100 text-zinc-950 hover:bg-white"
          asChild
        >
          <Link href={platformLoginUrl()}>Go to platform login</Link>
        </Button>
      </div>
      <p className="mt-10 font-mono text-[11px] text-zinc-600">{slug}.localhost</p>
    </div>
  );
}
