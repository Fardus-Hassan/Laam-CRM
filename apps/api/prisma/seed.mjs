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

// Mirrors PRODUCT_CATEGORY_SEEDS in apps/api/src/crm/inventory-catalog.service.ts
const PRODUCT_CATEGORY_SEEDS = [
  { slug: 'honey', label: 'Honey' },
  { slug: 'dates', label: 'Dates' },
  { slug: 'combo', label: 'Combo' },
  { slug: 'gift', label: 'Gift box' },
  { slug: 'raw_material', label: 'Raw material' },
  { slug: 'packaging', label: 'Packaging' },
  { slug: 'other', label: 'Other' },
];

/** Idempotent catalog seed: one brand, default product categories, one product with one variant. */
async function seedInventoryCatalog(organizationId) {
  let brand = await prisma.productBrand.findFirst({
    where: { organizationId, slug: 'laam_demo' },
  });
  if (!brand) {
    brand = await prisma.productBrand.create({
      data: {
        organizationId,
        name: 'Laam Demo',
        slug: 'laam_demo',
        description: 'Seeded demo brand',
        isActive: true,
      },
    });
  }

  await prisma.orgCategory.createMany({
    data: PRODUCT_CATEGORY_SEEDS.map((seed, index) => ({
      organizationId,
      kind: 'product',
      slug: seed.slug,
      label: seed.label,
      sortOrder: index,
      isActive: true,
      isSystem: seed.slug === 'other',
    })),
    skipDuplicates: true,
  });

  const honeyCategory = await prisma.orgCategory.findFirst({
    where: { organizationId, kind: 'product', slug: 'honey' },
  });

  const productSku = 'SEED-HONEY-001';
  let product = await prisma.product.findFirst({
    where: { organizationId, sku: productSku },
  });
  if (!product) {
    product = await prisma.product.create({
      data: {
        organizationId,
        name: 'Sundarban Honey (Seed)',
        sku: productSku,
        brandId: brand.id,
        categoryId: honeyCategory?.id ?? null,
        description: 'Seeded demo product',
        status: 'active',
        reorderLevel: 5,
        tags: ['seed'],
      },
    });
  }

  const variantSku = 'SEED-HONEY-001-500G';
  let variant = await prisma.productVariant.findFirst({
    where: { organizationId, sku: variantSku },
  });
  if (!variant) {
    variant = await prisma.productVariant.create({
      data: {
        organizationId,
        productId: product.id,
        label: '500g jar',
        sku: variantSku,
        salePrice: 499,
        costPrice: 320,
        stock: 25,
        reorderLevel: 5,
      },
    });
  }

  const supplier = await prisma.inventorySupplier.upsert({
    where: {
      organizationId_name: {
        organizationId,
        name: 'Sundarban Apiaries',
      },
    },
    create: {
      organizationId,
      name: 'Sundarban Apiaries',
      contactPerson: 'Karim Uddin',
      phone: '01710000001',
      email: 'supply@example.com',
      address: 'Khulna',
      tags: ['Primary'],
    },
    update: {},
  });

  const purchaseNumber = 'PO-SEED-001';
  const existingPurchase = await prisma.inventoryPurchase.findFirst({
    where: { organizationId, purchaseNumber },
  });
  if (!existingPurchase && variant) {
    await prisma.inventoryPurchase.create({
      data: {
        organizationId,
        supplierId: supplier.id,
        purchaseNumber,
        paymentStatus: 'unpaid',
        stockStatus: 'pending',
        purchaseDate: new Date('2026-07-19T00:00:00.000Z'),
        notes: 'Seeded purchase for inventory workflow verification',
        lines: {
          create: {
            productId: product.id,
            variantId: variant.id,
            quantity: 10,
            unitCost: 320,
          },
        },
      },
    });
  }

  const purchase = await prisma.inventoryPurchase.findFirst({
    where: { organizationId, purchaseNumber },
  });

  let rawProduct = await prisma.product.findFirst({
    where: { organizationId, sku: 'SEED-RAW-HONEY' },
  });
  if (!rawProduct) {
    rawProduct = await prisma.product.create({
      data: {
        organizationId,
        name: 'Raw Honey Drum',
        sku: 'SEED-RAW-HONEY',
        brandId: brand.id,
        categoryId: honeyCategory?.id ?? null,
        description: 'Seeded raw material for mixer',
        status: 'active',
        reorderLevel: 2,
        tags: ['seed', 'raw'],
      },
    });
  }
  let rawVariant = await prisma.productVariant.findFirst({
    where: { organizationId, sku: 'SEED-RAW-HONEY-KG' },
  });
  if (!rawVariant) {
    rawVariant = await prisma.productVariant.create({
      data: {
        organizationId,
        productId: rawProduct.id,
        label: '1kg bulk',
        sku: 'SEED-RAW-HONEY-KG',
        salePrice: 400,
        costPrice: 280,
        stock: 50,
        reorderLevel: 5,
      },
    });
  }

  const returnNumber = 'PR-SEED-001';
  const existingReturn = await prisma.inventoryPurchaseReturn.findFirst({
    where: { organizationId, returnNumber },
  });
  if (!existingReturn && variant) {
    await prisma.inventoryPurchaseReturn.create({
      data: {
        organizationId,
        purchaseId: purchase?.id ?? null,
        returnNumber,
        purchaseNumber,
        supplierName: supplier.name,
        status: 'pending',
        returnDate: new Date('2026-07-18T00:00:00.000Z'),
        reason: 'Damaged jars',
        lines: {
          create: {
            productId: product.id,
            variantId: variant.id,
            quantity: 2,
            unitCost: 320,
          },
        },
      },
    });
  }

  const recipeName = 'Seed Honey Jar Mix';
  const existingRecipe = await prisma.mixerRecipe.findFirst({
    where: { organizationId, name: recipeName },
  });
  if (!existingRecipe) {
    await prisma.mixerRecipe.create({
      data: {
        organizationId,
        name: recipeName,
        outputProductId: product.id,
        outputQty: 20,
        status: 'active',
        inputs: [
          {
            productId: rawProduct.id,
            productName: 'Raw Honey Drum',
            sku: 'SEED-RAW-HONEY',
            quantity: 10,
            unit: 'kg',
          },
        ],
      },
    });
  } else {
    await prisma.mixerRecipe.update({
      where: { id: existingRecipe.id },
      data: {
        outputProductId: product.id,
        outputQty: 20,
        inputs: [
          {
            productId: rawProduct.id,
            productName: 'Raw Honey Drum',
            sku: 'SEED-RAW-HONEY',
            quantity: 10,
            unit: 'kg',
          },
        ],
      },
    });
  }

  console.log(`Inventory catalog seed ready for org ${organizationId} (${productSku})`);
}

