const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  console.log('PROJECT_SERVICES (existing):');
  const ps = await p.projectService.findMany({ orderBy: { createdAt: 'asc' } });
  for (const s of ps) console.log(`  ${s.id} | project=${s.projectId} | service=${s.serviceId} | status=${s.status} | leadSvc=${s.leadServiceId} | quoVer=${s.assignedQuotationVersionId}`);

  console.log('\nLEAD_SERVICES with statuses:');
  const ls = await p.leadService.findMany({ orderBy: { createdAt: 'asc' } });
  for (const s of ls) console.log(`  ${s.id} | lead=${s.leadId} | service=${s.serviceId} | status=${s.status} | convertedAt=${s.convertedAt ? 'Y' : 'N'}`);

  console.log('\nLEAD_SUB_SERVICES with lead service + service:');
  const lss = await p.leadSubService.findMany({ include: { leadService: true, subService: true } });
  for (const s of lss) console.log(`  ${s.id} | leadService=${s.leadServiceId} (lead=${s.leadService?.leadId}, service=${s.leadService?.serviceId}) | sub=${s.subService?.name}`);

  console.log('\nCLIENT SERVICES (clientId | serviceId | name):');
  const cs = await p.client.findMany({ include: { leadServices: { include: { service: true } } } });
  for (const c of cs) {
    const svcs = (c.leadServices ?? []).filter((l) => l.convertedAt).map((l) => `${l.service?.name}(${l.status})`);
    console.log(`  client=${c.id} | ${c.clientNumber} | ${c.contactName} | services=${svcs.join(', ') || 'none'}`);
  }

  console.log('\nQUOTATION ITEMS (by version):');
  const versions = await p.quotationVersion.findMany({ include: { items: true }, orderBy: { createdAt: 'asc' } });
  for (const v of versions) {
    console.log(`  version=${v.id} | quo=${v.quotationId} | v${v.versionNumber} | items=${v.items.length} | withSub=${v.items.filter((i) => i.subServiceId).length}`);
  }
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
