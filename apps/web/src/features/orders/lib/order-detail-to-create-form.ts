import type { OrderDetail } from '@laam/types';

import type { CreateOrderFormState } from '@/features/orders/lib/create-order-types';

/** Map a saved order into create-order form state for live editing on the detail page. */
export function orderDetailToCreateFormPatch(
  order: OrderDetail,
): Partial<CreateOrderFormState> {
  const pathaoLocation =
    order.pathaoCity && order.pathaoZone
      ? {
          cityId: order.pathaoCityId ?? 0,
          zoneId: order.pathaoZoneId ?? 0,
          areaId: order.pathaoAreaId ?? 0,
          city: order.pathaoCity,
          zone: order.pathaoZone,
          area: order.pathaoArea ?? '',
          label: [order.pathaoCity, order.pathaoZone, order.pathaoArea]
            .filter(Boolean)
            .join(' › '),
        }
      : null;

  const carrybeeLocation =
    order.carrybeeCity && order.carrybeeZone
      ? {
          cityId: order.carrybeeCityId ?? 0,
          zoneId: order.carrybeeZoneId ?? 0,
          areaId: order.carrybeeAreaId ?? undefined,
          city: order.carrybeeCity,
          zone: order.carrybeeZone,
          area: order.carrybeeArea ?? undefined,
          label: [order.carrybeeCity, order.carrybeeZone, order.carrybeeArea]
            .filter(Boolean)
            .join(' › '),
        }
      : null;

  const attachments = (order.attachments ?? []).map((a) => ({
    name: a.name,
    url: a.url,
  }));

  return {
    mobile: order.customerPhone ?? '',
    altMobile: order.altMobile ?? '',
    name: order.customerName ?? '',
    email: order.customerEmail ?? '',
    address: order.shippingAddress ?? '',
    customerNote: order.customerNote ?? '',
    district: order.district ?? '',
    pathaoLocation,
    carrybeeLocation,
    orderSource: order.source ?? '',
    orderTag: order.orderTag ?? '',
    customerTag: order.customerTag ?? '',
    lineItems: order.lineItems.map((line) => ({
      id: line.id,
      productId: line.productId ?? '',
      productName: line.productName,
      variationId: line.variantId ?? '',
      variationLabel: line.variationLabel ?? '',
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      discount: line.discount ?? 0,
      subtotal: line.lineTotal,
    })),
    orderStatus: order.status,
    paymentMethod: order.paymentMethod ?? 'cod',
    attachments,
    courierNote: order.courierNote ?? '',
    packingNote: order.packingNote ?? '',
    orderNote: order.notes ?? '',
    orderDate: order.createdAt ? new Date(order.createdAt) : new Date(),
    referenceNo: order.referenceNo ?? '',
    discountMode: 'amount',
    discountValue: order.discount ?? 0,
    shipping: order.deliveryCharge ?? 0,
    advancePayment: order.paidAmount ?? 0,
    couponCode: order.couponCode ?? '',
    couponApplied: Boolean(order.couponCode),
    couponDiscountAmount: 0,
    skipFollowup: order.skipFollowup ?? false,
    utmSource: order.utmSource ?? '',
    utmId: order.utmId ?? '',
    utmContent: order.utmContent ?? '',
    utmCampaign: order.utmCampaign ?? '',
    courierWeightKg:
      order.courierWeightKg != null && order.courierWeightKg > 0
        ? String(order.courierWeightKg)
        : '',
    courierDeliveryType: order.courierDeliveryType ?? 'normal',
  };
}
