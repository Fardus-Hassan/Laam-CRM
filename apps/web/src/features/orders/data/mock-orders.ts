import type { OrderDetail, OrderListItem, OrderListQuery, OrderListResponse, OrderTimelineEvent } from '@laam/types';

const AGENTS = ['Sakib Ahmed', 'Mitu Rahman', 'Imran Hossain', 'Tania Sultana', 'Arif Mahmud'];
const AREAS = ['Gulshan', 'Banani', 'Dhanmondi', 'Mirpur', 'Uttara', 'Mohammadpur', 'Bashundhara'];

function buildOrder(
  index: number,
  overrides: Partial<OrderListItem> & Pick<OrderListItem, 'status' | 'customerName'>,
): OrderDetail {
  const orderNumber = `ORD-${1000 + index}`;
  const itemsCount = 1 + (index % 4);
  const subtotal = 2500 + index * 750;
  const deliveryCharge = index % 3 === 0 ? 0 : 120;
  const discount = index % 5 === 0 ? 200 : 0;
  const amount = subtotal + deliveryCharge - discount;
  const source = (['facebook', 'call', 'ecommerce', 'walk_in'] as const)[index % 4];
  const paymentStatus = (['cod', 'paid', 'partial'] as const)[index % 3];
  const createdDay = 28 - (index % 14);

  const base: OrderListItem = {
    id: `order-${index}`,
    orderNumber,
    status: overrides.status,
    customerName: overrides.customerName,
    customerPhone: `01${String(700000000 + index).slice(0, 9)}`,
    source: overrides.source ?? source,
    itemsCount: overrides.itemsCount ?? itemsCount,
    amount: overrides.amount ?? amount,
    paymentStatus: overrides.paymentStatus ?? paymentStatus,
    assignedAgentName: overrides.assignedAgentName ?? AGENTS[index % AGENTS.length],
    shippingArea: overrides.shippingArea ?? AREAS[index % AREAS.length],
    createdAt: `2024-05-${String(createdDay).padStart(2, '0')}T10:${String(index % 60).padStart(2, '0')}:00.000Z`,
  };

  const lineItems = Array.from({ length: base.itemsCount }, (_, itemIndex) => {
    const quantity = 1 + (itemIndex % 2);
    const unitPrice = Math.round(subtotal / base.itemsCount / quantity);

    return {
      id: `${base.id}-line-${itemIndex}`,
      productName: ['Premium Dates 500g', 'Mixed Nuts 250g', 'Organic Honey', 'Gift Hamper'][itemIndex % 4],
      sku: `SKU-${100 + itemIndex}`,
      quantity,
      unitPrice,
      lineTotal: unitPrice * quantity,
    };
  });

  const timeline: OrderTimelineEvent[] = [
    {
      id: `${base.id}-t1`,
      type: 'created',
      label: 'Order created',
      description: `Inbound via ${base.source}`,
      timestamp: base.createdAt,
      actorName: base.assignedAgentName,
    },
  ];

  if (['confirmed', 'delivered', 'hold'].includes(base.status)) {
    timeline.push({
      id: `${base.id}-t2`,
      type: 'confirmed',
      label: 'Order confirmed',
      timestamp: base.createdAt,
      actorName: base.assignedAgentName,
    });
  }

  if (base.status === 'hold') {
    timeline.push({
      id: `${base.id}-t3`,
      type: 'hold',
      label: 'Placed on hold',
      description: 'Customer requested callback',
      timestamp: base.createdAt,
      actorName: base.assignedAgentName,
    });
  }

  if (base.status === 'cancelled') {
    timeline.push({
      id: `${base.id}-t4`,
      type: 'cancelled',
      label: 'Order cancelled',
      description: 'Customer changed mind',
      timestamp: base.createdAt,
      actorName: base.assignedAgentName,
    });
  }

  if (base.status === 'delivered') {
    timeline.push({
      id: `${base.id}-t5`,
      type: 'delivered',
      label: 'Delivered',
      description: 'Handed to customer',
      timestamp: base.createdAt,
      actorName: 'Courier',
    });
  }

  return {
    ...base,
    customerEmail: `${base.customerName.split(' ')[0].toLowerCase()}@email.com`,
    shippingAddress: `House ${index + 2}, Road ${index % 12}, ${base.shippingArea}, Dhaka`,
    deliveryCharge,
    discount,
    subtotal,
    lineItems,
    timeline,
    notes: index % 4 === 0 ? 'Call before delivery.' : undefined,
    leadId: index % 3 === 0 ? `lead-${index}` : undefined,
    confirmedAt: ['confirmed', 'delivered', 'hold'].includes(base.status) ? base.createdAt : undefined,
    deliveredAt: base.status === 'delivered' ? base.createdAt : undefined,
  };
}

