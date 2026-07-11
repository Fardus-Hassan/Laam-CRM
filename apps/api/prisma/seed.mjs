/**
 * Seeds platform super admin + optional CRM demo data.
 * Run: pnpm db:push && pnpm db:seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PLATFORM_ORG_ID = '00000000-0000-4000-8000-000000000001';

async function seedSuperAdmin() {
  const email = (process.env.SUPER_ADMIN_EMAIL ?? 'crm.laam@gmail.com').trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD ?? 'crm.laam2026';

  await prisma.organization.upsert({
    where: { slug: 'platform' },
    create: {
      id: PLATFORM_ORG_ID,
      name: 'Laam Platform',
      slug: 'platform',
      plan: 'Enterprise',
      status: 'active',
    },
    update: {
      name: 'Laam Platform',
      plan: 'Enterprise',
      status: 'active',
    },
  });

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: 'Super Admin',
      passwordHash,
      systemRole: 'super_admin',
      status: 'active',
      organizationId: PLATFORM_ORG_ID,
    },
    update: {
      passwordHash,
      systemRole: 'super_admin',
      status: 'active',
      organizationId: PLATFORM_ORG_ID,
    },
  });

  console.log(`Super admin ready: ${email} (platform login at http://localhost:3000)`);
}

async function seedCrmDemo() {
  await prisma.lead.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.order.deleteMany();

  const leads = [
    { leadNumber: 'LD-2001', name: 'Rahim Uddin', phone: '01700000001', source: 'facebook', status: 'new', area: 'Dhaka', estimatedValue: 6000, campaignName: 'FB Lead Form' },
    { leadNumber: 'LD-2002', name: 'Fatema Akter', phone: '01700000002', source: 'call', status: 'contacted', area: 'Dhaka', estimatedValue: 7000, campaignName: 'Inbound' },
  ];

  await prisma.lead.createMany({ data: leads });
  await prisma.company.createMany({
    data: [
      { name: 'Akash Traders', industry: 'Retail', status: 'active', contactCount: 3, dealValue: 70000, city: 'Dhaka' },
    ],
  });
  await prisma.deal.createMany({
    data: [
      { dealNumber: 'DL-3001', title: 'Bulk order', companyName: 'Akash Traders', stage: 'new_lead', amount: 45000, probability: 30 },
    ],
  });
  await prisma.order.createMany({
    data: [
      { orderNumber: 'ORD-1001', status: 'pending', customerName: 'Rahim Uddin', customerPhone: '01800000001', source: 'facebook', itemsCount: 2, amount: 6000, paymentStatus: 'cod', shippingArea: 'Gulshan' },
    ],
  });

  console.log('CRM demo seed complete');
}

async function main() {
  await seedSuperAdmin();
  await seedCrmDemo();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
