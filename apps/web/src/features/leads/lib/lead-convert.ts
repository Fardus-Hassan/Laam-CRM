'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { leadsApi } from '@/features/leads/api/leads-api';

export async function navigateToConvertLead(leadId: string, router: ReturnType<typeof useRouter>) {
  try {
    const prefill = await leadsApi.prepareConvert(leadId);
    if (!prefill) return;
    toast.success(`Opening order form for ${prefill.leadNumber}`);
    router.push(`/dashboard/orders/new?fromLead=${encodeURIComponent(prefill.leadNumber)}`);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Cannot convert lead');
  }
}
