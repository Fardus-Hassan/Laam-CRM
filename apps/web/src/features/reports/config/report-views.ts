import type { ReportViewId } from '@laam/types';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Box,
  LineChart,
  Megaphone,
  Package,
  RefreshCw,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

export type ReportCategory = {
  id: string;
  label: string;
};

export type ReportViewConfig = {
  id: ReportViewId;
  label: string;
  description: string;
  category: string;
  icon: LucideIcon;
  permission?: 'platform.view';
};

export const REPORT_CATEGORIES: ReportCategory[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'sales', label: 'Sales & Revenue' },
  { id: 'products', label: 'Products & Inventory' },
  { id: 'team', label: 'Team Performance' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'security', label: 'Security' },
  { id: 'platform', label: 'Platform' },
];

export const REPORT_VIEWS: ReportViewConfig[] = [
  { id: 'summary', label: 'Summary', description: 'KPI overview — orders, revenue, conversion, and trends.', category: 'overview', icon: BarChart3 },
  { id: 'sales', label: 'Sales', description: 'Order volume, AOV, and sales funnel performance.', category: 'sales', icon: TrendingUp },
  { id: 'revenue', label: 'Revenue', description: 'Total revenue, COD vs prepaid, and daily breakdown.', category: 'sales', icon: Wallet },
  { id: 'repeat-customers', label: 'Repeat Customers', description: 'Retention, repeat purchase rate, and loyal buyers.', category: 'sales', icon: RefreshCw },
  { id: 'upsales', label: 'Up-sales', description: 'Cross-sell and combo purchase metrics.', category: 'sales', icon: ArrowUpRight },
  { id: 'product-sales', label: 'Product Sales', description: 'Sales by SKU and category for the period.', category: 'products', icon: Package },
  { id: 'product-daily', label: 'Product Daily Sales', description: 'Daily units and revenue time series.', category: 'products', icon: LineChart },
  { id: 'top-sold', label: 'Top Sold Products', description: 'Best sellers by units and revenue.', category: 'products', icon: TrendingUp },
  { id: 'top-return', label: 'Top Return Products', description: 'Highest return rate products — quality check.', category: 'products', icon: TrendingDown },
  { id: 'top-purchased', label: 'Top Purchased', description: 'Most purchased from suppliers.', category: 'products', icon: Box },
  { id: 'low-stock', label: 'Lowest Stock', description: 'Products running low — reorder alerts.', category: 'products', icon: Package },
  { id: 'high-stock', label: 'Highest Stock', description: 'Overstocked products — slow movers.', category: 'products', icon: Box },
  { id: 'agents', label: 'Agent Performance', description: 'Per-agent orders, revenue, and conversion.', category: 'team', icon: Users },
  { id: 'teams', label: 'Team Performance', description: 'Team-level targets vs actuals.', category: 'team', icon: Users },
  { id: 'orders-by-employee', label: 'Orders by Employee', description: 'Order count and value per team member.', category: 'team', icon: Activity },
  { id: 'employee-activity', label: 'Employee Activity', description: 'Calls, follow-ups, and actions logged.', category: 'team', icon: Activity },
  { id: 'team-targets', label: 'Team Targets', description: 'Monthly targets vs achievement.', category: 'team', icon: Target },
  { id: 'marketing', label: 'Meta Ads', description: 'Facebook ad spend, ROAS, and campaign ROI.', category: 'marketing', icon: Megaphone },
  { id: 'campaign', label: 'Campaign ROI', description: 'Per-campaign spend and return breakdown.', category: 'marketing', icon: Megaphone },
  { id: 'sources', label: 'Lead Sources', description: 'Facebook Ad, Campaign, Website, Landing — conversion & revenue.', category: 'marketing', icon: Target },
  { id: 'login-history', label: 'Login Histories', description: 'Who logged in, when, and from where.', category: 'security', icon: Shield },
  { id: 'platform', label: 'Platform', description: 'Cross-tenant SaaS metrics (Super Admin).', category: 'platform', icon: BarChart3, permission: 'platform.view' },
];

export function getReportView(id: string): ReportViewConfig | undefined {
  return REPORT_VIEWS.find((v) => v.id === id);
}

export const DEFAULT_REPORT_VIEW: ReportViewId = 'summary';
