const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const services = await p.service.findMany({ select: { id: true, name: true, slug: true, isActive: true } });
  const subs = await p.subService.findMany({ select: { id: true, serviceId: true, name: true, isActive: true } });
  console.log('SERVICES:');
  for (const s of services) console.log(`  ${s.name} | ${s.slug} | active=${s.isActive} | ${s.id}`);
  console.log('SUB_SERVICES:');
  for (const s of subs) console.log(`  ${s.name} | service=${s.serviceId} | active=${s.isActive} | ${s.id}`);

  console.log('\nINVENTORY:');
  const leads = await p.lead.count({ where: { archivedAt: null } });
  const leadsAll = await p.lead.count();
  const clients = await p.client.count();
  const quotations = await p.quotation.count();
  const quotationItemsWithSub = await p.quotationItem.count({ where: { subServiceId: { not: null } } });
  const quotationItems = await p.quotationItem.count();
  const projects = await p.project.count();
  const leadServices = await p.leadService.count();
  const leadSubServices = await p.leadSubService.count();
  const projectServices = await p.projectService.count();
  const projectSubServices = await p.projectSubService.count();
  console.log({ leads, leadsAll, clients, quotations, quotationItems, quotationItemsWithSub, projects, leadServices, leadSubServices, projectServices, projectSubServices });

  console.log('\nQUOTATIONS (id | number | status | clientId | leadId | activeVersionId):');
  const qs = await p.quotation.findMany({ orderBy: { createdAt: 'asc' } });
  for (const q of qs) console.log(`  ${q.id} | ${q.quotationNumber} | ${q.status} | client=${q.clientId} | lead=${q.leadId} | activeV=${q.activeVersionId}`);

  console.log('\nPROJECTS (id | number | leadId | clientId | quotationId | completedAt):');
  const ps = await p.project.findMany({ orderBy: { createdAt: 'asc' } });
  for (const pr of ps) console.log(`  ${pr.id} | ${pr.projectNumber} | lead=${pr.leadId} | client=${pr.clientId} | quo=${pr.quotationId} | done=${pr.completedAt ? 'Y' : 'N'}`);
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
