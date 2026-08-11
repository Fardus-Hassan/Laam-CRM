'use client';

import * as React from 'react';
import { BookOpen, CheckCircle2, Copy, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ORDER_CARD_CLASS,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { websiteIngestPaths } from '@/features/settings/api/website-settings-api';
import { cn } from '@/lib/utils';

type FieldDoc = {
  name: string;
  type: string;
  required: boolean;
  note: string;
};

const REQUEST_FIELDS: FieldDoc[] = [
  {
    name: 'externalOrderId',
    type: 'string',
    required: true,
    note: 'Your shop order id. Same id twice = no duplicate CRM order (idempotent).',
  },
  {
    name: 'customerName',
    type: 'string',
    required: true,
    note: 'Customer full name on the order.',
  },
  {
    name: 'customerPhone',
    type: 'string',
    required: true,
    note: 'Primary mobile (min 5 chars). Used for CRM customer match.',
  },
  {
    name: 'shippingAddress',
    type: 'string',
    required: true,
    note: 'Full delivery address.',
  },
  {
    name: 'lineItems',
    type: 'array',
    required: true,
    note: 'At least one line. SKU maps to CRM inventory when it matches a product variant.',
  },
  {
    name: 'customerEmail',
    type: 'string',
    required: false,
    note: 'Valid email, or omit / empty string.',
  },
  {
    name: 'altMobile',
    type: 'string',
    required: false,
    note: 'Alternate phone.',
  },
  {
    name: 'shippingArea',
    type: 'string',
    required: false,
    note: 'Area / thana label.',
  },
  {
    name: 'district',
    type: 'string',
    required: false,
    note: 'District name.',
  },
  {
    name: 'paymentMethod',
    type: 'string',
    required: false,
    note: 'e.g. cod, bkash, card.',
  },
  {
    name: 'paidAmount',
    type: 'number',
    required: false,
    note: 'Already paid amount (≥ 0).',
  },
  {
    name: 'deliveryCharge',
    type: 'number',
    required: false,
    note: 'Delivery charge (≥ 0).',
  },
  {
    name: 'discount',
    type: 'number',
    required: false,
    note: 'Order-level discount (≥ 0).',
  },
  {
    name: 'notes',
    type: 'string',
    required: false,
    note: 'Customer note / special instructions.',
  },
  {
    name: 'orderDate',
    type: 'string',
    required: false,
    note: 'ISO-8601 datetime if not “now” (e.g. 2026-08-11T10:30:00.000Z).',
  },
  {
    name: 'clientIp',
    type: 'string',
    required: false,
    note:
      'Shopper public IP (IPv4/IPv6). Prefer when your server posts on behalf of the browser. Stored on the CRM order and used for IP blocks. Invalid/unknown values are dropped; else CRM falls back to X-Forwarded-For / request IP.',
  },
  {
    name: 'utmSource',
    type: 'string',
    required: false,
    note: 'UTM source — traffic channel (e.g. facebook, google, instagram).',
  },
  {
    name: 'utmId',
    type: 'string',
    required: false,
    note: 'UTM id — ad or creative id / click identifier from your ads platform.',
  },
  {
    name: 'utmContent',
    type: 'string',
    required: false,
    note: 'UTM content — which ad variation / link / button was used.',
  },
  {
    name: 'utmCampaign',
    type: 'string',
    required: false,
    note: 'UTM campaign — campaign name (e.g. eid-sale, retargeting-q3).',
  },
];

const LINE_ITEM_FIELDS: FieldDoc[] = [
  {
    name: 'productName',
    type: 'string',
    required: true,
    note: 'Display name of the product.',
  },
  {
    name: 'quantity',
    type: 'integer',
    required: true,
    note: 'Positive count.',
  },
  {
    name: 'unitPrice',
    type: 'number',
    required: true,
    note: 'Unit price (≥ 0).',
  },
  {
    name: 'sku',
    type: 'string',
    required: false,
    note: 'Match CRM product variant SKU (case-insensitive).',
  },
  {
    name: 'variationLabel',
    type: 'string',
    required: false,
    note: 'e.g. “500g”, “Red / L”.',
  },
  {
    name: 'discount',
    type: 'number',
    required: false,
    note: 'Line discount (≥ 0).',
  },
];

const SAMPLE_REQUEST = {
  externalOrderId: 'WC-10482',
  customerName: 'Rahim Uddin',
  customerPhone: '01712345678',
  customerEmail: 'rahim@example.com',
  altMobile: '01812345678',
  shippingAddress: 'House 12, Road 4, Dhanmondi, Dhaka-1209',
  shippingArea: 'Dhanmondi',
  district: 'Dhaka',
  paymentMethod: 'cod',
  paidAmount: 0,
  deliveryCharge: 80,
  discount: 50,
  notes: 'Call before delivery',
  orderDate: '2026-08-11T10:30:00.000Z',
  clientIp: '103.148.72.44',
  utmSource: 'facebook',
  utmId: 'adset_92101',
  utmContent: 'video-a-v2',
  utmCampaign: 'eid-sale',
  lineItems: [
    {
      sku: 'HONEY-500',
      productName: 'Natural Honey 500g',
      variationLabel: '500g',
      quantity: 2,
      unitPrice: 650,
      discount: 0,
    },
    {
      sku: 'BOX-GIFT',
      productName: 'Gift Box',
      quantity: 1,
      unitPrice: 120,
    },
  ],
} as const;

const SAMPLE_SUCCESS = {
  ok: true,
  duplicate: false,
  orderId: 'clx…',
  orderNumber: 'ORD-2026-00123',
  unmatchedSkus: [] as string[],
  message: undefined as string | undefined,
};

function CodeBlock({
  title,
  language,
  code,
  copyLabel,
}: {
  title: string;
  language?: string;
  code: string;
  copyLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/80 bg-zinc-950 text-zinc-100 shadow-sm dark:bg-black/40">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-medium text-zinc-300">{title}</span>
          {language ? (
            <Badge
              variant="outline"
              className="border-white/15 bg-white/5 text-[10px] text-zinc-400"
            >
              {language}
            </Badge>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 shrink-0 text-zinc-300 hover:bg-white/10 hover:text-white"
          onClick={() => {
            void navigator.clipboard.writeText(code);
            toast.success(`${copyLabel} copied`);
          }}
        >
          <Copy className="size-3.5" />
          Copy
        </Button>
      </div>
      <pre className="max-h-[28rem] overflow-auto p-3 text-[11px] leading-relaxed tracking-tight">
        <code className="font-mono whitespace-pre text-zinc-100">{code}</code>
      </pre>
    </div>
  );
}

function FieldTable({ fields }: { fields: FieldDoc[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[32rem] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-semibold">Field</th>
            <th className="px-3 py-2 font-semibold">Type</th>
            <th className="px-3 py-2 font-semibold">Required</th>
            <th className="px-3 py-2 font-semibold">Description</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={field.name} className="border-b border-border/60 last:border-0">
              <td className="px-3 py-2 align-top font-mono text-[11px] font-medium text-foreground">
                {field.name}
              </td>
              <td className="px-3 py-2 align-top text-muted-foreground">{field.type}</td>
              <td className="px-3 py-2 align-top">
                {field.required ? (
                  <Badge variant="success" className="text-[10px]">
                    Required
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    Optional
                  </Badge>
                )}
              </td>
              <td className="px-3 py-2 align-top text-muted-foreground">{field.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type WebsiteIntegrationApiGuideProps = {
  className?: string;
};

export function WebsiteIntegrationApiGuide({ className }: WebsiteIntegrationApiGuideProps) {
  const paths = websiteIngestPaths();
  const apiBase = (
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api'
  ).replace(/\/+$/, '');

  const canonicalUrl = `${apiBase}${paths.canonical}`;
  const wooUrl = `${apiBase}${paths.woocommerce}`;
  const wooUrlWithToken = `${wooUrl}?token=YOUR_INGEST_TOKEN`;

  const sampleJson = JSON.stringify(SAMPLE_REQUEST, null, 2);
  const sampleResponseJson = JSON.stringify(SAMPLE_SUCCESS, null, 2);

  const curlExample = [
    `curl -X POST "${canonicalUrl}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -H "X-Laam-Ingest-Token: YOUR_INGEST_TOKEN" \\`,
    `  -d '${JSON.stringify(SAMPLE_REQUEST)}'`,
  ].join('\n');

  const steps = [
    {
      title: 'Create a store',
      body: 'Use “Add store” above. Pick WooCommerce or Custom, then Create & generate token.',
    },
    {
      title: 'Copy the ingest token',
      body: 'Shown only once. Store it in your shop config / env. Rotate anytime if leaked.',
    },
    {
      title: 'Call the API on new order',
      body: 'Custom site: POST the JSON body below. WooCommerce: use the webhook URL (or adapt your middleware).',
    },
    {
      title: 'Confirm in CRM',
      body: 'Orders land as source Website / E-commerce (pending). Unmatched SKUs still create the order with a note.',
    },
  ];

  return (
    <div className={cn('space-y-4', className)}>
      <Card className={ORDER_CARD_CLASS}>
        <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
          <div className="flex flex-wrap items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            <CardTitle className="text-sm">Integration guide</CardTitle>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Send new e-commerce orders into Laam CRM with a secure token. No JWT login on this
            endpoint — the ingest token identifies your store.
          </p>
        </CardHeader>
        <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-4')}>
          <ol className="grid gap-3 sm:grid-cols-2">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="flex gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-3"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card className={ORDER_CARD_CLASS}>
        <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
          <div className="flex flex-wrap items-center gap-2">
            <KeyRound className="size-4 text-primary" />
            <CardTitle className="text-sm">API endpoints & authentication</CardTitle>
          </div>
        </CardHeader>
        <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-4')}>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-2 rounded-lg border px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="text-[10px]">POST</Badge>
                <span className="text-sm font-medium">Custom site (canonical)</span>
              </div>
              <code className="block break-all rounded-md bg-muted px-2 py-1.5 font-mono text-[11px]">
                {canonicalUrl}
              </code>
              <p className="text-xs text-muted-foreground">
                Body must match the JSON schema below. Preferred for custom / headless shops.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(canonicalUrl);
                  toast.success('Endpoint copied');
                }}
              >
                <Copy className="size-3.5" />
                Copy endpoint
              </Button>
            </div>

            <div className="space-y-2 rounded-lg border px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="text-[10px]">POST</Badge>
                <span className="text-sm font-medium">WooCommerce webhook</span>
              </div>
              <code className="block break-all rounded-md bg-muted px-2 py-1.5 font-mono text-[11px]">
                {wooUrlWithToken}
              </code>
              <p className="text-xs text-muted-foreground">
                WooCommerce → Settings → Advanced → Webhooks → Add webhook. Topic:{' '}
                <strong className="font-medium text-foreground">Order created</strong>. Status:
                Active. Delivery URL = the URL above (replace token).
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(wooUrlWithToken);
                  toast.success('Woo URL template copied');
                }}
              >
                <Copy className="size-3.5" />
                Copy Woo URL template
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Auth (pick one)</p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>
                  Header <code className="rounded bg-muted px-1 font-mono text-[11px]">X-Laam-Ingest-Token: YOUR_INGEST_TOKEN</code>{' '}
                  (recommended for custom sites)
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>
                  Header <code className="rounded bg-muted px-1 font-mono text-[11px]">Authorization: Bearer YOUR_INGEST_TOKEN</code>
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>
                  Query <code className="rounded bg-muted px-1 font-mono text-[11px]">?token=YOUR_INGEST_TOKEN</code>{' '}
                  (WooCommerce webhook convenience; prefer headers in custom code)
                </span>
              </li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Content-Type: <code className="rounded bg-muted px-1 font-mono">application/json</code>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className={ORDER_CARD_CLASS}>
        <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
          <CardTitle className="text-sm">Request body (JSON) — custom site</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            This is the exact payload CRM expects on{' '}
            <code className="rounded bg-muted px-1 font-mono text-[11px]">POST {paths.canonical}</code>
            . Include <code className="rounded bg-muted px-1 font-mono text-[11px]">clientIp</code>{' '}
            (shopper IP) and all UTM fields when available. WooCommerce sends its own JSON; CRM maps
            it into this shape automatically.
          </p>
        </CardHeader>
        <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-4')}>
          <CodeBlock
            title="Sample request body"
            language="JSON"
            code={sampleJson}
            copyLabel="JSON body"
          />

          <div className="space-y-2">
            <p className="text-sm font-medium">Root fields</p>
            <FieldTable fields={REQUEST_FIELDS} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">lineItems[] fields</p>
            <FieldTable fields={LINE_ITEM_FIELDS} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Success response</p>
            <CodeBlock
              title="200 response"
              language="JSON"
              code={sampleResponseJson}
              copyLabel="Response sample"
            />
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>
                <code className="rounded bg-muted px-1 font-mono">duplicate: true</code> — same{' '}
                <code className="rounded bg-muted px-1 font-mono">externalOrderId</code> already
                ingested; CRM order is not created again.
              </li>
              <li>
                <code className="rounded bg-muted px-1 font-mono">unmatchedSkus</code> — SKUs not
                found in inventory; order is still created, name/price from payload used.
              </li>
              <li>
                <strong className="text-foreground">400 blocked</strong> — customer mobile or
                shopper IP is on the org blocklist. CRM still queues the payload under{' '}
                <strong className="text-foreground">Failed Orders</strong> (type blocked) so ops
                can review after unblocking. Shop should show a clear “order not accepted” message.
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">cURL example</p>
            <CodeBlock title="Terminal" language="bash" code={curlExample} copyLabel="cURL" />
          </div>
        </CardContent>
      </Card>

      <Card className={ORDER_CARD_CLASS}>
        <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
          <CardTitle className="text-sm">WooCommerce checklist</CardTitle>
        </CardHeader>
        <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-2 text-sm')}>
          <ol className="list-decimal space-y-2 pl-4 text-xs text-muted-foreground">
            <li>
              In CRM: create a store with platform <strong className="text-foreground">WooCommerce</strong>,
              copy the <strong className="text-foreground">ingest token</strong> and the{' '}
              <strong className="text-foreground">webhook secret</strong> (both shown once).
            </li>
            <li>
              In WordPress: WooCommerce → Settings → Advanced → Webhooks →{' '}
              <strong className="text-foreground">Add webhook</strong>.
            </li>
            <li>
              Name: e.g. “Laam CRM”. Status: <strong className="text-foreground">Active</strong>.
              Topic: <strong className="text-foreground">Order created</strong>.
            </li>
            <li>
              Delivery URL:{' '}
              <code className="break-all rounded bg-muted px-1 font-mono text-[11px] text-foreground">
                {wooUrlWithToken}
              </code>
            </li>
            <li>
              <strong className="text-foreground">Secret</strong>: paste the CRM webhook secret
              (required for HMAC). Woo signs the body; CRM verifies{' '}
              <code className="rounded bg-muted px-1 font-mono text-[11px]">
                X-WC-Webhook-Signature
              </code>
              .
            </li>
            <li>
              API version: <strong className="text-foreground">WP REST API Integration v3</strong>{' '}
              (default). Save, place a test order, then check CRM Orders.
            </li>
          </ol>
          <p className="text-xs text-muted-foreground">
            Production: use HTTPS API URL; set{' '}
            <code className="rounded bg-muted px-1 font-mono">NEXT_PUBLIC_API_URL</code> so this
            page shows the public delivery URL. Prefer header token over query when possible;
            query <code className="rounded bg-muted px-1 font-mono">?token=</code> is only for
            Woo delivery convenience.
          </p>
        </CardContent>
      </Card>

      <Card className={ORDER_CARD_CLASS}>
        <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
          <CardTitle className="text-sm">Security & production limits</CardTitle>
        </CardHeader>
        <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-2 text-xs text-muted-foreground')}>
          <ul className="list-disc space-y-1.5 pl-4">
            <li>
              <strong className="text-foreground">Auth:</strong> every ingest call needs the store
              ingest token (header preferred). Tokens are stored hashed; plaintext shown once.
            </li>
            <li>
              <strong className="text-foreground">Woo HMAC:</strong> when a webhook secret is set
              (auto on new Woo stores), CRM rejects unsigned/invalid webhooks.
            </li>
            <li>
              <strong className="text-foreground">Rate limits:</strong> ~120 requests/min per token
              and ~60/min per client IP. Over limit → HTTP 429.
            </li>
            <li>
              <strong className="text-foreground">Body size:</strong> JSON capped (~512kb) for
              abuse protection.
            </li>
            <li>
              <strong className="text-foreground">clientIp:</strong> shopper IP for blocklist/fraud;
              send from your trusted backend. Invalid values are dropped.
            </li>
            <li>
              <strong className="text-foreground">Idempotency:</strong> same{' '}
              <code className="rounded bg-muted px-1 font-mono">externalOrderId</code> returns{' '}
              <code className="rounded bg-muted px-1 font-mono">duplicate: true</code> (safe retry).
            </li>
            <li>
              Behind a reverse proxy, set{' '}
              <code className="rounded bg-muted px-1 font-mono">TRUST_PROXY=1</code> so rate limit
              and IP capture use the real client.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
