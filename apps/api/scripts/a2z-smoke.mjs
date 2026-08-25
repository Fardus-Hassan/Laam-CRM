/**
 * A–Z COO readiness smoke (API). Report-only — does not "fix" product bugs.
 * Usage: node apps/api/scripts/a2z-smoke.mjs
 */
const API = process.env.E2E_API_URL ?? 'http://localhost:3333/api';
const EMAIL = process.env.E2E_USER_EMAIL ?? 'e2e.admin@laam.test';
const PASSWORD = process.env.E2E_USER_PASSWORD ?? 'e2e.admin2026';
const DEVICE_ID = process.env.E2E_DEVICE_ID ?? 'e2e-device';
const TENANT = process.env.E2E_TENANT_SLUG ?? 'laam';
const STAMP = Date.now();

const results = [];

function ok(name, detail = '') {
  results.push({ name, status: 'PASS', detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail) {
  results.push({ name, status: 'FAIL', detail: String(detail) });
  console.log(`FAIL  ${name} — ${detail}`);
}
function skip(name, detail) {
  results.push({ name, status: 'SKIP', detail: String(detail) });
  console.log(`SKIP  ${name} — ${detail}`);
}

async function req(method, path, { token, body, headers } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-tenant-slug': TENANT,
      Host: `${TENANT}.localhost`,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json, text };
}

async function main() {
  console.log(`\n=== A–Z API smoke @ ${API} tenant=${TENANT} ===\n`);

  // 1) Health
  {
    const r = await req('GET', '/health');
    if (r.status === 200 && r.json?.status === 'ok') ok('API health');
    else fail('API health', `${r.status} ${r.text.slice(0, 120)}`);
  }

  // 2) Login
  let token = '';
  let me = null;
  {
    const r = await req('POST', '/auth/login', {
      body: { email: EMAIL, password: PASSWORD, deviceId: DEVICE_ID },
    });
    if (r.status === 200 || r.status === 201) {
      if (r.json?.accessToken || r.json?.token) {
        token = r.json.accessToken ?? r.json.token;
        me = r.json.user ?? r.json.session?.user ?? null;
        ok('Login', EMAIL);
      } else if (r.json?.requiresDeviceOtp) {
        fail('Login', 'requires device OTP (trusted device missing)');
      } else {
        // nested shapes
        token = r.json?.data?.accessToken ?? r.json?.access_token ?? '';
        if (token) ok('Login', EMAIL);
        else fail('Login', JSON.stringify(r.json).slice(0, 200));
      }
    } else {
      fail('Login', `${r.status} ${r.text.slice(0, 200)}`);
    }
  }
  if (!token) {
    console.log('\nAborting — no auth token\n');
    printSummary();
    process.exit(1);
  }

  // Session
  {
    const r = await req('GET', '/auth/me', { token });
    if (r.status === 200) {
      me = r.json?.user ?? r.json;
      ok('Session /auth/me', me?.email ?? me?.organization?.slug ?? '');
    } else {
      // try alternate
      const r2 = await req('GET', '/auth/session', { token });
      if (r2.status === 200) ok('Session', 'via /auth/session');
      else fail('Session', `${r.status}/${r2.status}`);
    }
  }

  // 3) Products list + create
  let productId = null;
  {
    const list = await req('GET', '/crm/inventory/products?page=1&pageSize=5', { token });
    if (list.status === 200) ok('Products list', `items=${list.json?.items?.length ?? list.json?.length ?? '?'}`);
    else fail('Products list', `${list.status} ${list.text.slice(0, 160)}`);

    const sku = `A2Z-${STAMP}`;
    const create = await req('POST', '/crm/inventory/products', {
      token,
      body: {
        name: `A2Z Product ${STAMP}`,
        sku,
        status: 'active',
        reorderLevel: 1,
        variants: [
          {
            label: 'Default',
            sku: `${sku}-D`,
            salePrice: 500,
            costPrice: 200,
          },
        ],
      },
    });
    if (create.status === 200 || create.status === 201) {
      productId = create.json?.id;
      ok('Product create', sku);
    } else {
      fail('Product create', `${create.status} ${create.text.slice(0, 220)}`);
    }
  }

  // 4) Users list + invite/create
  let newUserId = null;
  {
    const list = await req('GET', '/crm/users', { token });
    if (list.status === 200) ok('Users list', `n=${list.json?.items?.length ?? list.json?.length ?? '?'}`);
    else fail('Users list', `${list.status}`);

    const email = `a2z.agent.${STAMP}@laam.test`;
    const create = await req('POST', '/crm/users', {
      token,
      body: {
        name: `A2Z Agent ${STAMP}`,
        email,
        systemRole: 'sales_rep',
      },
    });
    if (create.status === 200 || create.status === 201) {
      newUserId = create.json?.id;
      ok('User create', email);
    } else {
      fail('User create', `${create.status} ${create.text.slice(0, 220)}`);
    }
  }

  // 5) Team create
  let teamId = null;
  {
    const list = await req('GET', '/crm/teams', { token });
    if (list.status === 200) ok('Teams list');
    else fail('Teams list', `${list.status}`);

    // leader = self from session / users
    let leaderId = me?.id;
    if (!leaderId) {
      const users = await req('GET', '/crm/users', { token });
      const items = users.json?.items ?? users.json ?? [];
      leaderId = Array.isArray(items) ? items[0]?.id : null;
    }
    if (!leaderId) {
      skip('Team create', 'no leader user id');
    } else {
      const create = await req('POST', '/crm/teams', {
        token,
        body: {
          name: `A2Z Team ${STAMP}`,
          leaderUserId: leaderId,
          memberUserIds: newUserId ? [newUserId] : [],
        },
      });
      if (create.status === 200 || create.status === 201) {
        teamId = create.json?.id;
        ok('Team create', create.json?.name ?? teamId);
      } else {
        fail('Team create', `${create.status} ${create.text.slice(0, 220)}`);
      }
    }
  }

  // 6) Order statuses / queues
  {
    const st = await req('GET', '/crm/settings/order-statuses', { token });
    if (st.status === 200) {
      const rows = Array.isArray(st.json) ? st.json : st.json?.items ?? [];
      const hasHold = rows.some((s) => s.slug === 'hold');
      const hasHoldFu = rows.some((s) => s.slug === 'hold_followup');
      ok(
        'Order statuses',
        `n=${rows.length} hold=${hasHold} hold_followup=${hasHoldFu}`,
      );
      if (!hasHold || !hasHoldFu) fail('Hold statuses present', `hold=${hasHold} hold_followup=${hasHoldFu}`);
    } else fail('Order statuses', `${st.status}`);
  }

  // 7) Create Hold order (needs product line if required)
  let orderId = null;
  let orderNumber = null;
  {
    // pick any product if create failed
    if (!productId) {
      const list = await req('GET', '/crm/inventory/products?page=1&pageSize=1', { token });
      productId = list.json?.items?.[0]?.id ?? list.json?.[0]?.id ?? null;
    }

    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const followUpDate = tomorrow.toISOString().slice(0, 10);

    const body = {
      customerName: `A2Z Hold ${STAMP}`,
      customerPhone: `017${String(STAMP).slice(-8)}`,
      shippingAddress: 'A2Z test address, Dhaka',
      district: 'Dhaka',
      shippingArea: 'Dhaka',
      source: 'call',
      status: 'hold',
      followUpDate,
      paymentMethod: 'cod',
      lineItems: [
        {
          productName: 'A2Z Smoke Line',
          productId: productId || undefined,
          quantity: 1,
          unitPrice: 500,
        },
      ],
    };

    const create = await req('POST', '/crm/orders', { token, body });
    if (create.status === 200 || create.status === 201) {
      orderId = create.json?.id;
      orderNumber = create.json?.orderNumber;
      const status = create.json?.status;
      if (status === 'hold' || status === 'hold_followup') {
        ok('Order create (hold)', `${orderNumber} status=${status}`);
      } else {
        fail('Order create (hold)', `unexpected status=${status}`);
      }
    } else {
      fail('Order create (hold)', `${create.status} ${create.text.slice(0, 280)}`);
    }
  }

  // 8) Hold → followups queue visibility / status transition
  if (orderId) {
    const detail = await req('GET', `/crm/orders/${orderId}`, { token });
    if (detail.status === 200) ok('Order detail', detail.json?.status);
    else fail('Order detail', `${detail.status}`);

    // followups list — search by order number (default page may be full of demo rows)
    const fu = await req(
      'GET',
      `/crm/followups?page=1&pageSize=20&search=${encodeURIComponent(orderNumber ?? '')}`,
      { token },
    );
    if (fu.status === 200) {
      const items = fu.json?.items ?? fu.json ?? [];
      const hit = Array.isArray(items)
        ? items.some(
            (f) =>
              f.orderId === orderId ||
              f.orderNumber === orderNumber ||
              String(f.phone ?? '').includes(String(STAMP).slice(-8)),
          )
        : false;
      if (hit) ok('Follow-up created for hold order', orderNumber);
      else fail('Follow-up created for hold order', 'not found in followups search');
    } else {
      const q = await req('GET', `/crm/orders?search=${encodeURIComponent(orderNumber ?? '')}&page=1&pageSize=10`, { token });
      if (q.status === 200) {
        const items = q.json?.items ?? [];
        const hit = items.some((o) => o.id === orderId);
        if (hit) ok('Hold order searchable', orderNumber);
        else fail('Hold order searchable', 'missing');
      } else fail('Follow-ups list', `${fu.status}/${q.status}`);
    }

    // transition hold → hold_followup (if still hold)
    const cur = detail.json?.status;
    if (cur === 'hold') {
      const patch = await req('PATCH', `/crm/orders/${orderId}/status`, {
        token,
        body: { status: 'hold_followup' },
      });
      if (patch.status === 200 || patch.status === 201) {
        ok('Status hold → hold_followup', patch.json?.status);
      } else {
        // alternate endpoint shapes
        const patch2 = await req('PATCH', `/crm/orders/${orderId}`, {
          token,
          body: { status: 'hold_followup' },
        });
        if (patch2.status === 200) ok('Status hold → hold_followup', 'via PATCH order');
        else fail('Status hold → hold_followup', `${patch.status} ${patch.text.slice(0, 180)}`);
      }
    } else if (cur === 'hold_followup') {
      ok('Status already hold_followup (auto)');
    }
  } else {
    skip('Hold follow-up checks', 'no order created');
  }

  // 9) Customers + purchase segments
  {
    const cust = await req('GET', '/crm/customers?page=1&pageSize=5', { token });
    if (cust.status === 200) ok('Customers list');
    else fail('Customers list', `${cust.status}`);

    const segs = await req('GET', '/crm/settings/customer-purchase-segments', { token });
    if (segs.status === 200) {
      const rows = Array.isArray(segs.json) ? segs.json : [];
      ok('Purchase segments', `n=${rows.length}`);
    } else fail('Purchase segments', `${segs.status}`);
  }

  // 10) Incentive hub
  {
    const seed = await req('POST', '/crm/incentive/seed-defaults', { token });
    if (seed.status === 200 || seed.status === 201 || seed.status === 204) {
      ok('Incentive seed-defaults');
    } else if (seed.status === 409) {
      ok('Incentive seed-defaults', 'already seeded');
    } else {
      fail('Incentive seed-defaults', `${seed.status} ${seed.text.slice(0, 160)}`);
    }

    const plans = await req('GET', '/crm/incentive/plans', { token });
    if (plans.status === 200) {
      const rows = Array.isArray(plans.json) ? plans.json : plans.json?.items ?? [];
      ok('Incentive plans list', `n=${rows.length}`);
    } else fail('Incentive plans list', `${plans.status}`);

    const teams = await req('GET', '/crm/incentive/teams', { token });
    if (teams.status === 200) ok('Incentive teams list');
    else fail('Incentive teams list', `${teams.status}`);

    const ym = new Date().toISOString().slice(0, 7);
    const gen = await req('POST', `/crm/incentive/periods/${ym}/generate`, { token });
    if (gen.status === 200 || gen.status === 201) {
      const lines = gen.json?.lines?.length ?? gen.json?.items?.length ?? '?';
      ok('Incentive period generate', `${ym} lines=${lines}`);
    } else {
      fail('Incentive period generate', `${gen.status} ${gen.text.slice(0, 220)}`);
    }

    const period = await req('GET', `/crm/incentive/periods/${ym}`, { token });
    if (period.status === 200) ok('Incentive period get', ym);
    else fail('Incentive period get', `${period.status}`);
  }

  // 11) Sidebar-related branding / order queues
  {
    const queues = await req('GET', '/crm/settings/order-queues', { token });
    if (queues.status === 200) {
      const rows = Array.isArray(queues.json) ? queues.json : [];
      const all = rows.find((q) => q.slug === 'all');
      if (all && /all orders/i.test(all.label)) ok('Queue label All Orders', all.label);
      else if (all) fail('Queue label All Orders', `got "${all.label}"`);
      else fail('Queue label All Orders', 'slug all missing');
    } else fail('Order queues', `${queues.status}`);
  }

  printSummary();
  const failed = results.filter((r) => r.status === 'FAIL').length;
  process.exit(failed ? 1 : 0);
}

function printSummary() {
  const pass = results.filter((r) => r.status === 'PASS').length;
  const failN = results.filter((r) => r.status === 'FAIL').length;
  const skipN = results.filter((r) => r.status === 'SKIP').length;
  console.log(`\n=== SUMMARY: ${pass} pass / ${failN} fail / ${skipN} skip ===\n`);
  if (failN) {
    console.log('Failures:');
    for (const r of results.filter((x) => x.status === 'FAIL')) {
      console.log(` - ${r.name}: ${r.detail}`);
    }
    console.log('');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
