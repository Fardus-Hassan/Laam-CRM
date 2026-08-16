import type {
  BlockedEntry,
  BlockedListQuery,
  BlockedListResponse,
  CreateBlockedEntryPayload,
} from '@laam/types';
import { newBrowserId } from '@/lib/device-id';

const MOCK_TODAY = new Date('2026-07-02');

const SEED_BLOCKED: BlockedEntry[] = [
  { id: 'blk-1', type: 'mobile', value: '01712345678', reason: 'fraud', note: 'Fake COD orders — 5 returns', blockedBy: 'u-1', blockedByName: 'Laam Org Admin', createdAt: '2026-07-01T10:00:00Z', expiresAt: '2026-07-04T10:00:00Z', orderCount: 5, lastOrderId: 'ORD-8821' },
  { id: 'blk-2', type: 'ip', value: '103.148.72.44', reason: 'duplicate', note: 'Same IP placing 20+ orders/day', blockedBy: 'u-1', blockedByName: 'Laam Org Admin', createdAt: '2026-06-30T14:30:00Z', expiresAt: '2026-07-03T14:30:00Z', orderCount: 23 },
  { id: 'blk-3', type: 'mobile', value: '01898765432', reason: 'chargeback', blockedBy: 'u-2', blockedByName: 'Sakib Ahmed', createdAt: '2026-06-29T09:15:00Z', expiresAt: '2026-07-02T09:15:00Z', orderCount: 2 },
  { id: 'blk-4', type: 'ip', value: '27.147.130.88', reason: 'abuse', note: 'Spam lead submissions', blockedBy: 'u-1', blockedByName: 'Laam Org Admin', createdAt: '2026-06-28T16:00:00Z', orderCount: 0 },
  { id: 'blk-5', type: 'mobile', value: '01611223344', reason: 'manual', note: 'Customer requested block', blockedBy: 'u-3', blockedByName: 'Rahim Uddin', createdAt: '2026-06-27T11:00:00Z' },
  { id: 'blk-6', type: 'ip', value: '45.248.60.12', reason: 'fraud', blockedBy: 'u-1', blockedByName: 'Laam Org Admin', createdAt: '2026-06-26T08:45:00Z', expiresAt: '2026-06-29T08:45:00Z', orderCount: 8 },
  { id: 'blk-7', type: 'mobile', value: '01955667788', reason: 'duplicate', blockedBy: 'u-2', blockedByName: 'Sakib Ahmed', createdAt: '2026-06-25T13:20:00Z', expiresAt: '2026-06-28T13:20:00Z', orderCount: 12 },
  { id: 'blk-8', type: 'mobile', value: '01533445566', reason: 'other', note: 'Test number — block permanently', blockedBy: 'u-1', blockedByName: 'Laam Org Admin', createdAt: '2026-06-20T10:00:00Z' },
];

let blockedStore = [...SEED_BLOCKED];

function isExpiringSoon(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  const exp = new Date(expiresAt);
  const diff = exp.getTime() - MOCK_TODAY.getTime();
  return diff > 0 && diff <= 24 * 60 * 60 * 1000;
}

export function getBlockedCount(): number {
  return blockedStore.filter((e) => !e.expiresAt || new Date(e.expiresAt) > MOCK_TODAY).length;
}

export function filterBlocked(query: BlockedListQuery): BlockedListResponse {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  let items = blockedStore.filter((e) => !e.expiresAt || new Date(e.expiresAt) > MOCK_TODAY);

  if (query.type) {
    items = items.filter((e) => e.type === query.type);
  }
  if (query.search) {
    const q = query.search.toLowerCase();
    items = items.filter(
      (e) => e.value.toLowerCase().includes(q) || e.note?.toLowerCase().includes(q) || e.blockedByName.toLowerCase().includes(q),
    );
  }

  const total = items.length;
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);

  return {
    items: paged,
    total,
    page,
    pageSize,
    summary: {
      total: blockedStore.length,
      ipCount: blockedStore.filter((e) => e.type === 'ip').length,
      mobileCount: blockedStore.filter((e) => e.type === 'mobile').length,
      expiringSoon: blockedStore.filter((e) => isExpiringSoon(e.expiresAt)).length,
    },
  };
}

export function createBlockedEntry(payload: CreateBlockedEntryPayload): BlockedEntry {
  const expiresAt = payload.expiresInDays
    ? new Date(MOCK_TODAY.getTime() + payload.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : undefined;

  const entry: BlockedEntry = {
    id: `blk-${newBrowserId().slice(0, 8)}`,
    type: payload.type,
    value: payload.value,
    reason: payload.reason,
    note: payload.note,
    blockedBy: 'u-1',
    blockedByName: 'Laam Org Admin',
    createdAt: MOCK_TODAY.toISOString(),
    expiresAt,
    lastOrderId: payload.lastOrderId,
    orderCount: payload.lastOrderId ? 1 : undefined,
  };

  blockedStore = [entry, ...blockedStore];
  return entry;
}

export function deleteBlockedEntry(id: string): boolean {
  const before = blockedStore.length;
  blockedStore = blockedStore.filter((e) => e.id !== id);
  return blockedStore.length < before;
}
