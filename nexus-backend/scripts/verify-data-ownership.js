/* eslint-disable no-console */
// End-to-end verification of the Client master profile vs Lead data-ownership
// rule:
//
//   TEST 1 - New client:      first-time submission creates ONE Client (from the
//                             submitted profile) + ONE Lead, linked to that Client.
//   TEST 2 - Returning client: a later submission with DIFFERENT contact values
//                             never touches the Client master profile; it becomes
//                             a NEW Lead linked to the SAME Client.
//   TEST 3 - Multiple requests: many Leads under one Client, profile stays stable.
//   TEST 4 - Admin Client detail: master profile intact + Service History lists
//                             every Lead.
//
// Run: node scripts/verify-data-ownership.js  (backend must be running on :4000)
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const BASE = 'http://localhost:4000';
const prisma = new PrismaClient();

async function req(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  -- ${detail}`}`);
  if (!ok) failures++;
}

// Simulates the email having been verified through the OTP flow (the same
// persisted state the app produces when the visitor enters the code). The
// email provider is a no-op in dev, so the code can't be read back from a
// mailbox; the verification row is the source of truth the backend checks.
async function verifyEmail(email) {
  await prisma.otpVerification.upsert({
    where: { email },
    create: { email, hashedOtp: 'unused', expiresAt: new Date(Date.now() + 10 * 60 * 1000), verifiedAt: new Date() },
    update: { expiresAt: new Date(Date.now() + 10 * 60 * 1000), verifiedAt: new Date() },
  });
}

