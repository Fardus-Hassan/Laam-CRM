import type { CustomerCompareOp, CustomerListQuery } from '@laam/types';

function num(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function bool(value: string | undefined): boolean | undefined {
  if (value === undefined || value === '') return undefined;
  return value === 'true' || value === '1';
}

export type CustomerListQueryRaw = {
  segment?: string;
  status?: string;
  search?: string;
  district?: string;
  employee?: string;
  product?: string;
  productExclude?: string;
  createdFrom?: string;
  createdTo?: string;
  lastOrderFrom?: string;
  lastOrderTo?: string;
  noOrderFrom?: string;
  noOrderTo?: string;
  followupFrom?: string;
  followupTo?: string;
  followupStatus?: string;
  deliveredFrom?: string;
  deliveredTo?: string;
  orderCount?: string;
  orderCountOp?: string;
  deliveredCount?: string;
  deliveredCountOp?: string;
  orderStatuses?: string;
  orderStatusesExclude?: string;
  orderSources?: string;
  orderSourcesExclude?: string;
  customerTag?: string;
  amountMin?: string;
  amountMax?: string;
  courierScoreMin?: string;
  page?: string;
  pageSize?: string;
};

export function parseCustomerListQuery(raw: CustomerListQueryRaw): CustomerListQuery {
  const followupStatus =
    raw.followupStatus === 'pending' ||
    raw.followupStatus === 'none' ||
    raw.followupStatus === 'overdue'
      ? raw.followupStatus
      : undefined;

  return {
    segment: raw.segment,
    status: raw.status,
    search: raw.search,
    district: raw.district,
    employee: raw.employee,
    product: raw.product,
    productExclude: bool(raw.productExclude),
    createdFrom: raw.createdFrom,
    createdTo: raw.createdTo,
    lastOrderFrom: raw.lastOrderFrom,
    lastOrderTo: raw.lastOrderTo,
    noOrderFrom: raw.noOrderFrom,
    noOrderTo: raw.noOrderTo,
    followupFrom: raw.followupFrom,
    followupTo: raw.followupTo,
    followupStatus,
    deliveredFrom: raw.deliveredFrom,
    deliveredTo: raw.deliveredTo,
    orderCount: num(raw.orderCount),
    orderCountOp: raw.orderCountOp as CustomerCompareOp | undefined,
    deliveredCount: num(raw.deliveredCount),
    deliveredCountOp: raw.deliveredCountOp as CustomerCompareOp | undefined,
    orderStatuses: raw.orderStatuses,
    orderStatusesExclude: bool(raw.orderStatusesExclude),
    orderSources: raw.orderSources,
    orderSourcesExclude: bool(raw.orderSourcesExclude),
    customerTag: raw.customerTag,
    amountMin: num(raw.amountMin),
    amountMax: num(raw.amountMax),
    courierScoreMin: num(raw.courierScoreMin),
    page: Number(raw.page) || 1,
    pageSize: Number(raw.pageSize) || 20,
  };
}

export function splitCsv(value?: string): string[] {
  if (!value?.trim()) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