async function seedNotifications() {
  const admin = await prisma.user.findFirst({
    where: {
      systemRole: 'org_admin',
      status: 'active',
      organization: { slug: { not: 'platform' } },
    },
    include: { organization: true },
  });

  if (!admin?.organizationId || !admin.organization) {
    console.log('Skip notification seed: no tenant org_admin found');
    return;
  }

  await prisma.notification.deleteMany({ where: { userId: admin.id } });

  const orgId = admin.organizationId;
  await prisma.notification.createMany({
    data: [
      {
        organizationId: orgId,
        userId: admin.id,
        type: 'failed_login',
        title: 'Failed login attempt',
        body: `Someone tried to sign in as ${admin.email} with an incorrect password.`,
        href: '/dashboard/users',
        isRead: false,
      },
      {
        organizationId: orgId,
        userId: admin.id,
        type: 'system',
        title: 'Team invite sent',
        body: 'A teammate was invited to your organization.',
        href: '/dashboard/users',
        isRead: false,
      },
      {
        organizationId: orgId,
        userId: admin.id,
        type: 'system',
        title: 'Brand settings updated',
        body: `${admin.organization.name} brand colors or logos were changed.`,
        href: '/dashboard/settings/brand',
        isRead: true,
      },
    ],
  });

  console.log(`Notification samples ready for ${admin.email} @ ${admin.organization.slug}`);
}

async function seedE2eTenant() {
  const email = (process.env.E2E_USER_EMAIL ?? 'e2e.admin@laam.test').trim().toLowerCase();
  const password = process.env.E2E_USER_PASSWORD ?? 'e2e.admin2026';
  const deviceId = process.env.E2E_DEVICE_ID ?? 'e2e-device';

  const org = await prisma.organization.upsert({
    where: { slug: 'laam' },
    create: {
      name: 'Laam Demo',
      slug: 'laam',
      plan: 'Growth',
      status: 'active',
    },
    update: {
      name: 'Laam Demo',
      status: 'active',
    },
  });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: 'E2E Org Admin',
      passwordHash,
      systemRole: 'org_admin',
      status: 'active',
      organizationId: org.id,
    },
    update: {
      passwordHash,
      systemRole: 'org_admin',
      status: 'active',
      organizationId: org.id,
    },
  });

  await prisma.trustedDevice.upsert({
    where: { userId_deviceId: { userId: user.id, deviceId } },
    create: { userId: user.id, deviceId },
    update: {},
  });

  await seedInventoryCatalog(org.id);
  console.log(`E2E tenant ready: ${email} @ ${org.slug} (device ${deviceId})`);
  return org.id;
}

async function main() {
  await seedSuperAdmin();
  await seedCrmDemo();
  await seedE2eTenant();

  const tenantOrg = await prisma.organization.findFirst({
    where: { slug: { not: 'platform' } },
    orderBy: { createdAt: 'asc' },
  });
  if (tenantOrg) {
    await seedInventoryCatalog(tenantOrg.id);
  } else {
    console.log('Skip inventory catalog seed: no tenant organization found');
  }

  await seedNotifications();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
