'use client';

import Link from 'next/link';
import type { ContactListItem } from '@laam/types';
import { Building2, Eye, MoreHorizontal, Phone } from 'lucide-react';

import { DataTable, type DataTableColumn } from '@/components/dashboard/data-table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CONTACT_SOURCE_LABELS } from '@/features/contacts/config/contact-filters';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

const COLUMNS: DataTableColumn<ContactListItem>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: (row) => (
      <Link href={`/dashboard/contacts/${row.id}`} className="font-medium text-primary hover:underline">
        {row.name}
      </Link>
    ),
  },
  {
    id: 'phone',
    header: 'Phone',
    cell: (row) => row.phone,
  },
  {
    id: 'email',
    header: 'Email',
    cell: (row) => row.email ?? '—',
  },
  {
    id: 'company',
    header: 'Company',
    cell: (row) => row.companyName ?? '—',
  },
  {
    id: 'title',
    header: 'Title',
    cell: (row) => row.jobTitle ?? '—',
  },
  {
    id: 'source',
    header: 'Source',
    cell: (row) => CONTACT_SOURCE_LABELS[row.source],
  },
  {
    id: 'agent',
    header: 'Agent',
    cell: (row) => row.assignedAgentName ?? '—',
  },
  {
    id: 'lastContact',
    header: 'Last contact',
    cell: (row) => (row.lastContactAt ? formatDate(row.lastContactAt) : '—'),
  },
  {
    id: 'actions',
    header: '',
    className: 'w-12',
    cell: (row) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="size-8" aria-label="Contact actions">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/contacts/${row.id}`}>
              <Eye className="size-4" />
              View details
            </Link>
          </DropdownMenuItem>
          {row.companyName ? (
            <DropdownMenuItem>
              <Building2 className="size-4" />
              View company
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem>
            <Phone className="size-4" />
            Call
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

export function ContactsTable({ rows }: { rows: ContactListItem[] }) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={rows}
      getRowId={(row) => row.id}
      emptyMessage="No contacts found."
      className="min-w-[1000px]"
    />
  );
}
