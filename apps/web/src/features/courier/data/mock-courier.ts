import type { CourierInboxEvent, CourierOverview, CourierSubmitItem } from '@laam/types';

let readyToSubmit: CourierSubmitItem[] = [
  { orderId: 'ord-10', orderNumber: 'MH-8830', customerName: 'Salma Akter', district: 'Dhaka', amountBdt: 1850, status: 'ready' },
  { orderId: 'ord-11', orderNumber: 'MH-8831', customerName: 'Jamal Hossain', district: 'Chittagong', amountBdt: 3200, status: 'ready' },
  { orderId: 'ord-12', orderNumber: 'MH-8832', customerName: 'Rina Begum', district: 'Sylhet', amountBdt: 2100, status: 'ready' },
  { orderId: 'ord-13', orderNumber: 'MH-8828', customerName: 'Tariq Islam', district: 'Dhaka', amountBdt: 980, status: 'ready' },
];

let inbox: CourierInboxEvent[] = [
  { id: 'ev-1', type: 'delivered', orderId: 'ord-1', orderNumber: 'MH-8821', consignmentId: 'SF-99102', provider: 'steadfast', customerName: 'Fatima Begum', message: 'Parcel delivered successfully', createdAt: '2026-07-04T09:12:00Z', isRead: false },
  { id: 'ev-2', type: 'cod_collected', orderId: 'ord-2', orderNumber: 'MH-8819', consignmentId: 'SF-99088', provider: 'steadfast', customerName: 'Karim Uddin', message: 'COD ৳2,450 collected', createdAt: '2026-07-04T08:55:00Z', isRead: false },
  { id: 'ev-3', type: 'in_transit', orderId: 'ord-3', orderNumber: 'MH-8815', consignmentId: 'PH-44120', provider: 'pathao', customerName: 'Ayesha Khan', message: 'Rider assigned — Mirpur', createdAt: '2026-07-04T08:30:00Z', isRead: true },
  { id: 'ev-4', type: 'failed', orderId: 'ord-4', orderNumber: 'MH-8802', consignmentId: 'SF-99001', provider: 'steadfast', customerName: 'Rashid Ahmed', message: 'Customer unreachable — retry scheduled', createdAt: '2026-07-04T07:10:00Z', isRead: true },
  { id: 'ev-5', type: 'picked', orderId: 'ord-5', orderNumber: 'MH-8825', consignmentId: 'PH-44155', provider: 'pathao', customerName: 'Nusrat Jahan', message: 'Picked from warehouse', createdAt: '2026-07-04T06:40:00Z', isRead: true },
];

let stats = {
  submittedToday: 70,
  inTransit: 34,
  deliveredToday: 28,
  failedToday: 3,
};

export function getCourierOverview(): CourierOverview {
  return {
    accounts: [
      { id: 'ca-1', provider: 'steadfast', label: 'Steadfast Main', status: 'active', isDefault: true, apiKeyMasked: 'sf_••••821', lastSyncAt: '2026-07-04T08:00:00Z', consignmentsToday: 42, successRate: 94.2 },
      { id: 'ca-2', provider: 'pathao', label: 'Pathao COD', status: 'active', isDefault: false, apiKeyMasked: 'ph_••••441', lastSyncAt: '2026-07-04T07:45:00Z', consignmentsToday: 28, successRate: 91.5 },
      { id: 'ca-3', provider: 'redx', label: 'RedX Backup', status: 'inactive', isDefault: false, consignmentsToday: 0, successRate: 88.0 },
      { id: 'ca-4', provider: 'paperfly', label: 'Paperfly Outside Dhaka', status: 'error', isDefault: false, apiKeyMasked: 'pf_••••102', lastSyncAt: '2026-07-03T18:00:00Z', consignmentsToday: 0, successRate: 86.1 },
    ],
    rules: {
      defaultProvider: 'steadfast',
      codEnabled: true,
      codChargePercent: 1,
      autoSubmitOnConfirm: false,
    },
    inbox: [...inbox],
    readyToSubmit: readyToSubmit.filter((r) => r.status === 'ready'),
    stats: { ...stats },
  };
}

export function getUnreadCourierCount(): number {
  return inbox.filter((e) => !e.isRead).length;
}

export function queueOrderForCourier(item: CourierSubmitItem): void {
  if (readyToSubmit.some((r) => r.orderId === item.orderId)) return;
  readyToSubmit.unshift({ ...item, status: 'ready' });
}

export function markOrdersSubmittedToCourier(orderIds: string[], provider: string): void {
  const now = new Date().toISOString();

  for (const id of orderIds) {
    const ready = readyToSubmit.find((r) => r.orderId === id || r.orderNumber === id);
    const orderNumber = ready?.orderNumber ?? id;
    const customerName = ready?.customerName ?? 'Customer';
    const consignmentId = `${provider.slice(0, 2).toUpperCase()}-${Date.now().toString().slice(-6)}`;

    readyToSubmit = readyToSubmit.filter((r) => r.orderId !== id && r.orderNumber !== orderNumber);

    inbox.unshift({
      id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'submitted',
      orderId: ready?.orderId ?? id,
      orderNumber,
      consignmentId,
      provider: provider as CourierInboxEvent['provider'],
      customerName,
      message: `Submitted to ${provider}`,
      createdAt: now,
      isRead: false,
    });

    stats.submittedToday += 1;
    stats.inTransit += 1;
  }
}
