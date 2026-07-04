import type {
  EmployeeMetricRow,
  LeadSourceRow,
  LoginHistoryRow,
  MarketingReport,
  RankedProductRow,
  RepeatCustomerRow,
  ReportPeriod,
  ReportSummary,
  TeamTargetRow,
  UpsellRow,
} from '@laam/types';
import type { ChartPoint, DualAxisPoint } from '@laam/types';

const PRODUCTS = [
  { id: 'p1', name: 'Modhu 500g', sku: 'MDH-500' },
  { id: 'p2', name: 'Khejur 1kg', sku: 'KHJ-1K' },
  { id: 'p3', name: 'Modhu-Khejur Combo', sku: 'COMBO-01' },
  { id: 'p4', name: 'Ramadan Gift Box', sku: 'RAM-GFT' },
  { id: 'p5', name: 'Organic Honey 250g', sku: 'HNY-250' },
  { id: 'p6', name: 'Dates Premium 500g', sku: 'DAT-500' },
  { id: 'p7', name: 'Modhu 1kg Family Pack', sku: 'MDH-1K' },
  { id: 'p8', name: 'Khejur Paste 400g', sku: 'KHJ-PST' },
];

const AGENTS = [
  { id: 'a1', name: 'Sakib Ahmed', role: 'Sales Rep' },
  { id: 'a2', name: 'Mitu Rahman', role: 'Team Leader' },
  { id: 'a3', name: 'Rahim Uddin', role: 'Sales Rep' },
  { id: 'a4', name: 'Nadia Islam', role: 'Sales Rep' },
  { id: 'a5', name: 'Imran Hossain', role: 'Sales Manager' },
];

function periodMultiplier(period: ReportPeriod): number {
  switch (period) {
    case '7d': return 0.25;
    case '30d': return 1;
    case '90d': return 2.8;
    case 'ytd': return 6;
    default: return 1;
  }
}

function genTrend(days: number, base: number, variance: number): ChartPoint[] {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return labels.slice(0, Math.min(days, 7)).map((label, i) => ({
    label,
    value: Math.round(base + Math.sin(i) * variance + i * (base * 0.05)),
  }));
}

function genDualTrend(): DualAxisPoint[] {
  return ['W1', 'W2', 'W3', 'W4'].map((label, i) => ({
    label,
    bar: 12000 + i * 2800 + Math.round(Math.random() * 2000),
    line: 45 + i * 8 + Math.round(Math.random() * 10),
  }));
}

export function getReportSummary(period: ReportPeriod): ReportSummary {
  const m = periodMultiplier(period);
  return {
    period,
    kpis: [
      { id: 'orders', label: 'Total orders', value: String(Math.round(482 * m)), change: 12.4, hint: 'vs previous period' },
      { id: 'revenue', label: 'Revenue', value: `৳${Math.round(1245000 * m).toLocaleString()}`, change: 8.2 },
      { id: 'aov', label: 'Avg order value', value: `৳${Math.round(2580 * (1 + m * 0.02)).toLocaleString()}`, change: -2.1 },
      { id: 'repeat', label: 'Repeat rate', value: '34%', change: 5.6 },
      { id: 'conversion', label: 'Lead conversion', value: '28%', change: 3.2 },
      { id: 'returns', label: 'Return rate', value: '4.2%', change: -0.8 },
    ],
    revenueTrend: genTrend(7, 180000 * m, 25000),
    ordersTrend: genTrend(7, 68 * m, 12),
    topProducts: PRODUCTS.slice(0, 5).map((p, i) => ({
      id: p.id,
      name: p.name,
      units: Math.round((120 - i * 18) * m),
      revenueBdt: Math.round((85000 - i * 12000) * m),
    })),
    recentHighlights: [
      { id: 'h1', label: 'Best day', value: 'Friday — ৳42,000' },
      { id: 'h2', label: 'Top agent', value: 'Sakib Ahmed — 89 orders' },
      { id: 'h3', label: 'Top product', value: 'Modhu 500g — 142 units' },
    ],
  };
}

export function getSalesKpis(period: ReportPeriod) {
  const m = periodMultiplier(period);
  return {
    kpis: [
      { id: 'orders', label: 'Orders', value: String(Math.round(482 * m)) },
      { id: 'confirmed', label: 'Confirmed', value: String(Math.round(421 * m)) },
      { id: 'delivered', label: 'Delivered', value: String(Math.round(398 * m)) },
      { id: 'cancelled', label: 'Cancelled', value: String(Math.round(24 * m)) },
      { id: 'aov', label: 'AOV', value: `৳2,580` },
      { id: 'cod', label: 'COD %', value: '62%' },
    ],
    trend: genTrend(7, 68 * m, 10),
  };
}

