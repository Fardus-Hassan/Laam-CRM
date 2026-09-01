/**
 * Manual / CI-friendly simulation of Karim Incomplete → Confirm → Woo submit link rules.
 * Run: pnpm exec nx test api --testPathPatterns=website-order --skip-nx-cache
 * (covered by unit specs). This file documents the ops path for reviewers.
 */
import {
  mapWooCommercePayload,
  normalizeWooOrderStatus,
} from './website-order-mapper';
import {
  cartFingerprintFromIngestLines,
  pickLinkCandidate,
  resolveLinkedStatus,
} from './website-order-ingest-match.util';

describe('Karim real-flow simulation (Woo → CRM)', () => {
  const honeyLines = [{ name: 'Honey', sku: 'HONEY', quantity: 1, subtotal: '1460', total: '1460' }];

  it('step1: pending payment maps to incomplete', () => {
    const a = mapWooCommercePayload({
      id: 133,
      status: 'pending',
      billing: { first_name: 'Karim', phone: '01711112222', address_1: 'Dhaka' },
      shipping: {},
      line_items: honeyLines,
    });
    expect(a.status).toBe('incomplete');
    expect(normalizeWooOrderStatus('pending')).toBe('incomplete');
  });

  it('step2: after team confirm, Woo processing keeps confirmed (no new pending)', () => {
    const decision = resolveLinkedStatus({
      existingStatus: 'confirmed',
      incomingStatus: 'pending',
    });
    expect(decision.nextStatus).toBeNull();
    expect(decision.reason).toBe('keep_ops_status');
  });

  it('step3: incomplete + processing promotes to pending when no team confirm yet', () => {
    const decision = resolveLinkedStatus({
      existingStatus: 'incomplete',
      incomingStatus: normalizeWooOrderStatus('processing'),
    });
    expect(decision).toEqual({ nextStatus: 'pending', reason: 'incomplete_to_pending' });
  });

  it('step4: same cart within window links; different cart does not', () => {
    const processing = mapWooCommercePayload({
      id: 134,
      status: 'processing',
      billing: { first_name: 'Karim', phone: '01711112222', address_1: 'Dhaka' },
      shipping: {},
      line_items: honeyLines,
    });
    const cart = cartFingerprintFromIngestLines(processing.lineItems);
    const same = pickLinkCandidate({
      windowMs: 60 * 60_000,
      incomingCart: cart,
      candidates: [
        {
          id: 'crm-1',
          orderNumber: 'ORD-1',
          status: 'confirmed',
          externalOrderId: '133',
          notes: null,
          createdAt: new Date(),
          lineItems: [{ sku: 'HONEY', productName: 'Honey', quantity: 1 }],
        },
      ],
    });
    expect(same?.id).toBe('crm-1');

    const different = pickLinkCandidate({
      windowMs: 60 * 60_000,
      incomingCart: cart,
      candidates: [
        {
          id: 'crm-2',
          orderNumber: 'ORD-2',
          status: 'incomplete',
          externalOrderId: '200',
          notes: null,
          createdAt: new Date(),
          lineItems: [{ sku: 'SAFFRON', productName: 'Saffron', quantity: 1 }],
        },
      ],
    });
    expect(different).toBeNull();
  });
});
