import type {
  BulkActionResult,
  CreateOrderPayload,
  DuplicateCheckQuery,
  DuplicateCheckResult,
  OrderBulkActionPayload,
  OrderDetail,
  OrderListItem,
  OrderListQuery,
  OrderListResponse,
  OrderListRow,
  OrderListRowResponse,
  OrderSalesSummary,
  OrderTimelineEvent,
  UpdateOrderPayload,
} from '@laam/types';

import { MOCK_PRODUCTS } from '@/features/orders/data/mock-products';
import { ORDER_SOURCE_LABELS } from '@/features/orders/config/order-status';
import { getStatusConfigBySlug } from '@/features/orders/data/mock-status-config';

function orderMatchesSearch(order: OrderDetail, rawSearch: string): boolean {
  const search = rawSearch.trim().toLowerCase();
  if (!search) {
    return true;
  }

  const statusLabel = getStatusConfigBySlug(order.status)?.label ?? order.status;
  const sourceLabel = ORDER_SOURCE_LABELS[order.source] ?? order.source;
  const productText = order.lineItems
    .map((line) => `${line.productName} ${line.sku ?? ''}`)
    .join(' ');

  const haystack = [
    order.id,
    order.orderNumber,
    order.customerName,
    order.customerPhone,
    order.shippingArea,
    order.shippingAddress,
    order.assignedAgentName,
    order.status,
    statusLabel,
    order.source,
    sourceLabel,
    productText,
    String(order.amount),
    order.notes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(search);
}

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
  ...Array.from({ length: 23 }, (_, offset) => {
    const index = 33 + offset;
    const statuses = ['pending', 'confirmed', 'in_courier', 'delivered', 'hold'] as const;
    return buildOrder(index, {
      status: statuses[index % statuses.length],
      customerName: `Customer ${index}`,
    });
  }),
];

/** Mutable in-memory store — mock API mutations update this array. */
export const mockOrderStore: OrderDetail[] = [...MOCK_ORDERS];

function getOrderStore(): OrderDetail[] {
  return mockOrderStore;
}

export function getMockOrderById(orderNumber: string): OrderDetail | undefined {
  return getOrderStore().find(
    (order) => order.orderNumber === orderNumber || order.id === orderNumber,
  );
}

function nextOrderIndex(): number {
  const store = getOrderStore();
  const maxNum = store.reduce((max, order) => {
    const num = Number.parseInt(order.orderNumber.replace(/\D/g, ''), 10) || 0;
    return Math.max(max, num);
  }, 1000);
  return maxNum - 1000 + 1;
}

function appendTimelineEvent(order: OrderDetail, event: Omit<OrderTimelineEvent, 'id'>): OrderTimelineEvent[] {
  return [
    ...order.timeline,
    { ...event, id: `${order.id}-t-${order.timeline.length + 1}` },
  ];
}

export function createMockOrder(payload: CreateOrderPayload): OrderDetail {
  const index = nextOrderIndex() + getOrderStore().length;
  const lineItems = payload.lineItems.map((line, itemIndex) => ({
    id: `order-new-${index}-line-${itemIndex}`,
    productName: line.productName,
    sku: line.sku,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    lineTotal: line.unitPrice * line.quantity,
  }));
  const subtotal = lineItems.reduce((sum, line) => sum + line.lineTotal, 0);
  const amount = subtotal + payload.deliveryCharge - payload.discount;

  const order = buildOrder(index, {
    status: payload.status,
    customerName: payload.customerName,
    customerPhone: payload.customerPhone,
    source: payload.source,
    paymentStatus: payload.paymentStatus,
    assignedAgentName: payload.assignedAgentName,
    shippingArea: payload.shippingArea,
    amount,
    itemsCount: lineItems.length,
  });

  const detail: OrderDetail = {
    ...order,
    customerEmail: payload.customerEmail,
    shippingAddress: payload.shippingAddress,
    deliveryCharge: payload.deliveryCharge,
    discount: payload.discount,
    subtotal,
    lineItems,
    notes: payload.notes,
    timeline: [
      {
        id: `${order.id}-t1`,
        type: 'created',
        label: 'Order created manually',
        description: `Source: ${payload.source}`,
        timestamp: new Date().toISOString(),
        actorName: payload.assignedAgentName ?? 'Agent',
      },
    ],
  };

  mockOrderStore.unshift(detail);
  return detail;
}

