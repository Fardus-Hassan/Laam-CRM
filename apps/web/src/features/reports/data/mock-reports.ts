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
  { id: 'p1', name: 'Honey + Kalojira Mix 500g', sku: 'HKM-500' },
  { id: 'p2', name: 'Honey + Kalojira Mix 1kg', sku: 'HKM-1K' },
  { id: 'p3', name: 'Pink Salt 500g', sku: 'PNK-500' },
  { id: 'p4', name: 'Beetroot Powder 250g', sku: 'BTR-250' },
  { id: 'p5', name: 'Pure Honey 500g', sku: 'MDH-500' },
  { id: 'p6', name: 'Kalojira Powder 250g', sku: 'KLJ-250' },
  { id: 'p7', name: 'Moringa Powder 100g', sku: 'MRG-100' },
  { id: 'p8', name: 'Wellness Gift Box', sku: 'WLS-GFT' },
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
      { id: 'orders', label: 'Total orders', value: String(Math.round(4820 * m)), change: 12.4, hint: 'vs previous period' },
      { id: 'revenue', label: 'Revenue (COD)', value: `৳${Math.round(4280000 * m).toLocaleString()}`, change: 8.2 },
      { id: 'hero', label: 'Hero mix share', value: '90%', change: 1.2, hint: 'Honey + Kalojira Mix' },
      { id: 'attach', label: 'Upsell attach rate', value: '18%', change: 3.4, hint: 'Mix + add-on products' },
      { id: 'confirm', label: 'Call confirm rate', value: '78%', change: 2.1 },
      { id: 'conversion', label: 'Lead conversion', value: '28%', change: 3.2 },
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
      { id: 'h1', label: 'Best day', value: 'Friday — ৳4,20,000' },
      { id: 'h2', label: 'Top agent', value: 'Sakib Ahmed — 189 confirms' },
      { id: 'h3', label: 'Top product', value: 'Honey + Kalojira Mix 500g — 1,420 units' },
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
      { id: 'cod', label: 'COD %', value: '92%' },
      { id: 'attach', label: 'Upsell attach', value: '18%' },
      { id: 'confirms', label: 'Call confirms', value: String(Math.round(380 * m)) },
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
      { id: 'cp1', name: 'Honey+Kalojira Mix Boost', spendBdt: Math.round(85000 * m), revenueBdt: Math.round(920000 * m), roas: 10.8, orders: Math.round(820 * m) },
      { id: 'cp2', name: 'Knock Day Landing', spendBdt: Math.round(120000 * m), revenueBdt: Math.round(1450000 * m), roas: 12.1, orders: Math.round(1280 * m) },
      { id: 'cp3', name: 'Lookalike Dhaka', spendBdt: Math.round(45000 * m), revenueBdt: Math.round(380000 * m), roas: 8.4, orders: Math.round(340 * m) },
    ],
  };
}

export function getLeadSources(period: ReportPeriod): LeadSourceRow[] {
  const m = periodMultiplier(period);
  return [
    { source: 'Facebook Ad', leads: Math.round(1860 * m), orders: Math.round(980 * m), conversionRate: 52.7, revenueBdt: Math.round(1252000 * m) },
    { source: 'Facebook Campaign', leads: Math.round(1240 * m), orders: Math.round(720 * m), conversionRate: 58.1, revenueBdt: Math.round(985000 * m) },
    { source: 'Landing Page', leads: Math.round(980 * m), orders: Math.round(540 * m), conversionRate: 55.1, revenueBdt: Math.round(738000 * m) },
    { source: 'Website', leads: Math.round(560 * m), orders: Math.round(280 * m), conversionRate: 50.0, revenueBdt: Math.round(372000 * m) },
    { source: 'Inbound Call', leads: Math.round(420 * m), orders: Math.round(310 * m), conversionRate: 73.8, revenueBdt: Math.round(410000 * m) },
  ];
}

export function getUpsales(period: ReportPeriod): UpsellRow[] {
  const m = periodMultiplier(period);
  return [
    { id: 'u1', baseProduct: 'Honey + Kalojira Mix', upsellProduct: 'Pink Salt', count: Math.round(480 * m), revenueBdt: Math.round(182400 * m), rate: 12.4 },
    { id: 'u2', baseProduct: 'Honey + Kalojira Mix', upsellProduct: 'Beetroot Powder', count: Math.round(320 * m), revenueBdt: Math.round(166400 * m), rate: 8.2 },
    { id: 'u3', baseProduct: 'Honey + Kalojira Mix', upsellProduct: 'Pure Honey', count: Math.round(280 * m), revenueBdt: Math.round(218400 * m), rate: 7.1 },
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
