'use client';

import type { CampaignPerformanceRow } from '@laam/types';

import { formatCurrency } from '@/lib/format';
import { DataTable, type DataTableColumn } from '@/components/dashboard/data-table';
import { TableProgressCell } from '@/components/dashboard/table-progress-cell';

const CAMPAIGN_COLUMNS: DataTableColumn<CampaignPerformanceRow>[] = [
  {
    id: 'name',
    header: 'Campaign',
    className: 'min-w-[140px]',
    cell: (row) => <span className="font-medium">{row.name}</span>,
  },
  {
    id: 'channel',
    header: 'Channel',
    className: 'min-w-[100px]',
    cell: (row) => row.channel,
  },
  {
    id: 'leads',
    header: 'Leads',
    cell: (row) => row.leads.toLocaleString('en-BD'),
  },
  {
    id: 'qualified',
    header: 'Qualified',
    cell: (row) => row.qualifiedLeads.toLocaleString('en-BD'),
  },
  {
    id: 'converted',
    header: 'Converted',
    cell: (row) => row.convertedLeads.toLocaleString('en-BD'),
  },
  {
    id: 'conversion',
    header: 'Conv. Rate',
    cell: (row) => <TableProgressCell value={row.conversionRate} />,
  },
  {
    id: 'cost',
    header: 'Cost',
    cell: (row) => formatCurrency(row.cost, { compact: true }),
  },
  {
    id: 'cpl',
    header: 'CPL',
    cell: (row) => formatCurrency(row.costPerLead),
  },
  {
    id: 'roi',
    header: 'ROI',
    cell: (row) => (
      <span className="font-semibold text-primary">{row.roi}%</span>
    ),
  },
];

type CampaignPerformanceTableProps = {
  rows: CampaignPerformanceRow[];
  className?: string;
};

export function CampaignPerformanceTable({
  rows,
  className,
}: CampaignPerformanceTableProps) {
  return (
    <DataTable
      columns={CAMPAIGN_COLUMNS}
      rows={rows}
      getRowId={(row) => row.id}
      className={className}
    />
  );
}
