const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const clients = await p.client.findMany({ select: { id: true, clientNumber: true, contactName: true, email: true, phone: true, companyName: true } });
  const leads = await p.lead.findMany({ select: { id: true, leadNumber: true, clientId: true, contactName: true, phone: true, email: true } });
  console.log('CLIENTS:');
  clients.forEach((c) => console.log(JSON.stringify(c)));
  console.log('LEADS:');
  leads.forEach((l) => console.log(JSON.stringify(l)));
  const users = await p.user.findMany({ select: { email: true, isActive: true } });
  console.log('USERS:', JSON.stringify(users));
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
