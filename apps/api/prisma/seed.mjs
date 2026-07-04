/**
 * Seeds CRM tables from API fixtures when DATABASE_URL is available.
 * Run: pnpm db:push && pnpm db:seed
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const leads = [
  { leadNumber: 'LD-2001', name: 'Rahim Uddin', phone: '01700000001', source: 'facebook', status: 'new', area: 'Dhaka', estimatedValue: 6000, campaignName: 'FB Lead Form' },
  { leadNumber: 'LD-2002', name: 'Fatema Akter', phone: '01700000002', source: 'call', status: 'contacted', area: 'Dhaka', estimatedValue: 7000, campaignName: 'Inbound' },
  { leadNumber: 'LD-2003', name: 'Karim Hassan', phone: '01700000003', source: 'ecommerce', status: 'qualified', area: 'Dhaka', estimatedValue: 8000, campaignName: 'Store' },
];

const companies = [
  { name: 'Akash Traders', industry: 'Retail', status: 'active', contactCount: 3, dealValue: 70000, city: 'Dhaka' },
  { name: 'Green Valley Ltd', industry: 'Wholesale', status: 'prospect', contactCount: 2, dealValue: 50000, city: 'Dhaka' },
];

const deals = [
  { dealNumber: 'DL-3001', title: 'Bulk order', companyName: 'Akash Traders', stage: 'new_lead', amount: 45000, probability: 30 },
  { dealNumber: 'DL-3002', title: 'Corporate contract', companyName: 'Green Valley Ltd', stage: 'qualified', amount: 90000, probability: 60 },
];

const orders = [
  { orderNumber: 'ORD-1001', status: 'pending', customerName: 'Rahim Uddin', customerPhone: '01800000001', source: 'facebook', itemsCount: 2, amount: 6000, paymentStatus: 'cod', shippingArea: 'Gulshan' },
  { orderNumber: 'ORD-1002', status: 'confirmed', customerName: 'Fatema Akter', customerPhone: '01800000002', source: 'call', itemsCount: 1, amount: 4500, paymentStatus: 'cod', shippingArea: 'Banani' },
];

async function main() {
  await prisma.lead.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.order.deleteMany();

  await prisma.lead.createMany({ data: leads });
  await prisma.company.createMany({ data: companies });
  await prisma.deal.createMany({ data: deals });
  await prisma.order.createMany({ data: orders });

  await prisma.contact.createMany({
    data: leads.map((lead) => ({
      name: lead.name,
      phone: lead.phone,
      source: lead.source,
      companyName: 'Akash Traders',
      jobTitle: 'Manager',
    })),
  });

  console.log('CRM seed complete');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