export const MOCK_ORDERS: OrderDetail[] = [
  buildOrder(1, { status: 'pending', customerName: 'Rahim Uddin' }),
  buildOrder(2, { status: 'pending', customerName: 'Fatema Akter' }),
  buildOrder(3, { status: 'pending', customerName: 'Karim Hassan' }),
  buildOrder(4, { status: 'pending', customerName: 'Nusrat Jahan' }),
  buildOrder(5, { status: 'confirmed', customerName: 'Sakib Ahmed' }),
  buildOrder(6, { status: 'confirmed', customerName: 'Mitu Rahman' }),
  buildOrder(7, { status: 'confirmed', customerName: 'Imran Hossain' }),
  buildOrder(8, { status: 'confirmed', customerName: 'Tania Sultana' }),
  buildOrder(9, { status: 'confirmed', customerName: 'Arif Mahmud' }),
  buildOrder(10, { status: 'hold', customerName: 'Hasan Ali' }),
  buildOrder(11, { status: 'hold', customerName: 'Sabrina Khan' }),
  buildOrder(12, { status: 'hold', customerName: 'Rafiq Islam' }),
  buildOrder(13, { status: 'cancelled', customerName: 'Jannatul Ferdous' }),
  buildOrder(14, { status: 'cancelled', customerName: 'Omar Faruk' }),
  buildOrder(15, { status: 'cancelled', customerName: 'Priya Das' }),
  buildOrder(16, { status: 'delivered', customerName: 'Anika Rahman' }),
  buildOrder(17, { status: 'delivered', customerName: 'Tanvir Hossain' }),
  buildOrder(18, { status: 'delivered', customerName: 'Lamia Akter' }),
  buildOrder(19, { status: 'delivered', customerName: 'Shuvo Das' }),
  buildOrder(20, { status: 'delivered', customerName: 'Nadia Islam' }),
  buildOrder(21, { status: 'in_progress', customerName: 'Mehedi Hasan' }),
  buildOrder(22, { status: 'follow_up', customerName: 'Rubaiya Sultana' }),
  buildOrder(23, { status: 'pending', customerName: 'Asif Khan', source: 'facebook' }),
  buildOrder(24, { status: 'confirmed', customerName: 'Farhana Begum', source: 'call' }),
  buildOrder(25, { status: 'delivered', customerName: 'Kamal Uddin', source: 'ecommerce' }),
  buildOrder(26, { status: 'pending_2', customerName: 'Noman Ali' }),
  buildOrder(27, { status: 'pending_3', customerName: 'Salma Khatun' }),
  buildOrder(28, { status: 'in_courier', customerName: 'Ibrahim Hossain' }),
  buildOrder(29, { status: 'completed', customerName: 'Fatima Begum' }),
  buildOrder(30, { status: 'processing', customerName: 'Rashed Khan' }),
  buildOrder(31, { status: 'convert', customerName: 'Priya Saha' }),
  buildOrder(32, { status: 'cod_changed', customerName: 'Hasan Mahmud' }),
];

export function getMockOrderById(orderNumber: string): OrderDetail | undefined {
  return MOCK_ORDERS.find(
    (order) => order.orderNumber === orderNumber || order.id === orderNumber,
  );
}

export function filterMockOrders(query: OrderListQuery): OrderListResponse {
  const search = query.search?.trim().toLowerCase() ?? '';
  let items = MOCK_ORDERS.filter((order) => {
    if (query.status && order.status !== query.status) {
      return false;
    }

    if (query.source && order.source !== query.source) {
      return false;
    }

    if (!search) {
      return true;
    }

    return (
      order.orderNumber.toLowerCase().includes(search) ||
      order.customerName.toLowerCase().includes(search) ||
      order.customerPhone.includes(search) ||
      order.shippingArea.toLowerCase().includes(search)
    );
  });

  const total = items.length;
  const totalAmount = items.reduce((sum, order) => sum + order.amount, 0);
  const start = (query.page - 1) * query.pageSize;
  items = items.slice(start, start + query.pageSize);

  return {
    items: items.map(({ lineItems: _lineItems, timeline: _timeline, ...listItem }) => listItem),
    total,
    page: query.page,
    pageSize: query.pageSize,
    summary: {
      count: total,
      totalAmount,
    },
  };
}
