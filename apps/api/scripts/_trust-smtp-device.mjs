import { PrismaClient } from '@prisma/client';
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
const prisma = new PrismaClient();
const email = (process.env.SUPER_ADMIN_EMAIL ?? '').trim().toLowerCase();
const deviceId = 'smtp-test-device';
const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  console.error('user not found', email);
  process.exit(1);
}
await prisma.trustedDevice.upsert({
  where: { userId_deviceId: { userId: user.id, deviceId } },
  create: { userId: user.id, deviceId },
  update: { trustedAt: new Date() },
});
const challenge = await prisma.otpChallenge.findFirst({
  where: { email, purpose: 'new_device' },
  orderBy: { createdAt: 'desc' },
});
console.log(
  JSON.stringify({
    trusted: true,
    userId: user.id,
    lastOtpChallenge: challenge
      ? {
          id: challenge.id,
          createdAt: challenge.createdAt,
          expiresAt: challenge.expiresAt,
          consumedAt: challenge.consumedAt,
          delivery: challenge.delivery,
        }
      : null,
  }),
);
await prisma.$disconnect();
