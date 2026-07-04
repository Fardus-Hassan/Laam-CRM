/**
 * Mock domain events — single operational story for COD spine.
 * UI and import must go through order/customer/inventory APIs that call these.
 * Backend will replace this with real event handlers; contracts stay the same.
 */

import type { CreateOrderPayload, OrderDetail, OrderStatusType } from '@laam/types';

import {
  createMockIncome,
  ensureReceivableForOrder,
  markReceivableCollectedByOrderNumber,
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
/** Sales revenue + COGS already recognized (usually on deliver). */
const revenuePosted = new Set<string>();
/** Cash collected (prepaid or COD settlement). */
const cashSettled = new Set<string>();

function isCodPayment(order: OrderDetail): boolean {
  return order.paymentStatus === 'cod';
}

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
    decreaseStockForOrderLines(
      order.lineItems.map((l) => ({ ...l, quantity: -l.quantity })),
    );
    stockApplied.delete(order.id);
  }

  // COD-first: recognize sales + COGS on deliver (even when still COD).
  if (nextStatus === 'delivered' || nextStatus === 'completed') {
    if (!revenuePosted.has(order.id)) {
      postOrderRevenue(order);
    }
    if (isCodPayment(order)) {
      ensureReceivableForOrder({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        amount: order.amount,
      });
    } else if (order.paymentStatus === 'paid' || order.paymentStatus === 'partial') {
      markReceivableCollectedByOrderNumber(order.orderNumber);
      cashSettled.add(order.id);
    }
  }

  runAutomationsForOrderStatus(order, nextStatus);
}

/** Run enabled automation rules for a status transition. */
export function runAutomationsForOrderStatus(
  order: OrderDetail,
  nextStatus: OrderStatusType,
): void {
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
      if (rule.action === 'sms') {
        console.info(`[automation] SMS queued for ${order.orderNumber}: ${rule.actionLabel}`);
      }
    }
  });
}

export function onCourierSubmitted(orderIds: string[], provider: string): void {
  markOrdersSubmittedToCourier(orderIds, provider);
}

/**
 * Cash collected — prepaid pay or COD settlement from courier.
 * If revenue already posted on deliver (COD), only records cash settle + clears AR.
 */
export function onOrderPaid(order: OrderDetail): void {
  const revenueAlreadyPosted = revenuePosted.has(order.id);

  if (!revenueAlreadyPosted) {
    // Prepaid / paid before deliver — recognize sales once, cash already in
    postOrderRevenue(order);
    cashSettled.add(order.id);
    markReceivableCollectedByOrderNumber(order.orderNumber);
    return;
  }

  // COD path: sales already on deliver — settlement is cash collection only
  if (!cashSettled.has(order.id)) {
    createMockIncome({
      date: new Date().toISOString().slice(0, 10),
      category: 'cod_collection',
      description: `COD settled — ${order.orderNumber} (${order.customerName})`,
      amount: order.amount,
      paymentMethod: 'cash',
      accountName: 'Cash Register',
      relatedOrderId: order.id,
      reference: order.orderNumber,
    });
    cashSettled.add(order.id);
  }

  markReceivableCollectedByOrderNumber(order.orderNumber);
}

function postOrderRevenue(order: OrderDetail): void {
  if (revenuePosted.has(order.id)) return;

  const isCod = isCodPayment(order);
  createMockIncome({
    date: new Date().toISOString().slice(0, 10),
    category: 'order_sales',
    description: `Order ${order.orderNumber} — ${order.customerName}${isCod ? ' (COD delivered)' : ''}`,
    amount: order.amount,
    paymentMethod: isCod ? 'cod' : 'bkash',
    accountName: isCod ? 'Accounts Receivable' : 'bKash Business',
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

  revenuePosted.add(order.id);
}
