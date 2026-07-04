import type {
  EmployeeMetricRow,
  LeadSourceRow,
  LoginHistoryRow,
  MarketingReport,
  RankedProductRow,
  RepeatCustomerRow,
  ReportPeriod,
  ReportSummary,
  ReportViewId,
  TeamTargetRow,
  UpsellRow,
} from '@laam/types';
import type { ChartPoint } from '@laam/types';

import {
  getEmployeeMetrics,
  getLeadSources,
  getLoginHistory,
  getMarketingReport,
  getPlatformReport,
  getProductDailyTrend,
  getRankedProducts,
  getRepeatCustomers,
  getReportSummary,
  getRevenueKpis,
  getSalesKpis,
  getTeamTargets,
  getUpsales,
} from '@/features/reports/data/mock-reports';
import { apiRequest } from '@/lib/api/client';

export type ReportsApi = {
  getSummary: (period: ReportPeriod) => Promise<ReportSummary>;
  getSales: (period: ReportPeriod) => Promise<{ kpis: ReportSummary['kpis']; trend: ChartPoint[] }>;
  getRevenue: (period: ReportPeriod) => Promise<{ kpis: ReportSummary['kpis']; trend: ChartPoint[]; breakdown: ChartPoint[] }>;
  getRepeatCustomers: (period: ReportPeriod) => Promise<RepeatCustomerRow[]>;
  getRankedProducts: (type: ReportViewId, period: ReportPeriod) => Promise<RankedProductRow[]>;
  getProductDaily: (period: ReportPeriod) => Promise<ChartPoint[]>;
  getEmployees: (type: ReportViewId, period: ReportPeriod) => Promise<EmployeeMetricRow[]>;
  getTeamTargets: (period: ReportPeriod) => Promise<TeamTargetRow[]>;
  getMarketing: (period: ReportPeriod) => Promise<MarketingReport>;
  getLeadSources: (period: ReportPeriod) => Promise<LeadSourceRow[]>;
  getUpsales: (period: ReportPeriod) => Promise<UpsellRow[]>;
  getLoginHistory: () => Promise<LoginHistoryRow[]>;
  getPlatform: () => Promise<{ kpis: ReportSummary['kpis']; trend: ChartPoint[] }>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function qs(period: ReportPeriod) {
  return `?period=${period}`;
}

export function createMockReportsApi(): ReportsApi {
  return {
    async getSummary(period) {
      await delay(100);
      return getReportSummary(period);
    },
    async getSales(period) {
      await delay(100);
      return getSalesKpis(period);
    },
    async getRevenue(period) {
      await delay(100);
      return getRevenueKpis(period);
    },
    async getRepeatCustomers(period) {
      await delay(80);
      return getRepeatCustomers(period);
    },
    async getRankedProducts(type, period) {
      await delay(80);
      return getRankedProducts(type, period);
    },
    async getProductDaily(period) {
      await delay(80);
      return getProductDailyTrend(period);
    },
    async getEmployees(type, period) {
      await delay(80);
      return getEmployeeMetrics(type, period);
    },
    async getTeamTargets(period) {
      await delay(80);
      return getTeamTargets(period);
    },
    async getMarketing(period) {
      await delay(100);
      return getMarketingReport(period);
    },
    async getLeadSources(period) {
      await delay(80);
      return getLeadSources(period);
    },
    async getUpsales(period) {
      await delay(80);
      return getUpsales(period);
    },
    async getLoginHistory() {
      await delay(80);
      return getLoginHistory();
    },
    async getPlatform() {
      await delay(100);
      return getPlatformReport();
    },
  };
}

export function createHttpReportsApi(): ReportsApi {
  const base = '/crm/reports';
  return {
    getSummary: (period) => apiRequest(`${base}/summary${qs(period)}`),
    getSales: (period) => apiRequest(`${base}/sales${qs(period)}`),
    getRevenue: (period) => apiRequest(`${base}/revenue${qs(period)}`),
    getRepeatCustomers: (period) => apiRequest(`${base}/repeat-customers${qs(period)}`),
    getRankedProducts: (type, period) => apiRequest(`${base}/products/${type}${qs(period)}`),
    getProductDaily: (period) => apiRequest(`${base}/product-daily${qs(period)}`),
    getEmployees: (type, period) => apiRequest(`${base}/employees/${type}${qs(period)}`),
    getTeamTargets: (period) => apiRequest(`${base}/team-targets${qs(period)}`),
    getMarketing: (period) => apiRequest(`${base}/marketing${qs(period)}`),
    getLeadSources: (period) => apiRequest(`${base}/sources${qs(period)}`),
    getUpsales: (period) => apiRequest(`${base}/upsales${qs(period)}`),
    getLoginHistory: () => apiRequest(`${base}/login-history`),
    getPlatform: () => apiRequest(`${base}/platform`),
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const reportsApi = useHttpApi ? createHttpReportsApi() : createMockReportsApi();
