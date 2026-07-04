import { listUsers } from '@/features/platform/data/mock-tenant-store';
import { MOCK_ORGANIZATION } from '@/features/auth/mocks/mock-organization';

/** Agent names for pickers — prefers tenant users, falls back to demo list. */
export function getAgentNames(): string[] {
  try {
    const users = listUsers(MOCK_ORGANIZATION.id);
    const names = users.map((u) => u.name).filter(Boolean);
    if (names.length) return names;
  } catch {
    // ignore
  }
  return ['Sakib Ahmed', 'Mitu Rahman', 'Imran Hossain', 'Tania Sultana', 'Arif Mahmud'];
}
