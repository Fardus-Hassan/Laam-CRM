import type { LeadStatus } from '@laam/types';

export type LeadPipelineTab = {
  id: LeadStatus | 'all' | 'unassigned';
  label: string;
  description: string;
  color: string;
};

export const LEAD_PIPELINE_TABS: LeadPipelineTab[] = [
  {
    id: 'all',
    label: 'All',
    description: 'Every lead in the pipeline',
    color: 'hsl(var(--primary))',
  },
  {
    id: 'new',
    label: 'New',
    description: 'Fresh inquiries — call back about modhu, khejur, or gift box',
    color: 'hsl(210 90% 50%)',
  },
  {
    id: 'contacted',
    label: 'Contacted',
    description: 'Spoke with buyer — price or delivery discussed',
    color: 'hsl(38 92% 50%)',
  },
  {
    id: 'qualified',
    label: 'Ready',
    description: 'Confirmed interest — ready to place order',
    color: 'hsl(174 58% 42%)',
  },
  {
    id: 'converted',
    label: 'Converted',
    description: 'Successfully converted to orders',
    color: 'hsl(142 70% 38%)',
  },
  {
    id: 'lost',
    label: 'Lost',
    description: 'Did not convert — closed',
    color: 'hsl(0 72% 51%)',
  },
  {
    id: 'unassigned',
    label: 'Unassigned',
    description: 'No agent assigned yet',
    color: 'hsl(262 60% 52%)',
  },
];

export function getLeadTabById(id: string): LeadPipelineTab | undefined {
  return LEAD_PIPELINE_TABS.find((tab) => tab.id === id);
}
