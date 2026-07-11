import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Every permission key referenced by an authorize('...') call anywhere in
// the codebase must exist here, or that route becomes permanently
// inaccessible to the ADMIN role until this list is updated.
const PERMISSION_KEYS = [
  'category.manage',
  'service.manage',
  'lead.view',
  'lead.edit',
  'client.view',
  'client.edit',
  'client.convert',
  'quotation.view',
  'quotation.create',
  'quotation.approve',
  'project.view',
  'project.create',
  'project.edit',
  'invoice.view',
  'invoice.create',
  'invoice.cancel',
  'document.upload',
  'document.delete',
  'message.view',
  'search.use',
  'dashboard.view',
  'audit.view',
];

async function main() {
  console.log('Seeding roles...');
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN' },
  });

  console.log('Seeding permissions...');
  for (const key of PERMISSION_KEYS) {
    const permission = await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, description: key },
    });

    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });
  }

  console.log('Seeding default Admin user...');
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@nexus.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash, roleId: adminRole.id, isActive: true },
  });

  console.log('Seeding baseline service categories and services...');
  const categories = [
    { name: 'Construction', services: [{ name: 'Interior Design', requiresSiteVisit: 'YES' as const }] },
    { name: 'Electrical', services: [{ name: 'Electrical Work', requiresSiteVisit: 'OPTIONAL' as const }] },
    { name: 'Technology', services: [{ name: 'CCTV Installation', requiresSiteVisit: 'YES' as const }, { name: 'Website & IT Services', requiresSiteVisit: 'NO' as const }] },
    { name: 'Branding', services: [{ name: 'Branding & Signage', requiresSiteVisit: 'OPTIONAL' as const }] },
    { name: 'Energy', services: [{ name: 'Solar Installation', requiresSiteVisit: 'YES' as const }] },
  ];

  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { id: `seed-${cat.name.toLowerCase()}` },
      update: {},
      create: { id: `seed-${cat.name.toLowerCase()}`, name: cat.name },
    });

    for (const svc of cat.services) {
      const existing = await prisma.service.findFirst({ where: { name: svc.name } });
      if (!existing) {
        const service = await prisma.service.create({
          data: {
            categoryId: category.id,
            name: svc.name,
            requiresSiteVisit: svc.requiresSiteVisit,
            isActive: true,
          },
        });

        // A minimal placeholder questionnaire per service - developer-
        // configured in V1 per PRD §5. Replace `schema` with the real
        // question set per service before go-live.
        await prisma.serviceQuestionnaire.create({
          data: {
            serviceId: service.id,
            version: 1,
            isActive: true,
            schema: {
              fields: [{ key: 'notes', label: 'Tell us about your requirement', type: 'textarea', required: true }],
            },
          },
        });
      }
    }
  }

  console.log('Seed complete.');
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
