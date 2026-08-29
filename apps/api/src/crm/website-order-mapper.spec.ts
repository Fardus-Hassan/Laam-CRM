import { BadRequestException } from '@nestjs/common';

import { mapWooCommercePayload } from './website-order-mapper';

describe('mapWooCommercePayload', () => {
  it('maps WooCommerce order payload to canonical shape', () => {
    const canonical = mapWooCommercePayload({
      id: 1042,
      status: 'processing',
      shipping_total: '80.00',
      discount_total: '0',
      payment_method_title: 'Cash on delivery',
      billing: {
        first_name: 'Rahim',
        last_name: 'Uddin',
        phone: '01711112222',
        email: 'rahim@example.com',
        address_1: 'House 1',
        city: 'Dhaka',
        state: 'Dhaka',
      },
      shipping: {},
      line_items: [
        { name: 'Jafran', sku: 'JF-1', quantity: 2, subtotal: '1000', total: '1000' },
      ],
      meta_data: [{ key: 'utm_source', value: 'facebook' }],
    });

    expect(canonical.externalOrderId).toBe('1042');
    expect(canonical.customerPhone).toBe('01711112222');
    expect(canonical.customerName).toBe('Rahim Uddin');
    expect(canonical.lineItems[0]?.sku).toBe('JF-1');
    expect(canonical.utmSource).toBe('facebook');
    expect(canonical.deliveryCharge).toBe(80);
    expect(canonical.paymentMethod).toBe('cod');
  });

  it('normalizes Woo payment slug and Bangla COD title to CRM values', () => {
    expect(
      mapWooCommercePayload({
        id: 2,
        payment_method: 'cod',
        payment_method_title: 'ক্যাশ অন ডেলিভারি',
        billing: { first_name: 'A', phone: '01700000001', address_1: 'X' },
        shipping: {},
        line_items: [{ name: 'P', quantity: 1, subtotal: '10', total: '10' }],
      }).paymentMethod,
    ).toBe('cod');

    expect(
      mapWooCommercePayload({
        id: 3,
        payment_method: 'bkash',
        payment_method_title: 'bKash',
        billing: { first_name: 'A', phone: '01700000002', address_1: 'X' },
        shipping: {},
        line_items: [{ name: 'P', quantity: 1, subtotal: '10', total: '10' }],
      }).paymentMethod,
    ).toBe('bkash');
  });

  it('uses billing address when shipping fields are empty strings', () => {
    const canonical = mapWooCommercePayload({
      id: 55,
      customer_ip_address: '203.0.113.10',
      billing: {
        first_name: 'Aktarul',
        last_name: 'Naser',
        phone: '01713025848',
        address_1: 'c/o Abdul Karim, Companiganj, Noakhali',
        city: '',
        state: '',
      },
      shipping: {
        address_1: '',
        address_2: '',
        city: '',
        state: '',
        postcode: '',
        country: '',
      },
      line_items: [{ name: 'Honey', quantity: 1, subtotal: '980', total: '980' }],
    });

    expect(canonical.shippingAddress).toContain('Companiganj');
    expect(canonical.shippingAddress).not.toBe('Address not provided');
    expect(canonical.clientIp).toBe('203.0.113.10');
  });

  it('rejects WooCommerce payload without phone', () => {
    expect(() =>
      mapWooCommercePayload({
        id: 1,
        billing: { first_name: 'A' },
        line_items: [{ name: 'P', quantity: 1, subtotal: '10', total: '10' }],
      }),
    ).toThrow(BadRequestException);
  });
});
