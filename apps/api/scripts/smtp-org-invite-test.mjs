/**
 * SMTP live test: platform super-admin creates a tenant and checks invite emailSent.
 * Usage (from repo root, with .env loaded into process):
 *   node apps/api/scripts/smtp-org-invite-test.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv(path) {
  const text = readFileSync(path, 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnv(resolve(process.cwd(), '.env'));

const API = process.env.E2E_API_URL ?? 'http://localhost:3333/api';
const EMAIL = (process.env.SUPER_ADMIN_EMAIL ?? '').trim().toLowerCase();
const PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? '';
const DEVICE_ID = process.env.E2E_DEVICE_ID ?? 'smtp-test-device';
const STAMP = Date.now();
const SLUG = `smtp${String(STAMP).slice(-8)}`;
// Gmail plus-alias → same inbox as SUPER_ADMIN_EMAIL when that is Gmail.
const local = EMAIL.split('@')[0] ?? 'test';
const domain = EMAIL.split('@')[1] ?? 'example.com';
const OWNER_EMAIL = `${local}+${SLUG}@${domain}`;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function req(method, path, { token, body, tenant } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (tenant) headers['x-tenant-slug'] = tenant;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
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

console.log('=== SMTP org-invite test ===');
console.log(`EMAIL_MODE=${process.env.EMAIL_MODE}`);
console.log(`SMTP_HOST=${process.env.SMTP_HOST}`);
console.log(`MAIL_FROM=${process.env.MAIL_FROM}`);
console.log(`Super admin=${EMAIL}`);
console.log(`New org slug=${SLUG}`);
console.log(`Owner invite → ${OWNER_EMAIL}`);

assert(EMAIL && PASSWORD, 'SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD missing in .env');
assert(
  (process.env.EMAIL_MODE ?? '').toLowerCase() === 'smtp',
  `EMAIL_MODE must be smtp (got ${process.env.EMAIL_MODE})`,
);

const login = await req('POST', '/auth/login', {
  body: { email: EMAIL, password: PASSWORD, deviceId: DEVICE_ID },
});

if (login.json?.requiresDeviceOtp) {
  console.error('FAIL: super admin requires device OTP — trust this device first or use known deviceId');
  console.error(JSON.stringify(login.json, null, 2));
  process.exit(1);
}

assert(
  login.status < 300 && (login.json?.accessToken || login.json?.token),
  `Login failed: ${login.status} ${login.text.slice(0, 300)}`,
);
const token = login.json.accessToken ?? login.json.token;
console.log('PASS login as super admin');

const create = await req('POST', '/platform/tenants', {
  token,
  body: {
    name: `SMTP Test ${SLUG}`,
    slug: SLUG,
    plan: 'Pro',
    owner: {
      name: 'SMTP Test Owner',
      email: OWNER_EMAIL,
      phone: '01700000099',
    },
  },
});

console.log(`Create tenant status=${create.status}`);
if (create.status >= 300) {
  console.error('FAIL create tenant:', create.text.slice(0, 500));
  process.exit(1);
}

const provision = create.json?.provision ?? {};
console.log('provision.emailSent =', provision.emailSent);
console.log('provision.emailWarning =', provision.emailWarning ?? '(none)');
console.log('provision.loginUrl =', provision.loginUrl);
console.log('provision.email =', provision.email);
// Do not print temp password in full in shared logs if avoidable — show length only
console.log(
  'provision.tempPassword =',
  provision.tempPassword ? `SET(len=${String(provision.tempPassword).length})` : 'MISSING',
);

if (provision.emailSent === true) {
  console.log('\nPASS SMTP: invite email reported as sent.');
  console.log(`Check inbox (and spam) for ${OWNER_EMAIL}`);
  process.exit(0);
}

console.log('\nFAIL SMTP: invite email was NOT sent.');
if (provision.emailWarning) console.log('Warning:', provision.emailWarning);
process.exit(1);
