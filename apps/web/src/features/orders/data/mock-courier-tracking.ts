import type { OrderCourierTracking } from '@laam/types';

export function buildMockCourierTracking(orderId: string): OrderCourierTracking {
  const couriers = ['Pathao', 'Steadfast', 'Carrybee'];
  const hash = orderId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const courierName = couriers[hash % couriers.length];

  return {
    courierName,
    trackingId: `TRK-${orderId.replace(/\D/g, '').slice(-6)}`,
    currentStatus: 'Out for delivery',
    steps: [
      {
        id: '1',
        label: 'Order submitted to courier',
        completed: true,
        timestamp: '2024-05-28T09:00:00.000Z',
      },
      {
        id: '2',
        label: 'Picked up from warehouse',
        completed: true,
        timestamp: '2024-05-28T14:00:00.000Z',
      },
      {
        id: '3',
        label: 'In transit to hub',
        completed: true,
        timestamp: '2024-05-29T08:00:00.000Z',
      },
      { id: '4', label: 'Out for delivery', completed: false },
      { id: '5', label: 'Delivered', completed: false },
    ],
  };
}
