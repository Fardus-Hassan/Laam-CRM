/**
 * Mock domain events — single operational story for COD spine.
 * UI and import must go through order/customer/inventory APIs that call these.
 * Backend will replace this with real event handlers; contracts stay the same.
 */

import type { CreateOrderPayload, OrderDetail, OrderStatusType } from '@laam/types';

import {
  createMockIncome,
  markReceivableCollected,
  MOCK_RECEIVABLES,
  postInventoryCogs,
} from '@/features/accounting/data/mock-accounting';
import { MOCK_INVENTORY_PRODUCTS } from '@/features/inventory/data/mock-inventory';
import { upsertMockCustomerFromOrder } from '@/features/customers/data/mock-customers';
import { recordCouponUsage } from '@/features/coupons/data/mock-coupons';
import { createMockFollowupFromOrder } from '@/features/followups/data/mock-followups';
import { decreaseStockForOrderLines } from '@/features/inventory/data/mock-inventory';
import {
  markOrdersSubmittedToCourier,
  queueOrderForCourier,
} from '@/features/courier/data/mock-courier';

const stockApplied = new Set<string>();
const moneyPosted = new Set<string>();

export function onOrderCreated(order: OrderDetail, payload: CreateOrderPayload): void {
  upsertMockCustomerFromOrder({
    name: order.customerName,
    phone: order.customerPhone,
    email: order.customerEmail,
    address: order.shippingAddress,
    district: order.shippingArea,
    amount: order.amount,
    productNames: order.lineItems.map((l) => l.productName),
    agentName: order.assignedAgentName,
  });

  if (payload.couponCode) {
    recordCouponUsage(payload.couponCode);
  }

  // Reserve stock on create for non-cancelled orders
  if (order.status !== 'cancelled' && !stockApplied.has(order.id)) {
    decreaseStockForOrderLines(order.lineItems);
    stockApplied.add(order.id);
  }

  if (!payload.skipFollowup && order.status === 'pending') {
    createMockFollowupFromOrder({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      phone: order.customerPhone,
      address: order.shippingAddress,
      district: order.shippingArea,
      agentName: order.assignedAgentName,
      products: order.lineItems.map((l) => l.productName),
    });
  }
}

export function onOrderStatusChanged(
  order: OrderDetail,
  previousStatus: OrderStatusType,
  nextStatus: OrderStatusType,
): void {
  if (previousStatus === nextStatus) return;

  if (
    (nextStatus === 'confirmed' || nextStatus === 'processing' || nextStatus === 'in_courier') &&
    !stockApplied.has(order.id)
  ) {
    decreaseStockForOrderLines(order.lineItems);
    stockApplied.add(order.id);
  }

  if (nextStatus === 'confirmed' || nextStatus === 'processing') {
    queueOrderForCourier({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      district: order.shippingArea,
      amountBdt: order.amount,
      status: 'ready',
    });
  }

  if (nextStatus === 'cancelled' && stockApplied.has(order.id)) {
    // Restock on cancel
    decreaseStockForOrderLines(
      order.lineItems.map((l) => ({ ...l, quantity: -l.quantity })),
    );
    stockApplied.delete(order.id);
  }

  if (
    (nextStatus === 'delivered' || nextStatus === 'completed') &&
    (order.paymentStatus === 'paid' || order.paymentStatus === 'partial') &&
    !moneyPosted.has(order.id)
  ) {
    postOrderIncome(order);
  }

  if (nextStatus === 'delivered' || nextStatus === 'completed') {
    const ar = MOCK_RECEIVABLES.find((r) => r.orderNumber === order.orderNumber);
    if (ar && ar.status !== 'collected') {
      markReceivableCollected(ar.id);
    }
  }

  runAutomationsForOrderStatus(order, nextStatus);
}

/** Run enabled automation rules for a status transition. */
export function runAutomationsForOrderStatus(
  order: OrderDetail,
  nextStatus: OrderStatusType,
): void {
  // Dynamic import avoids circular deps at module init
  void import('@/features/automations/data/mock-automations').then(({ getEnabledRulesForStatus }) => {
    const rules = getEnabledRulesForStatus(nextStatus);
    for (const rule of rules) {
      if (rule.action === 'followup') {
        createMockFollowupFromOrder({
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          phone: order.customerPhone,
          address: order.shippingAddress,
          district: order.shippingArea,
          agentName: order.assignedAgentName,
          products: order.lineItems.map((l) => l.productName),
        });
      }
      if (rule.action === 'courier') {
        queueOrderForCourier({
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          district: order.shippingArea,
          amountBdt: order.amount,
          status: 'ready',
        });
      }
      // sms / assign: recorded on order timeline via update path when available
      if (rule.action === 'sms') {
        // Timeline note is applied in updateMockOrder callers; log for mock audit
        console.info(`[automation] SMS queued for ${order.orderNumber}: ${rule.actionLabel}`);
      }
    }
  });
}

/** Call after orders are set to in_courier via updateMockOrder. */
export function onCourierSubmitted(orderIds: string[], provider: string): void {
  markOrdersSubmittedToCourier(orderIds, provider);
}

export function onOrderPaid(order: OrderDetail): void {
  if (moneyPosted.has(order.id)) return;
  postOrderIncome(order);
  const ar = MOCK_RECEIVABLES.find((r) => r.orderNumber === order.orderNumber);
  if (ar) markReceivableCollected(ar.id);
}

function postOrderIncome(order: OrderDetail): void {
  createMockIncome({
    date: new Date().toISOString().slice(0, 10),
    category: 'order_sales',
    description: `Order ${order.orderNumber} — ${order.customerName}`,
    amount: order.amount,
    paymentMethod: order.paymentStatus === 'cod' ? 'cash' : 'bkash',
    accountName: order.paymentStatus === 'cod' ? 'Cash Register' : 'bKash Business',
    relatedOrderId: order.id,
    reference: order.orderNumber,
  });

  const cogs = order.lineItems.reduce((sum, line) => {
    const product = MOCK_INVENTORY_PRODUCTS.find(
      (p) =>
        p.name.toLowerCase() === line.productName.toLowerCase() ||
        (line.sku && p.sku?.toLowerCase() === line.sku.toLowerCase()),
    );
    const unitCost = product?.costPrice ?? line.unitPrice * 0.55;
    return sum + unitCost * line.quantity;
  }, 0);

  if (cogs > 0) {
    postInventoryCogs({
      amount: Math.round(cogs),
      orderNumber: order.orderNumber,
      orderId: order.id,
      description: `COGS — ${order.orderNumber} (${order.lineItems.length} lines)`,
    });
  }

  moneyPosted.add(order.id);
}
