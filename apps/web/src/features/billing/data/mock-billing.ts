import type {
  BillingInvoice,
  BillingOverview,
  BillingPaymentMethod,
  BillingPlanOption,
  BillingSubscription,
  PlatformBillingTenant,
  RechargeCreditsPayload,
} from '@laam/types';

const MOCK_TODAY = '2026-07-02';

export const MOCK_SUBSCRIPTION: BillingSubscription = {
  plan: 'Pro',
  status: 'active',
  billingCycle: 'monthly',
  currentPeriodStart: '2026-06-02',
  currentPeriodEnd: '2026-07-02',
  nextBillingDate: '2026-08-02',
  amountBdt: 4999,
  smsCredits: 5000,
  smsCreditsUsed: 3240,
  orderQuota: 10000,
  ordersUsed: 4821,
  userSeats: 15,
  usersActive: 8,
  autoRenew: true,
};

export const MOCK_PAYMENT_METHODS: BillingPaymentMethod[] = [
  { id: 'pm-1', type: 'bkash', label: 'bKash Business', lastFour: '4521', isDefault: true },
  { id: 'pm-2', type: 'bank', label: 'DBBL Current', lastFour: '8834', isDefault: false },
];

export const MOCK_INVOICES: BillingInvoice[] = [
  { id: 'inv-1', number: 'LAAM-2026-06', date: '2026-06-02', dueDate: '2026-06-05', amountBdt: 4999, status: 'paid', plan: 'Pro', periodLabel: 'Jun 2026' },
  { id: 'inv-2', number: 'LAAM-2026-05', date: '2026-05-02', dueDate: '2026-05-05', amountBdt: 4999, status: 'paid', plan: 'Pro', periodLabel: 'May 2026' },
  { id: 'inv-3', number: 'LAAM-2026-04', date: '2026-04-02', dueDate: '2026-04-05', amountBdt: 4999, status: 'paid', plan: 'Pro', periodLabel: 'Apr 2026' },
  { id: 'inv-4', number: 'LAAM-2026-03', date: '2026-03-02', dueDate: '2026-03-05', amountBdt: 2999, status: 'paid', plan: 'Starter', periodLabel: 'Mar 2026' },
  { id: 'inv-5', number: 'LAAM-2026-07', date: MOCK_TODAY, dueDate: '2026-07-05', amountBdt: 4999, status: 'pending', plan: 'Pro', periodLabel: 'Jul 2026' },
];

export const MOCK_PLAN_OPTIONS: BillingPlanOption[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyBdt: 2999,
    yearlyBdt: 29990,
    smsCredits: 2000,
    orderQuota: 3000,
    userSeats: 5,
    features: ['Orders & CRM', 'Basic reports', '2 courier integrations', 'Email support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyBdt: 4999,
    yearlyBdt: 49990,
    smsCredits: 5000,
    orderQuota: 10000,
    userSeats: 15,
    features: ['Everything in Starter', 'Inventory & accounting', 'Facebook lead sync', 'Priority support'],
    isPopular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyBdt: 9999,
    yearlyBdt: 99990,
    smsCredits: 15000,
    orderQuota: 50000,
    userSeats: 50,
    features: ['Everything in Pro', 'Custom roles', 'API access', 'Dedicated account manager'],
  },
];

export const MOCK_PLATFORM_BILLING: PlatformBillingTenant[] = [
  { tenantId: 't-1', tenantName: 'Modhu House BD', plan: 'Pro', status: 'active', mrrBdt: 4999, lastPaymentDate: '2026-06-02', outstandingBdt: 0 },
  { tenantId: 't-2', tenantName: 'Khejur Mart', plan: 'Starter', status: 'active', mrrBdt: 2999, lastPaymentDate: '2026-06-15', outstandingBdt: 0 },
  { tenantId: 't-3', tenantName: 'Dhaka Organic', plan: 'Pro', status: 'past_due', mrrBdt: 4999, lastPaymentDate: '2026-05-02', outstandingBdt: 4999 },
  { tenantId: 't-4', tenantName: 'Sylhet Honey Co', plan: 'Enterprise', status: 'active', mrrBdt: 9999, lastPaymentDate: '2026-06-28', outstandingBdt: 0 },
  { tenantId: 't-5', tenantName: 'Chittagong Foods', plan: 'Starter', status: 'suspended', mrrBdt: 0, outstandingBdt: 5998 },
];

export function getBillingOverview(): BillingOverview {
  return {
    subscription: MOCK_SUBSCRIPTION,
    paymentMethods: MOCK_PAYMENT_METHODS,
    recentInvoices: MOCK_INVOICES,
    totalPaidBdt: MOCK_INVOICES.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amountBdt, 0),
    outstandingBdt: MOCK_INVOICES.filter((i) => i.status === 'pending' || i.status === 'overdue').reduce((s, i) => s + i.amountBdt, 0),
  };
}

export function rechargeCredits(payload: RechargeCreditsPayload): BillingSubscription {
  const creditsToAdd = Math.floor(payload.amountBdt / 2);
  MOCK_SUBSCRIPTION.smsCredits += creditsToAdd;
  return { ...MOCK_SUBSCRIPTION };
}

export function listInvoices(): BillingInvoice[] {
  return [...MOCK_INVOICES];
}

export function listPlanOptions(): BillingPlanOption[] {
  return [...MOCK_PLAN_OPTIONS];
}

export function listPlatformBilling(): PlatformBillingTenant[] {
  return [...MOCK_PLATFORM_BILLING];
}
