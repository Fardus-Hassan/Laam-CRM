import type { CampaignOverview } from '@laam/types';

export function getCampaignOverview(): CampaignOverview {
  const campaigns = [
    { id: 'camp-1', name: 'Ramadan Modhu Boost', status: 'active' as const, platform: 'facebook' as const, spendBdt: 32000, budgetBdt: 50000, leads: 186, orders: 72, revenueBdt: 168000, roas: 5.25, startDate: '2026-06-01' },
    { id: 'camp-2', name: 'Khejur Combo Retarget', status: 'active' as const, platform: 'instagram' as const, spendBdt: 28000, budgetBdt: 40000, leads: 124, orders: 58, revenueBdt: 124000, roas: 4.4, startDate: '2026-06-10' },
    { id: 'camp-3', name: 'Lookalike Dhaka', status: 'paused' as const, platform: 'facebook' as const, spendBdt: 25000, budgetBdt: 30000, leads: 98, orders: 56, revenueBdt: 128000, roas: 5.1, startDate: '2026-05-15', endDate: '2026-06-30' },
    { id: 'camp-4', name: 'Google Search — Modhu', status: 'ended' as const, platform: 'google' as const, spendBdt: 12000, budgetBdt: 12000, leads: 42, orders: 18, revenueBdt: 42000, roas: 3.5, startDate: '2026-04-01', endDate: '2026-05-01' },
  ];
  const totalSpendBdt = campaigns.reduce((s, c) => s + c.spendBdt, 0);
  const totalRevenueBdt = campaigns.reduce((s, c) => s + c.revenueBdt, 0);
  return {
    campaigns,
    totalSpendBdt,
    totalRevenueBdt,
    avgRoas: Math.round((totalRevenueBdt / totalSpendBdt) * 100) / 100,
    totalLeads: campaigns.reduce((s, c) => s + c.leads, 0),
    landingPages: [
      { id: 'lp-1', name: 'Ramadan Gift Landing', url: 'https://modhuhouse.com/ramadan', visits: 4200, conversions: 312, conversionRate: 7.4 },
      { id: 'lp-2', name: 'Combo Offer Page', url: 'https://modhuhouse.com/combo', visits: 2800, conversions: 198, conversionRate: 7.1 },
      { id: 'lp-3', name: 'Wholesale Inquiry', url: 'https://modhuhouse.com/wholesale', visits: 640, conversions: 28, conversionRate: 4.4 },
    ],
  };
}