export function getRevenueKpis(period: ReportPeriod) {
  const m = periodMultiplier(period);
  return {
    kpis: [
      { id: 'total', label: 'Total revenue', value: `৳${Math.round(1245000 * m).toLocaleString()}` },
      { id: 'cod', label: 'COD collected', value: `৳${Math.round(772000 * m).toLocaleString()}` },
      { id: 'prepaid', label: 'Prepaid (bKash)', value: `৳${Math.round(473000 * m).toLocaleString()}` },
      { id: 'pending', label: 'Pending collection', value: `৳${Math.round(42000 * m).toLocaleString()}` },
    ],
    trend: genTrend(7, 180000 * m, 22000),
    breakdown: [
      { label: 'Modhu products', value: Math.round(520000 * m) },
      { label: 'Khejur products', value: Math.round(380000 * m) },
      { label: 'Combos & gifts', value: Math.round(245000 * m) },
      { label: 'Other', value: Math.round(100000 * m) },
    ],
  };
}

export function getRepeatCustomers(period: ReportPeriod): RepeatCustomerRow[] {
  const m = periodMultiplier(period);
  return [
    { id: 'c1', name: 'Fatima Begum', mobile: '01712345678', orderCount: Math.round(8 * m), totalSpentBdt: Math.round(22400 * m), lastOrderDate: '2026-07-01', avgDaysBetween: 12 },
    { id: 'c2', name: 'Karim Uddin', mobile: '01898765432', orderCount: Math.round(6 * m), totalSpentBdt: Math.round(18600 * m), lastOrderDate: '2026-06-28', avgDaysBetween: 18 },
    { id: 'c3', name: 'Ayesha Khan', mobile: '01955667788', orderCount: Math.round(5 * m), totalSpentBdt: Math.round(15200 * m), lastOrderDate: '2026-06-30', avgDaysBetween: 22 },
    { id: 'c4', name: 'Rashid Ahmed', mobile: '01611223344', orderCount: Math.round(4 * m), totalSpentBdt: Math.round(12800 * m), lastOrderDate: '2026-06-25', avgDaysBetween: 28 },
    { id: 'c5', name: 'Nusrat Jahan', mobile: '01533445566', orderCount: Math.round(4 * m), totalSpentBdt: Math.round(11500 * m), lastOrderDate: '2026-06-29', avgDaysBetween: 25 },
  ];
}

export function getRankedProducts(type: string, period: ReportPeriod): RankedProductRow[] {
  const m = periodMultiplier(period);
  const base = PRODUCTS.map((p, i) => ({
    rank: i + 1,
    id: p.id,
    name: p.name,
    sku: p.sku,
    value: 0,
    secondaryValue: 0,
    unit: 'units',
  }));

  switch (type) {
    case 'top-return':
      return base.map((r, i) => ({ ...r, value: Math.round((28 - i * 3) * m), secondaryValue: Math.round(4.5 + i * 0.8), unit: 'returns' }));
    case 'top-purchased':
      return base.map((r, i) => ({ ...r, value: Math.round((200 - i * 22) * m), unit: 'purchased' }));
    case 'low-stock':
      return base.map((r, i) => ({ ...r, value: Math.round(8 + i * 5), unit: 'in stock' }));
    case 'high-stock':
      return base.map((r, i) => ({ ...r, value: Math.round(450 - i * 40), unit: 'in stock' }));
  }

  return base.map((r, i) => ({
    ...r,
    value: Math.round((142 - i * 18) * m),
    secondaryValue: Math.round((98000 - i * 14000) * m),
  }));
}

export function getProductDailyTrend(period: ReportPeriod): ChartPoint[] {
  const m = periodMultiplier(period);
  return ['Jun 26', 'Jun 27', 'Jun 28', 'Jun 29', 'Jun 30', 'Jul 1', 'Jul 2'].map((label, i) => ({
    label,
    value: Math.round((85 + i * 12 + Math.sin(i) * 8) * m),
  }));
}

export function getEmployeeMetrics(type: string, period: ReportPeriod): EmployeeMetricRow[] {
  const m = periodMultiplier(period);
  return AGENTS.map((a, i) => ({
    id: a.id,
    name: a.name,
    role: a.role,
    orders: Math.round((89 - i * 15) * m),
    revenueBdt: Math.round((228000 - i * 42000) * m),
    conversionRate: Math.round(32 - i * 3),
    avgOrderValue: Math.round(2560 + i * 80),
    activities: type === 'employee-activity' ? Math.round((156 - i * 28) * m) : undefined,
  }));
}

export function getTeamTargets(period: ReportPeriod): TeamTargetRow[] {
  const m = periodMultiplier(period);
  return AGENTS.slice(0, 4).map((a, i) => {
    const targetOrders = Math.round(100 - i * 10);
    const actualOrders = Math.round((89 - i * 15) * m);
    const targetRevenue = Math.round(250000 - i * 30000);
    const actualRevenue = Math.round((228000 - i * 42000) * m);
    return {
      id: a.id,
      name: a.name,
      targetOrders,
      actualOrders,
      targetRevenueBdt: targetRevenue,
      actualRevenueBdt: actualRevenue,
      progressPercent: Math.min(100, Math.round((actualOrders / targetOrders) * 100)),
    };
  });
}

