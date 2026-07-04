const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';

export const env = {
  apiUrl,
  isDev: process.env.NODE_ENV === 'development',
  enableRoleSwitch: process.env.NEXT_PUBLIC_ENABLE_ROLE_SWITCH === 'true',
} as const;