export function updateMockOrder(orderId: string, patch: UpdateOrderPayload): OrderDetail | null {
  const index = mockOrderStore.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
  if (index < 0) {
    return null;
  }

  const current = mockOrderStore[index];
  const lineItems = patch.lineItems
    ? patch.lineItems.map((line, itemIndex) => ({
        id: `${current.id}-line-${itemIndex}`,
        productName: line.productName,
        sku: line.sku,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.unitPrice * line.quantity,
      }))
    : current.lineItems;

  const subtotal = lineItems.reduce((sum, line) => sum + line.lineTotal, 0);
  const deliveryCharge = patch.deliveryCharge ?? current.deliveryCharge;
  const discount = patch.discount ?? current.discount;
  const amount = subtotal + deliveryCharge - discount;

  let timeline = current.timeline;
  if (patch.status && patch.status !== current.status) {
    timeline = appendTimelineEvent(current, {
      type: 'note',
      label: `Status changed to ${patch.status}`,
      timestamp: new Date().toISOString(),
      actorName: 'Agent',
    });
  }

  const updated: OrderDetail = {
    ...current,
    customerName: patch.customerName ?? current.customerName,
    customerPhone: patch.customerPhone ?? current.customerPhone,
    customerEmail: patch.customerEmail ?? current.customerEmail,
    shippingAddress: patch.shippingAddress ?? current.shippingAddress,
    shippingArea: patch.shippingAddress ? current.shippingArea : current.shippingArea,
    source: patch.source ?? current.source,
    status: patch.status ?? current.status,
    paymentStatus: patch.paymentStatus ?? current.paymentStatus,
    deliveryCharge,
    discount,
    subtotal,
    amount,
    lineItems,
    itemsCount: lineItems.length,
    notes: patch.notes ?? current.notes,
    assignedAgentName: patch.assignedAgentName ?? current.assignedAgentName,
    timeline,
  };

  mockOrderStore[index] = updated;
  return updated;
}

export function checkMockDuplicate(query: DuplicateCheckQuery): DuplicateCheckResult {
  const phone = query.phone.replace(/\D/g, '');
  const existing = getOrderStore().find(
    (order) =>
      order.customerPhone.replace(/\D/g, '') === phone &&
      order.status !== 'cancelled' &&
      order.status !== 'delivered',
  );

  if (!existing) {
    return { isDuplicate: false };
  }

  return {
    isDuplicate: true,
    existingOrderId: existing.id,
    existingOrderNumber: existing.orderNumber,
    message: `Similar order ${existing.orderNumber} exists for this phone within the last 72 hours.`,
  };
}

export function bulkUpdateMockOrders(payload: OrderBulkActionPayload): BulkActionResult {
  let successCount = 0;
  for (const orderId of payload.orderIds) {
    const order = getMockOrderById(orderId);
    if (!order) {
      continue;
    }

    const patch: UpdateOrderPayload = {};
    if (payload.action === 'status_change' && payload.status) {
      patch.status = payload.status;
    }
    if (payload.action === 'transfer_employee' && payload.employeeName) {
      patch.assignedAgentName = payload.employeeName;
    }
    if (Object.keys(patch).length > 0) {
      updateMockOrder(order.id, patch);
      successCount += 1;
    } else if (['sms', 'courier_submit', 'export', 'print', 'barcode'].includes(payload.action)) {
      successCount += 1;
    }
  }

  return {
    successCount,
    failedCount: payload.orderIds.length - successCount,
    message: `Bulk ${payload.action} completed for ${successCount} order(s)`,
  };
}

export function updateMockOrderNote(orderId: string, note: string): void {
  const order = getMockOrderById(orderId);
  if (order) {
    updateMockOrder(order.id, { notes: note });
  }
}

function orderMatchesFilters(order: OrderDetail, query: OrderListQuery): boolean {
  if (query.status && order.status !== query.status) {
    return false;
  }
  if (query.source && order.source !== query.source) {
    return false;
  }
  if (query.paymentStatus && order.paymentStatus !== query.paymentStatus) {
    return false;
  }
  if (query.employee && order.assignedAgentName !== query.employee) {
    return false;
  }
  if (query.district && !order.shippingArea.toLowerCase().includes(query.district.toLowerCase())) {
    return false;
  }
  if (query.product) {
    const productMatch = order.lineItems.some((line) =>
      line.productName.toLowerCase().includes(query.product!.toLowerCase()),
    );
    if (!productMatch) {
      return false;
    }
  }
  if (query.search?.trim()) {
    if (!orderMatchesSearch(order, query.search)) {
      return false;
    }
  }
  return true;
}