(async () => {
  const stamp = Date.now();
  const suffix = `${stamp}@test.local`;
  const emailA = `ownership-a-${suffix}`;
  // Unique 10-digit phones per run so the DB's phone-uniqueness rule never
  // collides with dev data left behind by earlier test runs.
  const tail9 = String(stamp).slice(-9);
  const phoneA = `9${tail9}`;
  const phoneB = `8${tail9}`;
  const phoneC = `7${tail9}`;
  const phoneD = `6${tail9}`;
  const phoneE = `5${tail9}`;

  // Admin login (TEST 4 reads the Client as an admin).
  const adminLogin = await req('POST', '/api/auth/login', {
    email: 'admin@nexus.local', password: 'ChangeMe123!', actorType: 'ADMIN',
  });
  const adminToken = adminLogin.json?.data?.token;
  check('Admin login', !!adminToken, JSON.stringify(adminLogin.json));

  // Pick an active service from the catalog.
  const svc = await prisma.service.findFirst({ where: { isActive: true, archivedAt: null, deletedAt: null } });
  check('Catalog has an active service', !!svc, 'no active service row');
  const serviceId = svc?.id;

  // ── TEST 1 — New client ──────────────────────────────────────────────
  const passwordA = 'OwnershipTest123!';
  await verifyEmail(emailA);

  const first = await req('POST', '/api/leads', {
    contactName: 'Name A',
    phone: phoneA,
    email: emailA,
    source: 'WEBSITE',
    password: passwordA,
    services: [{ serviceId, questionnaireAnswers: {} }],
  });
  const lead1Id = first.json?.data?.lead?.id;
  check('TEST1: Lead created for a brand-new submission', !!lead1Id, JSON.stringify(first.json).slice(0, 300));

  const clientA = await prisma.client.findUnique({ where: { email: emailA } });
  check('TEST1: exactly ONE Client created with the submitted master profile',
    !!clientA && clientA.contactName === 'Name A' && clientA.phone === phoneA && clientA.email === emailA,
    JSON.stringify(clientA));

  const lead1 = lead1Id ? await prisma.lead.findUnique({ where: { id: lead1Id } }) : null;
  check('TEST1: Lead is linked to the new Client (lead.clientId = client.id)',
    !!lead1 && lead1.clientId === clientA?.id, `clientId=${lead1?.clientId} client=${clientA?.id}`);
  const clientCountA = await prisma.client.count({ where: { email: emailA } });
  check('TEST1: no duplicate Clients were created', clientCountA === 1, `count=${clientCountA}`);

  // ── TEST 2 — Returning client ────────────────────────────────────────
  // Welcome Back detection: check-account matches the SAME email even though a
  // different phone is submitted.
  const accountCheck = await req('POST', '/api/public/auth/check-account', {
    email: emailA,
    phone: phoneB,
  });
  check('TEST2: Welcome Back is shown (check-account returns exists=true)',
    accountCheck.json?.data?.exists === true && accountCheck.json?.data?.account?.clientId === clientA?.id,
    JSON.stringify(accountCheck.json).slice(0, 300));

  // Returning client authenticates with the account password.
  const clientLogin = await req('POST', '/api/auth/login', {
    email: emailA, password: passwordA, actorType: 'CLIENT',
  });
  const clientToken = clientLogin.json?.data?.token;
  check('TEST2: returning client can log in', !!clientToken, JSON.stringify(clientLogin.json).slice(0, 200));

  // Second submission carries DIFFERENT name/phone/company - these must land on
  // the new Lead, never on the Client.
  const second = await req('POST', '/api/leads', {
    contactName: 'Name B',
    phone: phoneB,
    email: emailA,
    companyName: 'XYZ Corp',
    source: 'WEBSITE',
    clientId: clientA?.id,
    services: [{ serviceId, questionnaireAnswers: {} }],
  }, clientToken);
  const lead2Id = second.json?.data?.lead?.id;
  check('TEST2: new Lead created for the returning submission', !!lead2Id, JSON.stringify(second.json).slice(0, 300));

  const lead2 = lead2Id ? await prisma.lead.findUnique({ where: { id: lead2Id } }) : null;
  check('TEST2: new Lead.clientId = original Client.id', lead2?.clientId === clientA?.id,
    `clientId=${lead2?.clientId} client=${clientA?.id}`);
  check('TEST2: request-specific values preserved ON the Lead',
    lead2?.contactName === 'Name B' && lead2?.phone === phoneB && lead2?.companyName === 'XYZ Corp',
    JSON.stringify(lead2));

  const clientAAfter = clientA ? await prisma.client.findUnique({ where: { id: clientA.id } }) : null;
  check('TEST2: Client master profile UNCHANGED after returning submission',
    clientAAfter?.contactName === 'Name A' && clientAAfter?.phone === phoneA && clientAAfter?.email === emailA,
    JSON.stringify(clientAAfter));
  const clientCountA2 = await prisma.client.count({ where: { email: emailA } });
  check('TEST2: no second Client was created', clientCountA2 === 1, `count=${clientCountA2}`);

  // ── TEST 3 — Multiple requests ───────────────────────────────────────
  let allLeads = [lead1, lead2];
  const extraPhones = [phoneC, phoneD, phoneE];
  for (let i = 0; i < 3; i++) {
    const r = await req('POST', '/api/leads', {
      contactName: `Name ${String.fromCharCode(67 + i)}`,
      phone: extraPhones[i],
      email: emailA,
      companyName: `Co ${3 + i}`,
      source: 'WEBSITE',
      clientId: clientA?.id,
      services: [{ serviceId, questionnaireAnswers: {} }],
    }, clientToken);
    const lid = r.json?.data?.lead?.id;
    if (lid) allLeads.push(await prisma.lead.findUnique({ where: { id: lid } }));
  }
  check('TEST3: all repeated submissions created Leads', allLeads.length === 5, `got ${allLeads.length}`);

  const dbLeadsForClient = await prisma.lead.findMany({ where: { clientId: clientA?.id }, select: { id: true, clientId: true } });
  const allLinked = dbLeadsForClient.length === 5 && dbLeadsForClient.every((l) => l.clientId === clientA?.id);
  check('TEST3: every Lead references the SAME single Client', allLinked, `found ${dbLeadsForClient.length}`);

  const clientCountA3 = await prisma.client.count({ where: { email: emailA } });
  check('TEST3: only one Client exists after 5 requests', clientCountA3 === 1, `count=${clientCountA3}`);
  const clientA3 = await prisma.client.findUnique({ where: { id: clientA?.id } });
  check('TEST3: Client master profile remains stable',
    clientA3?.contactName === 'Name A' && clientA3?.phone === phoneA && clientA3?.email === emailA,
    JSON.stringify(clientA3));

  // ── TEST 4 — Admin Client detail ─────────────────────────────────────
  const clientDetail = await req('GET', `/api/clients/${clientA?.id}`, null, adminToken);
  const cd = clientDetail.json?.data;
  check('TEST4: Client header shows master profile (name/email/phone)',
    cd?.contactName === 'Name A' && cd?.email === emailA && cd?.phone === phoneA,
    JSON.stringify(cd).slice(0, 300));

  const summary = await req('GET', `/api/clients/${clientA?.id}/summary`, null, adminToken);
  const history = summary.json?.data?.serviceHistory ?? [];
  const historyLeadNumbers = history.map((h) => h.leadNumber).join(',');
  check('TEST4: Service History lists ALL Leads under the Client',
    history.length === 5, `serviceHistory=${historyLeadNumbers || '(empty)'}`);

  const clientLeads = await req('GET', `/api/clients/${clientA?.id}/leads`, null, adminToken);
  check('TEST4: /clients/:id/leads returns every Lead',
    (clientLeads.json?.data ?? []).length === 5, JSON.stringify(clientLeads.json).slice(0, 300));

  // ── Cleanup: remove only the rows this run created ───────────────────
  // FK order: LeadSubService cascades off LeadService. The wizard-created
  // Client has a REQUIRED sourceLeadId back to its origin Lead (RESTRICT), so
  // the Client is deleted FIRST - leads.clientId is ON DELETE SET NULL, which
  // also nulls the link, and only then are the orphaned Leads deleted.
  async function cleanup() {
    const testClients = await prisma.client.findMany({ where: { email: { startsWith: 'ownership-' } } });
    for (const c of testClients) {
      const leadIds = (await prisma.lead.findMany({ where: { clientId: c.id }, select: { id: true } })).map((l) => l.id);
      if (leadIds.length) {
        await prisma.leadService.deleteMany({ where: { leadId: { in: leadIds } } });
        await prisma.leadActivityNote.deleteMany({ where: { leadId: { in: leadIds } } });
      }
      await prisma.client.delete({ where: { id: c.id } });
      if (leadIds.length) await prisma.lead.deleteMany({ where: { id: { in: leadIds } } });
    }
    await prisma.otpVerification.deleteMany({ where: { email: { startsWith: 'ownership-' } } });
  }
  await cleanup();

  await prisma.$disconnect();
  console.log(failures === 0 ? '\nALL DATA-OWNERSHIP CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
