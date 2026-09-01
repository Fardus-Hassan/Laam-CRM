import { createHash, randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const token = 'laam_wh_live_test_' + randomBytes(8).toString('hex');
const hash = createHash('sha256').update(token).digest('hex');
const phone = '01711998877';
const stamp = Date.now();

function wooBody(id, status, sku, name) {
  return {
    id,
    status,
    billing: { first_name: 'Karim', last_name: 'Live', phone, address_1: 'Dhaka Test' },
    shipping: {},
    line_items: [{ name, sku, quantity: 1, subtotal: '1460', total: '1460' }],
  };
}

async function post(body) {
  const res = await fetch('http://localhost:3333/api/crm/integrations/website-orders/woocommerce', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Laam-Ingest-Token': token,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function ensureIncomplete(organizationId) {
  const existing = await prisma.orgOrderStatus.findFirst({
    where: { organizationId, slug: 'incomplete' },
  });
  if (!existing) {
    await prisma.orgOrderStatus.create({
      data: {
        organizationId,
        slug: 'incomplete',
        label: 'Incomplete Orders',
        color: 'hsl(25 70% 48%)',
        group: 'intake',
        displayMode: 'sidebar',
        isSystem: true,
        isActive: true,
        allowedTransitions: ['confirmed', 'pending', 'processing', 'hold', 'cancelled'],
        bulkActions: [],
        showInGroupByStatus: true,
        sortOrder: 41,
      },
    });
    return;
  }
  if (!existing.allowedTransitions.includes('confirmed')) {
    await prisma.orgOrderStatus.update({
      where: { id: existing.id },
      data: { allowedTransitions: ['confirmed', ...existing.allowedTransitions] },
    });
  }
}

async function main() {
  const org = await prisma.organization.findFirst({
    where: { status: 'active' },
    orderBy: { createdAt: 'asc' },
  });
  if (!org) throw new Error('No organization found');

  await ensureIncomplete(org.id);

  const store = await prisma.websiteStore.create({
    data: {
      organizationId: org.id,
      name: 'Live Test Store',
      slug: 'live-test-' + stamp,
      platform: 'woocommerce',
      enabled: true,
      ingestTokenHash: hash,
    },
  });

  const id1 = Number(String(stamp).slice(-8) + '1');
  const id2 = id1 + 1;
  const id3 = id1 + 2;

  const r1 = await post(wooBody(id1, 'pending', 'HONEY', 'Honey'));
  const order1 = await prisma.order.findFirst({
    where: { organizationId: org.id, externalOrderId: String(id1) },
  });

  if (order1) {
    await prisma.order.update({ where: { id: order1.id }, data: { status: 'confirmed' } });
  }

  const r2 = await post(wooBody(id2, 'processing', 'HONEY', 'Honey'));
  const afterLink = order1
    ? await prisma.order.findUnique({ where: { id: order1.id } })
    : null;
  const dupPending = await prisma.order.findFirst({
    where: { organizationId: org.id, externalOrderId: String(id2) },
  });

  const r3 = await post(wooBody(id3, 'processing', 'SAFFRON', 'Saffron'));
  const saffron = await prisma.order.findFirst({
    where: { organizationId: org.id, externalOrderId: String(id3) },
  });

  const result = {
    ok: true,
    org: org.slug,
    step1_incomplete: {
      http: r1.status,
      body: r1.json,
      createdStatusBeforeConfirm: order1?.status,
      orderNumber: order1?.orderNumber,
      pass: (r1.status === 201 || r1.status === 200) && order1?.status === 'incomplete',
    },
    step2_confirm_then_submit: {
      http: r2.status,
      body: r2.json,
      linkedOrderStatus: afterLink?.status,
      linkedExternalId: afterLink?.externalOrderId,
      createdSeparateForSameCart: Boolean(dupPending && order1 && dupPending.id !== order1.id),
      pass:
        r2.json.action === 'linked' &&
        afterLink?.status === 'confirmed' &&
        afterLink?.externalOrderId === String(id2) &&
        !(dupPending && order1 && dupPending.id !== order1.id),
    },
    step3_different_cart: {
      http: r3.status,
      body: r3.json,
      status: saffron?.status,
      separateOrder: Boolean(saffron && order1 && saffron.id !== order1.id),
      pass: Boolean(saffron && order1 && saffron.id !== order1.id && saffron.status === 'pending'),
    },
  };

  result.allPass =
    Boolean(result.step1_incomplete.pass) &&
    Boolean(result.step2_confirm_then_submit.pass) &&
    Boolean(result.step3_different_cart.pass);

  // Cleanup best-effort
  const cleanupIds = [order1?.id, saffron?.id, dupPending?.id].filter(Boolean);
  for (const id of cleanupIds) {
    try {
      await prisma.orderLineItem.deleteMany({ where: { orderId: id } });
    } catch {}
    try {
      await prisma.order.delete({ where: { id } });
    } catch {}
  }
  try {
    await prisma.websiteStore.delete({ where: { id: store.id } });
  } catch {}
  result.cleaned = true;

  console.log(JSON.stringify(result, null, 2));
  if (!result.allPass) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error('LIVE_TEST_FAIL', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
