export const authEndpoints = {
  session: '/auth/session',
  login: '/auth/login',
  logout: '/auth/logout',
} as const;

export const crmEndpoints = {
  dashboardStats: '/crm/dashboard/stats',
  contacts: '/crm/contacts',
  companies: '/crm/companies',
  leads: '/crm/leads',
  deals: '/crm/deals',
} as const;
