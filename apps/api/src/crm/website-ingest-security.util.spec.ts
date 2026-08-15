import { computeWooWebhookSignature, verifyWooWebhookSignature } from './website-ingest-security.util';
import { SlidingWindowRateLimiter } from './website-ingest-rate-limit';

describe('verifyWooWebhookSignature', () => {
  const secret = 'super-secret-woo';
  const body = Buffer.from(JSON.stringify({ id: 99, billing: { phone: '017' } }), 'utf8');

  it('accepts a valid base64 HMAC signature', () => {
    const sig = computeWooWebhookSignature(body, secret);
    expect(() =>
      verifyWooWebhookSignature({
        rawBody: body,
        signatureHeader: sig,
        secret,
      }),
    ).not.toThrow();
  });

  it('rejects missing or wrong signature', () => {
    expect(() =>
      verifyWooWebhookSignature({
        rawBody: body,
        signatureHeader: undefined,
        secret,
      }),
    ).toThrow(/Missing X-WC-Webhook-Signature/);

    expect(() =>
      verifyWooWebhookSignature({
        rawBody: body,
        signatureHeader: 'aaaa',
        secret,
      }),
    ).toThrow(/Invalid WooCommerce webhook signature/);
  });
});

describe('SlidingWindowRateLimiter', () => {
  it('allows up to limit then blocks', () => {
    const lim = new SlidingWindowRateLimiter(3, 10_000);
    const t0 = 1_000_000;
    expect(lim.check('a', t0).allowed).toBe(true);
    expect(lim.check('a', t0 + 1).allowed).toBe(true);
    expect(lim.check('a', t0 + 2).allowed).toBe(true);
    const blocked = lim.check('a', t0 + 3);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(1);
    }
    // other key independent
    expect(lim.check('b', t0 + 3).allowed).toBe(true);
  });
});
