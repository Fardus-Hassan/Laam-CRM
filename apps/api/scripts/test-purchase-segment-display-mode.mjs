import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';

const require = createRequire(import.meta.url);
const {
  purchaseSegmentShowsInSidebar,
  purchaseSegmentShowsInNestedTabs,
} = await import('../../../packages/types/dist/index.js');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const prisma = new PrismaClient();

const helperCases = [
  ['sidebar_and_tab', true, true],
  ['sidebar', true, false],
  ['nested_tab', false, true],
  ['filter_only', false, false],
];
for (const [mode, wantSide, wantNest] of helperCases) {
  const segment = { displayMode: mode, showInNav: true };
  assert(
    purchaseSegmentShowsInSidebar(segment) === wantSide,
    `sidebar helper failed for ${mode}`,
  );
  assert(
    purchaseSegmentShowsInNestedTabs(segment) === wantNest,
    `nested helper failed for ${mode}`,
  );
}
console.log('HELPERS_PASS');

const org =
  (await prisma.organization.findFirst({ where: { slug: 'baam' } })) ??
  (await prisma.organization.findFirst({
    where: { slug: { not: 'platform' } },
  }));
if (!org) {
  console.log('NO_ORG');
  process.exit(1);
}
console.log('ORG', org.slug);

let segs = await prisma.orgCustomerPurchaseSegment.findMany({
  where: { organizationId: org.id, deletedAt: null },
  orderBy: { sortOrder: 'asc' },
});

if (!segs.length) {
  const defaults = [
    { slug: '1x', label: '1x Buyers', op: 'eq', threshold: 1, sortOrder: 10 },
    { slug: '2x', label: '2x Buyers', op: 'eq', threshold: 2, sortOrder: 20 },
    { slug: '3x', label: '3x Buyers', op: 'eq', threshold: 3, sortOrder: 30 },
    { slug: '4x', label: '4x Buyers', op: 'eq', threshold: 4, sortOrder: 40 },
    {
      slug: 'loyal',
      label: 'Loyal Customers',
      op: 'gt',
      threshold: 4,
      sortOrder: 50,
    },
  ];
  await prisma.orgCustomerPurchaseSegment.createMany({
    data: defaults.map((s) => ({
      organizationId: org.id,
      ...s,
      metric: 'deliveredCount',
      displayMode: 'sidebar_and_tab',
      showInNav: true,
      isSystem: true,
      isActive: true,
    })),
    skipDuplicates: true,
  });
  segs = await prisma.orgCustomerPurchaseSegment.findMany({
    where: { organizationId: org.id, deletedAt: null },
    orderBy: { sortOrder: 'asc' },
  });
}

assert(
  segs.every((s) => typeof s.displayMode === 'string'),
  'displayMode column missing',
);
console.log(
  'DEFAULTS',
  segs.map((s) => `${s.slug}:${s.displayMode}`).join(', '),
);

const snap = Object.fromEntries(
  segs.map((s) => [s.slug, { displayMode: s.displayMode, showInNav: s.showInNav }]),
);

async function setMode(slug, displayMode, showInNav) {
  const row = segs.find((s) => s.slug === slug);
  if (!row) return;
  await prisma.orgCustomerPurchaseSegment.update({
    where: { id: row.id },
    data: { displayMode, showInNav },
  });
}

try {
  await setMode('1x', 'sidebar', true);
  await setMode('2x', 'filter_only', false);
  await setMode('loyal', 'nested_tab', false);

  const after = await prisma.orgCustomerPurchaseSegment.findMany({
    where: { organizationId: org.id, deletedAt: null, isActive: true },
  });
  const sidebar = after
    .filter((s) => purchaseSegmentShowsInSidebar(s))
    .map((s) => s.slug);
  const nested = after
    .filter((s) => purchaseSegmentShowsInNestedTabs(s))
    .map((s) => s.slug);

  console.log('SIDEBAR', sidebar.join(','));
  console.log('NESTED', nested.join(','));

  assert(sidebar.includes('1x'), '1x should be sidebar');
  assert(!sidebar.includes('loyal'), 'loyal should not be sidebar');
  assert(!sidebar.includes('2x'), '2x should not be sidebar');
  assert(nested.includes('loyal'), 'loyal should be nested');
  assert(!nested.includes('1x'), '1x should not be nested');
  assert(!nested.includes('2x'), '2x should not be nested');
  console.log('VISIBILITY_PASS');

  // Mirror API list chip filter
  const chipSlugs = after
    .filter(
      (s) =>
        s.displayMode === 'nested_tab' || s.displayMode === 'sidebar_and_tab',
    )
    .map((s) => s.slug);
  assert(chipSlugs.includes('loyal'), 'chips include loyal');
  assert(!chipSlugs.includes('1x'), 'chips exclude sidebar-only 1x');
  assert(!chipSlugs.includes('2x'), 'chips exclude filter_only 2x');
  console.log('CHIP_FILTER_PASS');
} finally {
  const current = await prisma.orgCustomerPurchaseSegment.findMany({
    where: { organizationId: org.id, deletedAt: null },
  });
  for (const row of current) {
    const prev = snap[row.slug];
    if (prev) {
      await prisma.orgCustomerPurchaseSegment.update({
        where: { id: row.id },
        data: prev,
      });
    }
  }
  console.log('RESTORED');
}

const eq1 = await prisma.customer.count({
  where: { organizationId: org.id, deliveredCount: 1 },
});
const loyalN = await prisma.customer.count({
  where: { organizationId: org.id, deliveredCount: { gt: 4 } },
});
console.log('FILTER_COUNTS', JSON.stringify({ eq1, loyalGt4: loyalN }));

// Ensure upsert path accepts displayMode via prisma (schema sync)
const ten = await prisma.orgCustomerPurchaseSegment.findFirst({
  where: { organizationId: org.id, slug: '10x', deletedAt: null },
});
if (ten) {
  await prisma.orgCustomerPurchaseSegment.update({
    where: { id: ten.id },
    data: { displayMode: 'sidebar_and_tab', showInNav: true },
  });
  console.log('10x_OK');
}

console.log('ALL_PASS');
await prisma.$disconnect();
void require;
