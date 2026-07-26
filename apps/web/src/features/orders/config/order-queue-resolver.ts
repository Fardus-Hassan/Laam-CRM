import type { BulkActionId } from '@laam/types';

import {
  getQueueChildStatusSlugs,
  getQueuePageBySlug,
  getStatusConfigBySlug,
  MOCK_ORDER_QUEUE_PAGES,
} from '@/features/orders/data/mock-status-config';
import { getOrderStatuses } from '@/features/orders/data/order-status-store';

export type OrderQueueContext = {
  queueSlug: string;
  kind: 'all' | 'status' | 'parent' | 'failed' | 'tool' | 'payments' | 'form' | 'more';
  title: string;
  description: string;
  href: string;
  /** Active status filter (undefined = all orders). */
  statusFilter?: string;
  /** Parent queue with nested tabs. */
  parentSlug?: string;
  childStatusSlugs?: string[];
  defaultChildSlug?: string;
  bulkActions: BulkActionId[];
  showGroupByStatus: boolean;
  showFilterPanel: boolean;
  showSalesSummary: boolean;
  followUpDue?: boolean;
};

const DEFAULT_LIST_CONTEXT: Pick<
  OrderQueueContext,
  'showFilterPanel' | 'showSalesSummary' | 'bulkActions'
> = {
  showFilterPanel: true,
  showSalesSummary: true,
  bulkActions: [
    'print_selected',
    'print_barcode',
    'print_info',
    'export',
    'send_sms',
    'set_followup',
    'transfer',
    'courier_unlink',
  ],
};

export function resolveOrderQueueFromPath(
  pathname: string,
  statusParam?: string,
  queueSlug?: string,
): OrderQueueContext {
  if (pathname.includes('/orders/failed')) {
    const page = getQueuePageBySlug('failed')!;
    return {
      queueSlug: 'failed',
      kind: 'failed',
      title: page.title,
      description: page.description,
      href: page.href,
      bulkActions: [],
      showGroupByStatus: false,
      showFilterPanel: false,
      showSalesSummary: false,
    };
  }

  if (pathname.includes('/orders/tools/bulk-print')) {
    const page = getQueuePageBySlug('bulk_print')!;
    return {
      queueSlug: 'bulk_print',
      kind: 'tool',
      title: page.title,
      description: page.description,
      href: page.href,
      bulkActions: [],
      showGroupByStatus: false,
      showFilterPanel: false,
      showSalesSummary: false,
    };
  }

  if (pathname.includes('/orders/tools/send-courier-barcode')) {
    const page = getQueuePageBySlug('send_courier_barcode')!;
    return {
      queueSlug: 'send_courier_barcode',
      kind: 'tool',
      title: page.title,
      description: page.description,
      href: page.href,
      bulkActions: [],
      showGroupByStatus: false,
      showFilterPanel: false,
      showSalesSummary: false,
    };
  }

  if (pathname.includes('/orders/payments')) {
    const page = getQueuePageBySlug('payments')!;
    return {
      queueSlug: 'payments',
      kind: 'payments',
      title: page.title,
      description: page.description,
      href: page.href,
      bulkActions: [],
      showGroupByStatus: false,
      showFilterPanel: false,
      showSalesSummary: false,
    };
  }

  if (pathname.includes('/orders/statuses')) {
    const allPage = getQueuePageBySlug('all')!;
    return {
      queueSlug: 'all',
      kind: 'all',
      title: allPage.title,
      description: allPage.description,
      href: allPage.href,
      bulkActions: DEFAULT_LIST_CONTEXT.bulkActions,
      showGroupByStatus: true,
      showFilterPanel: DEFAULT_LIST_CONTEXT.showFilterPanel,
      showSalesSummary: DEFAULT_LIST_CONTEXT.showSalesSummary,
    };
  }

  if (queueSlug) {
    const page = getQueuePageBySlug(queueSlug);
    if (page?.slug === 'followups') {
      return {
        queueSlug: 'followups',
        kind: 'parent',
        title: page.title,
        description: page.description,
        href: page.href,
        bulkActions: DEFAULT_LIST_CONTEXT.bulkActions,
        showGroupByStatus: false,
        showFilterPanel: DEFAULT_LIST_CONTEXT.showFilterPanel,
        showSalesSummary: DEFAULT_LIST_CONTEXT.showSalesSummary,
        followUpDue: true,
      };
    }
    const childStatusSlugs = page ? getQueueChildStatusSlugs(page.slug) : [];
    if (childStatusSlugs.length > 0 && page) {
      const activeChild =
        statusParam ??
        page.defaultChildSlug ??
        childStatusSlugs[0];
      const statusConfig = getStatusConfigBySlug(activeChild);

      return {
        queueSlug: page.slug,
        kind: 'parent',
        title: page.title,
        description: page.description,
        href: page.href,
        statusFilter: activeChild,
        parentSlug: page.slug,
        childStatusSlugs,
        defaultChildSlug: page.defaultChildSlug,
        bulkActions: statusConfig?.bulkActions ?? DEFAULT_LIST_CONTEXT.bulkActions,
        showGroupByStatus: false,
        showFilterPanel: DEFAULT_LIST_CONTEXT.showFilterPanel,
        showSalesSummary: DEFAULT_LIST_CONTEXT.showSalesSummary,
      };
    }
  }

  if (statusParam) {
    const statusConfig = getStatusConfigBySlug(statusParam);
    if (statusConfig) {
      return {
        queueSlug: statusParam,
        kind: 'status',
        title: `${statusConfig.label} Orders`,
        description: `Orders in ${statusConfig.label} status.`,
        href: `/dashboard/orders?status=${statusParam}`,
        statusFilter: statusConfig.slug,
        bulkActions: statusConfig.bulkActions,
        showGroupByStatus: false,
        showFilterPanel: DEFAULT_LIST_CONTEXT.showFilterPanel,
        showSalesSummary: DEFAULT_LIST_CONTEXT.showSalesSummary,
      };
    }
  }

  const allPage = getQueuePageBySlug('all')!;
  return {
    queueSlug: 'all',
    kind: 'all',
    title: allPage.title,
    description: allPage.description,
    href: allPage.href,
    bulkActions: DEFAULT_LIST_CONTEXT.bulkActions,
    showGroupByStatus: true,
    showFilterPanel: DEFAULT_LIST_CONTEXT.showFilterPanel,
    showSalesSummary: DEFAULT_LIST_CONTEXT.showSalesSummary,
  };
}

export function getAllStatusConfigs() {
  return getOrderStatuses();
}

export function getAllQueuePages() {
  return MOCK_ORDER_QUEUE_PAGES;
}