export function orderDetailToListRow(order: OrderDetail, serialNumber?: number): OrderListRow {
  const paid = order.paymentStatus === 'paid' ? order.amount : order.paymentStatus === 'partial' ? order.amount * 0.5 : 0;
  const due = Math.max(0, order.amount - paid);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    source: order.source,
    itemsCount: order.itemsCount,
    amount: order.amount,
    paymentStatus: order.paymentStatus,
    assignedAgentName: order.assignedAgentName,
    shippingArea: order.shippingArea,
    createdAt: order.createdAt,
    serialNumber,
    hasNote: Boolean(order.notes),
    products: order.lineItems.map((line, idx) => ({
      name: line.productName,
      price: line.lineTotal,
      sku: line.sku,
      imageUrl: MOCK_PRODUCTS[idx % MOCK_PRODUCTS.length]?.imageUrl,
    })),
    shippingAddress: order.shippingAddress,
    subtotal: order.subtotal,
    discount: order.discount,
    paid,
    due,
    courier: buildMockCourierStats(
      order.status,
      serialNumber ?? (Number.parseInt(order.orderNumber.replace(/\D/g, ''), 10) || 0),
    ),
  };
}

function buildMockCourierStats(
  status: OrderDetail['status'],
  index: number,
): OrderListRow['courier'] {
  if (status === 'cancelled') {
    return undefined;
  }

  const labels = ['New', 'Regular', 'Express', 'Priority'];
  const percent =
    status === 'delivered' || status === 'completed'
      ? 100
      : status === 'in_courier'
        ? 45 + (index % 4) * 12
        : 20 + (index % 5) * 15;

  const su = status === 'delivered' || status === 'completed' ? 1 : 0;
  const fa = status === 'returned' ? 1 : 0;

  return {
    to: 1 + (index % 3),
    co: index % 2,
    su,
    fa,
    label: labels[index % labels.length],
    percent: Math.min(100, percent),
  };
}

function sortMockOrderRows(
  rows: OrderDetail[],
  sortBy?: string,
  sortDir?: 'asc' | 'desc',
): OrderDetail[] {
  if (!sortBy) {
    return rows;
  }

  const direction = sortDir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const getValue = (order: OrderDetail): string | number => {
      switch (sortBy) {
        case 'status':
          return order.status;
        case 'customer':
          return order.customerName;
        case 'date':
          return new Date(order.createdAt).getTime();
        case 'products':
          return order.orderNumber;
        default:
          return order.orderNumber;
      }
    };

    const left = getValue(a);
    const right = getValue(b);
    if (typeof left === 'number' && typeof right === 'number') {
      return (left - right) * direction;
    }
    return String(left).localeCompare(String(right)) * direction;
  });
}

export function filterMockOrderRows(query: OrderListQuery): OrderListRowResponse {
  const allRows = getOrderStore().filter((order) => orderMatchesFilters(order, query));

  const total = allRows.length;
  const sortedRows = sortMockOrderRows(allRows, query.sortBy, query.sortDir);
  const start = (query.page - 1) * query.pageSize;
  const pageRows = sortedRows.slice(start, start + query.pageSize);

  return {
    items: pageRows.map((order, index) => orderDetailToListRow(order, start + index + 1)),
    total,
    page: query.page,
    pageSize: query.pageSize,
    summary: {
      count: total,
      totalAmount: allRows.reduce((sum, order) => sum + order.amount, 0),
    },
  };
}

export function buildMockSalesSummary(orderCount: number, totalAmount: number): OrderSalesSummary {
  const courierCharge = Math.round(totalAmount * 0.055);
  const afterCourier = totalAmount - courierCharge;

  return {
    productTotal: totalAmount,
    shippingCollected: 0,
    orderTotalWithShipping: totalAmount,
    courierChargeApi: courierCharge,
    courierChargeOther: 0,
    totalCourierCharge: courierCharge,
    afterCourierCharge: afterCourier,
    purchaseAmount: 0,
    salesProfitLoss: afterCourier,
    otherExpense: 0,
    netIncome: afterCourier,
    orderCount,
  };
}

export function filterMockOrders(query: OrderListQuery): OrderListResponse {
  let items = getOrderStore().filter((order) => orderMatchesFilters(order, query));

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
