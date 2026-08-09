const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';

export const env = {
  apiUrl,
  useApi: process.env.NEXT_PUBLIC_USE_API === 'true',
  isDev: process.env.NODE_ENV === 'development',
  enableRoleSwitch: process.env.NEXT_PUBLIC_ENABLE_ROLE_SWITCH === 'true',
} as const;
