import {
  cartFingerprint,
  normalizePhoneDigits,
  pickLinkCandidate,
  resolveLinkedStatus,
} from './website-order-ingest-match.util';

describe('website-order-ingest-match.util', () => {
  it('normalizes phone to digits', () => {
    expect(normalizePhoneDigits('+880 1711-112222')).toBe('8801711112222');
  });

  it('builds stable cart fingerprints', () => {
    expect(
      cartFingerprint([
        { sku: 'B', quantity: 1, productName: 'Bee' },
        { sku: 'A', quantity: 2, productName: 'Apple' },
      ]),
    ).toBe(
      cartFingerprint([
        { sku: 'A', quantity: 2, productName: 'Apple' },
        { sku: 'B', quantity: 1, productName: 'Bee' },
      ]),
    );
  });

  it('promotes incomplete → pending on Woo processing submit', () => {
    expect(
      resolveLinkedStatus({ existingStatus: 'incomplete', incomingStatus: 'pending' }),
    ).toEqual({ nextStatus: 'pending', reason: 'incomplete_to_pending' });
  });

  it('keeps confirmed when customer submits later (no double call)', () => {
    expect(
      resolveLinkedStatus({ existingStatus: 'confirmed', incomingStatus: 'pending' }),
    ).toEqual({ nextStatus: null, reason: 'keep_ops_status' });
  });

  it('blocks auto-link after courier', () => {
    expect(
      resolveLinkedStatus({ existingStatus: 'in_courier', incomingStatus: 'pending' }),
    ).toEqual({ nextStatus: null, reason: 'blocked_post_shipment' });
  });

  it('picks newest same-cart candidate inside window', () => {
    const now = new Date('2026-09-01T12:10:00Z');
    const match = pickLinkCandidate({
      now,
      windowMs: 60 * 60_000,
      incomingCart: cartFingerprint([{ sku: 'HONEY', quantity: 1, productName: 'Honey' }]),
      candidates: [
        {
          id: 'old',
          orderNumber: 'A-1',
          status: 'incomplete',
          externalOrderId: '100',
          notes: null,
          createdAt: new Date('2026-09-01T10:00:00Z'),
          lineItems: [{ sku: 'HONEY', productName: 'Honey', quantity: 1 }],
        },
        {
          id: 'new',
          orderNumber: 'A-2',
          status: 'confirmed',
          externalOrderId: '133',
          notes: null,
          createdAt: new Date('2026-09-01T12:05:00Z'),
          lineItems: [{ sku: 'HONEY', productName: 'Honey', quantity: 1 }],
        },
      ],
    });
    expect(match?.id).toBe('new');
  });

  it('skips different cart', () => {
    const match = pickLinkCandidate({
      windowMs: 60 * 60_000,
      incomingCart: cartFingerprint([{ sku: 'SAFFRON', quantity: 1, productName: 'Saffron' }]),
      candidates: [
        {
          id: 'honey',
          orderNumber: 'A-1',
          status: 'incomplete',
          externalOrderId: '133',
          notes: null,
          createdAt: new Date(),
          lineItems: [{ sku: 'HONEY', productName: 'Honey', quantity: 1 }],
        },
      ],
    });
    expect(match).toBeNull();
  });
});
