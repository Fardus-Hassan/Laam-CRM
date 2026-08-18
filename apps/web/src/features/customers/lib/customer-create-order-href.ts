/** Create Order URL when starting from a customer record (list Order button or details). */
export function customerCreateOrderHref(phone: string): string {
  const params = new URLSearchParams({
    phone,
    from: 'customer',
  });
  return `/dashboard/orders/new?${params.toString()}`;
}