export function getMarketingReport(period: ReportPeriod): MarketingReport {
  const m = periodMultiplier(period);
  return {
    spendBdt: Math.round(85000 * m),
    revenueBdt: Math.round(420000 * m),
    roas: 4.9,
    leads: Math.round(312 * m),
    orders: Math.round(186 * m),
    trend: genDualTrend(),
    campaigns: [
      { id: 'cp1', name: 'Ramadan Modhu Boost', spendBdt: Math.round(32000 * m), revenueBdt: Math.round(168000 * m), roas: 5.25, orders: Math.round(72 * m) },
      { id: 'cp2', name: 'Khejur Combo Retarget', spendBdt: Math.round(28000 * m), revenueBdt: Math.round(124000 * m), roas: 4.4, orders: Math.round(58 * m) },
      { id: 'cp3', name: 'Lookalike Dhaka', spendBdt: Math.round(25000 * m), revenueBdt: Math.round(128000 * m), roas: 5.1, orders: Math.round(56 * m) },
    ],
  };
}

export function getLeadSources(period: ReportPeriod): LeadSourceRow[] {
  const m = periodMultiplier(period);
  return [
    { source: 'Facebook Ads', leads: Math.round(186 * m), orders: Math.round(98 * m), conversionRate: 52.7, revenueBdt: Math.round(252000 * m) },
    { source: 'Phone Call', leads: Math.round(124 * m), orders: Math.round(72 * m), conversionRate: 58.1, revenueBdt: Math.round(185000 * m) },
    { source: 'WhatsApp', leads: Math.round(98 * m), orders: Math.round(54 * m), conversionRate: 55.1, revenueBdt: Math.round(138000 * m) },
    { source: 'Walk-in', leads: Math.round(42 * m), orders: Math.round(38 * m), conversionRate: 90.5, revenueBdt: Math.round(98000 * m) },
    { source: 'Website', leads: Math.round(56 * m), orders: Math.round(28 * m), conversionRate: 50.0, revenueBdt: Math.round(72000 * m) },
  ];
}

export function getUpsales(period: ReportPeriod): UpsellRow[] {
  const m = periodMultiplier(period);
  return [
    { id: 'u1', baseProduct: 'Modhu 500g', upsellProduct: 'Modhu-Khejur Combo', count: Math.round(48 * m), revenueBdt: Math.round(57600 * m), rate: 18.2 },
    { id: 'u2', baseProduct: 'Khejur 1kg', upsellProduct: 'Ramadan Gift Box', count: Math.round(32 * m), revenueBdt: Math.round(48000 * m), rate: 14.5 },
    { id: 'u3', baseProduct: 'Modhu 500g', upsellProduct: 'Modhu 1kg Family Pack', count: Math.round(28 * m), revenueBdt: Math.round(39200 * m), rate: 10.6 },
  ];
}

export function getLoginHistory(): LoginHistoryRow[] {
  return [
    { id: 'l1', userName: 'Laam Org Admin', email: 'admin@laam.com', ip: '103.148.72.10', device: 'Chrome / Windows', loggedInAt: '2026-07-02T09:00:00Z', status: 'success' },
    { id: 'l2', userName: 'Sakib Ahmed', email: 'sakib@laamcrm.com', ip: '27.147.130.88', device: 'Chrome / Android', loggedInAt: '2026-07-02T08:30:00Z', status: 'success' },
    { id: 'l3', userName: 'Unknown', email: 'hacker@test.com', ip: '45.248.60.12', device: 'Firefox / Linux', loggedInAt: '2026-07-01T22:15:00Z', status: 'failed' },
    { id: 'l4', userName: 'Mitu Rahman', email: 'mitu@laamcrm.com', ip: '103.148.72.44', device: 'Safari / iPhone', loggedInAt: '2026-07-01T17:00:00Z', status: 'success' },
    { id: 'l5', userName: 'Imran Hossain', email: 'imran@laamcrm.com', ip: '103.148.72.10', device: 'Chrome / Windows', loggedInAt: '2026-06-30T14:00:00Z', status: 'success' },
  ];
}

export function getPlatformReport() {
  return {
    kpis: [
      { id: 'tenants', label: 'Active tenants', value: '47' },
      { id: 'mrr', label: 'MRR', value: '৳2,34,000' },
      { id: 'orders', label: 'Platform orders (30d)', value: '18,420' },
      { id: 'churn', label: 'Churn rate', value: '2.1%' },
    ],
    trend: genTrend(7, 18000, 3000),
  };
}
