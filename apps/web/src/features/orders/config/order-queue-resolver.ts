import type { BulkActionId } from '@laam/types';

import {
  DEFAULT_ORDER_BULK_ACTIONS,
  resolveConfiguredBulkActions,
} from '@/features/orders/config/bulk-actions-registry';
import {
  getQueueChildStatusSlugs,
  getQueuePageBySlug,
  getStatusConfigBySlug,
  MOCK_ORDER_QUEUE_PAGES,
} from '@/features/orders/data/mock-status-config';
import { getOrderStatuses } from '@/features/orders/data/order-status-store';
import { STATUS_QUEUE_FOLDER_SLUGS } from '@/features/orders/lib/order-status-hierarchy';

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
  bulkActions: [...DEFAULT_ORDER_BULK_ACTIONS],
};

function bulkActionsForStatusSlug(statusSlug: string | undefined): BulkActionId[] {
  if (!statusSlug) return [...DEFAULT_ORDER_BULK_ACTIONS];
  const statusConfig = getStatusConfigBySlug(statusSlug);
  return resolveConfiguredBulkActions(statusConfig?.bulkActions);
}

/** Tab strip parent: own nested tabs, or sibling strip under a status/queue parent. */
function resolveStatusTabParentSlug(
  statusSlug: string,
  parentSlug: string | undefined,
): string | undefined {
  if (parentSlug) {
    const siblings = getQueueChildStatusSlugs(parentSlug);
    if (siblings.includes(statusSlug) || siblings.length > 0) {
      if (siblings.includes(statusSlug)) return parentSlug;
    }
  }
  const ownChildren = getQueueChildStatusSlugs(statusSlug);
  return ownChildren.length > 0 ? statusSlug : undefined;
}

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
    if (page?.kind === 'list' && page.slug !== 'all' && page.slug !== 'more_statuses') {
      const childStatusSlugs = getQueueChildStatusSlugs(page.slug);
      const activeChild =
        statusParam ??
        (childStatusSlugs.length > 0
          ? (page.defaultChildSlug ?? childStatusSlugs[0])
          : page.defaultChildSlug);

      return {
        queueSlug: page.slug,
        kind: 'parent',
        title: page.title,
        description: page.description,
        href: page.href,
        statusFilter: activeChild,
        parentSlug: page.slug,
        childStatusSlugs: childStatusSlugs.length > 0 ? childStatusSlugs : undefined,
        defaultChildSlug: page.defaultChildSlug,
        bulkActions: bulkActionsForStatusSlug(activeChild),
        showGroupByStatus: false,
        showFilterPanel: DEFAULT_LIST_CONTEXT.showFilterPanel,
        showSalesSummary: DEFAULT_LIST_CONTEXT.showSalesSummary,
        followUpDue: page.followUpDue || page.slug === 'followups' ? true : undefined,
      };
    }
  }

  if (statusParam) {
    const statusConfig = getStatusConfigBySlug(statusParam);
    if (statusConfig) {
      const tabParentSlug = resolveStatusTabParentSlug(statusParam, statusConfig.parentSlug);
      const childStatusSlugs = tabParentSlug
        ? getQueueChildStatusSlugs(tabParentSlug)
        : [];
      const tabParentIsQueue =
        tabParentSlug != null && STATUS_QUEUE_FOLDER_SLUGS.has(tabParentSlug);
      const parentHref = tabParentIsQueue
        ? `/dashboard/orders/queues/${tabParentSlug}`
        : '/dashboard/orders';

      return {
        queueSlug: statusParam,
        kind: childStatusSlugs.length > 0 ? 'parent' : 'status',
        title: tabParentIsQueue
          ? (getQueuePageBySlug(tabParentSlug!)?.title ?? statusConfig.label)
          : tabParentSlug && tabParentSlug !== statusParam
            ? (getStatusConfigBySlug(tabParentSlug)?.label ?? statusConfig.label)
            : childStatusSlugs.length > 0
              ? statusConfig.label
              : `${statusConfig.label} Orders`,
        description: tabParentIsQueue
          ? (getQueuePageBySlug(tabParentSlug!)?.description ??
            `Orders in ${statusConfig.label} status.`)
          : `Orders in ${statusConfig.label} status.`,
        href: parentHref,
        statusFilter: statusConfig.slug,
        parentSlug: tabParentSlug,
        childStatusSlugs: childStatusSlugs.length > 0 ? childStatusSlugs : undefined,
        bulkActions: resolveConfiguredBulkActions(statusConfig.bulkActions),
        showGroupByStatus: false,
        showFilterPanel: DEFAULT_LIST_CONTEXT.showFilterPanel,
        showSalesSummary: DEFAULT_LIST_CONTEXT.showSalesSummary,
        followUpDue: tabParentSlug === 'followups' ? true : undefined,
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
