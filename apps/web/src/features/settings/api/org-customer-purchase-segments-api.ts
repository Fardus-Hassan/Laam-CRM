import type {
  OrgCustomerPurchaseSegment,
  UpsertOrgCustomerPurchaseSegmentPayload,
} from '@laam/types';

import { MOCK_PURCHASE_SEGMENTS } from '@/features/customers/data/mock-purchase-segments';

export type OrgCustomerPurchaseSegmentsApi = {
  list: () => Promise<OrgCustomerPurchaseSegment[]>;
  upsert: (
    payload: UpsertOrgCustomerPurchaseSegmentPayload,
  ) => Promise<OrgCustomerPurchaseSegment>;
  setActive: (id: string, isActive: boolean) => Promise<OrgCustomerPurchaseSegment>;
  remove: (id: string) => Promise<void>;
};

function createMockApi(): OrgCustomerPurchaseSegmentsApi {
  let rows = [...MOCK_PURCHASE_SEGMENTS];
  return {
    async list() {
      return rows.filter((row) => row.isActive || true).sort((a, b) => a.sortOrder - b.sortOrder);
    },
    async upsert(payload) {
      const slug = (payload.slug?.trim() || payload.label)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      if (payload.id) {
        rows = rows.map((row) =>
          row.id === payload.id
            ? {
                ...row,
                label: payload.label,
                slug: row.isSystem ? row.slug : slug,
                op: payload.op ?? row.op,
                threshold: payload.threshold,
                metric: payload.metric ?? row.metric,
                displayMode: payload.displayMode ?? row.displayMode,
                sortOrder: payload.sortOrder ?? row.sortOrder,
                showInNav:
                  payload.showInNav ??
                  (payload.displayMode
                    ? payload.displayMode === 'sidebar' ||
                      payload.displayMode === 'sidebar_and_tab'
                    : row.showInNav),
                isActive: payload.isActive ?? row.isActive,
              }
            : row,
        );
        return rows.find((row) => row.id === payload.id)!;
      }
      const displayMode = payload.displayMode ?? 'sidebar_and_tab';
      const created: OrgCustomerPurchaseSegment = {
        id: `purchase-${slug}-${Date.now()}`,
        slug,
        label: payload.label,
        op: payload.op ?? 'eq',
        threshold: payload.threshold,
        metric: payload.metric ?? 'deliveredCount',
        displayMode,
        sortOrder: payload.sortOrder ?? 100,
        showInNav:
          payload.showInNav ??
          (displayMode === 'sidebar' || displayMode === 'sidebar_and_tab'),
        isActive: payload.isActive ?? true,
        isSystem: false,
      };
      rows = [...rows, created];
      return created;
    },
    async setActive(id, isActive) {
      rows = rows.map((row) => (row.id === id ? { ...row, isActive } : row));
      return rows.find((row) => row.id === id)!;
    },
    async remove(id) {
      const row = rows.find((item) => item.id === id);
      if (row?.isSystem) throw new Error('System purchase segments cannot be deleted');
      rows = rows.filter((item) => item.id !== id);
    },
  };
}

function createHttpApi(): OrgCustomerPurchaseSegmentsApi {
  return {
    async list() {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<OrgCustomerPurchaseSegment[]>(
        '/crm/settings/customer-purchase-segments',
      );
    },
    async upsert(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<OrgCustomerPurchaseSegment>(
        '/crm/settings/customer-purchase-segments',
        { method: 'POST', body: JSON.stringify(payload) },
      );
    },
    async setActive(id, isActive) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<OrgCustomerPurchaseSegment>(
        `/crm/settings/customer-purchase-segments/${id}/active`,
        { method: 'PATCH', body: JSON.stringify({ isActive }) },
      );
    },
    async remove(id) {
      const { apiRequest } = await import('@/lib/api/client');
      await apiRequest(`/crm/settings/customer-purchase-segments/${id}`, {
        method: 'DELETE',
      });
    },
  };
}

const useApi = process.env.NEXT_PUBLIC_USE_API === 'true';

export const orgCustomerPurchaseSegmentsApi: OrgCustomerPurchaseSegmentsApi = useApi
  ? createHttpApi()
  : createMockApi();
