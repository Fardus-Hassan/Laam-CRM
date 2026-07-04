'use client';

import * as React from 'react';
import type { LeadStatus } from '@laam/types';
import { toast } from 'sonner';

import { leadsApi } from '@/features/leads/api/leads-api';

export function useLeadMutations() {
  const [isLoading, setIsLoading] = React.useState(false);

  const createLead = React.useCallback(async (payload: Parameters<typeof leadsApi.createLead>[0]) => {
    setIsLoading(true);
    try {
      const lead = await leadsApi.createLead(payload);
      toast.success(`Lead ${lead.leadNumber} created`);
      return lead;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create lead');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateLead = React.useCallback(
    async (leadId: string, patch: Parameters<typeof leadsApi.updateLead>[1]) => {
      setIsLoading(true);
      try {
        const lead = await leadsApi.updateLead(leadId, patch);
        toast.success('Lead updated');
        return lead;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update lead');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const bulkAction = React.useCallback(
    async (payload: Parameters<typeof leadsApi.bulkAction>[0]) => {
      setIsLoading(true);
      try {
        const result = await leadsApi.bulkAction(payload);
        toast.success(result.message ?? `Updated ${result.successCount} lead(s)`);
        return result;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Bulk action failed');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const startConvert = React.useCallback(async (leadId: string) => {
    const prefill = await leadsApi.prepareConvert(leadId);
    if (!prefill) {
      toast.error('Lead not found');
      return null;
    }
    return prefill;
  }, []);

  return { isLoading, createLead, updateLead, bulkAction, startConvert };
}

export function useLeadDetailMutations(
  leadId: string | null,
  onUpdated?: (lead: Awaited<ReturnType<typeof leadsApi.getLead>>) => void,
) {
  const { updateLead, isLoading } = useLeadMutations();

  const assignAgent = React.useCallback(
    async (assignedAgentName: string) => {
      if (!leadId) return;
      const updated = await updateLead(leadId, { assignedAgentName });
      if (updated) onUpdated?.(updated);
    },
    [leadId, onUpdated, updateLead],
  );

  const changeStatus = React.useCallback(
    async (status: LeadStatus) => {
      if (!leadId) return;
      const updated = await updateLead(leadId, { status });
      if (updated) onUpdated?.(updated);
    },
    [leadId, onUpdated, updateLead],
  );

  const saveNotes = React.useCallback(
    async (notes: string) => {
      if (!leadId) return;
      const updated = await updateLead(leadId, { notes });
      if (updated) onUpdated?.(updated);
    },
    [leadId, onUpdated, updateLead],
  );

  return { isLoading, assignAgent, changeStatus, saveNotes, updateLead };
}
