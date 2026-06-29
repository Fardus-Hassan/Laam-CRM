export const authEndpoints = {
  session: '/auth/session',
  login: '/auth/login',
  logout: '/auth/logout',
} as const;

export const crmEndpoints = {
  dashboard: '/crm/dashboard',
  dashboardStats: '/crm/dashboard/stats',
  contacts: '/crm/contacts',
  companies: '/crm/companies',
  leads: '/crm/leads',
  orders: '/crm/orders',
  deals: '/crm/deals',
  pipeline: '/crm/pipeline',
} as const;
