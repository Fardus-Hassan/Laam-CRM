import type { OrgCustomerStatus, UpsertOrgCustomerStatusPayload } from '@laam/types';

import type { OrgCustomerStatusesApi } from '@/features/settings/api/org-customer-statuses-api';

let store: OrgCustomerStatus[] = [
  {
    id: 'mock-none',
    slug: 'none',
    label: 'No status',
    sortOrder: 0,
    isActive: true,
    isSystem: true,
  },
];

export function createMockOrgCustomerStatusesApi(): OrgCustomerStatusesApi {
  return {
    async list() {
      return [...store].sort((a, b) => a.sortOrder - b.sortOrder);
    },
    async upsert(payload: UpsertOrgCustomerStatusPayload) {
      const slug =
        (payload.slug?.trim() || payload.label)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '') || 'status';
      if (payload.id) {
        store = store.map((row) =>
          row.id === payload.id
            ? {
                ...row,
                label: payload.label.trim(),
                slug: row.isSystem ? row.slug : slug,
                color: payload.color,
                sortOrder: payload.sortOrder ?? row.sortOrder,
                isActive: payload.isActive ?? row.isActive,
              }
            : row,
        );
        return store.find((r) => r.id === payload.id)!;
      }
      const created: OrgCustomerStatus = {
        id: `mock-${Date.now()}`,
        slug,
        label: payload.label.trim(),
        color: payload.color,
        sortOrder: payload.sortOrder ?? store.length,
        isActive: payload.isActive ?? true,
        isSystem: false,
      };
      store = [...store, created];
      return created;
    },
    async setActive(id, isActive) {
      store = store.map((row) => (row.id === id ? { ...row, isActive } : row));
      return store.find((r) => r.id === id)!;
    },
    async remove(id) {
      const row = store.find((r) => r.id === id);
      if (row?.isSystem) throw new Error('System statuses cannot be deleted');
      store = store.filter((r) => r.id !== id);
    },
  };
}
