/* eslint-disable no-console */
// End-to-end verification of the quotation acceptance flow:
// enquiry -> lead approval -> quotation -> approve -> convert client
// -> send -> CLIENT accepts -> quotation ACCEPTED + project created.
// Run: node scripts/verify-acceptance.js  (backend must be running on :4000)
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

(async () => {
  const stamp = Date.now();

  // Admin login
  const adminLogin = await req('POST', '/api/auth/login', {
    email: 'admin@nexus.local', password: 'ChangeMe123!', actorType: 'ADMIN',
  });
  const adminToken = adminLogin.json?.data?.token;
  check('Admin login', !!adminToken, JSON.stringify(adminLogin.json));

  // Pick an active service from the catalog
  const services = await req('GET', '/api/services?pageSize=1', null, adminToken);
  const svc = services.json?.data?.[0];
  check('Catalog has a service', !!svc, JSON.stringify(services.json).slice(0, 200));

  // Public enquiry -> lead
  const lead = await req('POST', '/api/leads', {
    contactName: 'Accept Flow Test',
    phone: `98${String(stamp).slice(-8)}`,
    email: `accept-flow-${stamp}@test.local`,
    source: 'WEBSITE',
    services: [{ serviceId: svc.id, questionnaireAnswers: {} }],
  });
  // POST /api/leads returns { data: { lead, leadServices } }
  const leadId = lead.json?.data?.lead?.id;
  const leadServiceId = lead.json?.data?.leadServices?.[0]?.id;
  check('Lead created', !!leadId && !!leadServiceId, JSON.stringify(lead.json).slice(0, 300));

  // Walk lead service to APPROVED
  for (const toStatus of ['QUALIFIED', 'CONTACTED', 'QUOTE PREPARING', 'QUOTE SENT', 'NEGOTIATION', 'APPROVED']) {
    const r = await req('PATCH', `/api/leads/${leadServiceId}/status`,
      { toStatus, reason: 'accept-flow e2e' }, adminToken);
    if (r.status !== 200) { check(`Lead service -> ${toStatus}`, false, JSON.stringify(r.json)); break; }
  }

  // Quotation with one item
  const quo = await req('POST', '/api/quotations', {
    leadId,
    items: [{ serviceId: svc.id, description: 'E2E item', quantity: 1, unitPrice: 10000, taxRate: 18 }],
  }, adminToken);
  const quotationId = quo.json?.data?.id;
  const versionId = quo.json?.data?.versions?.[0]?.id;
  check('Quotation created', !!quotationId && !!versionId, JSON.stringify(quo.json).slice(0, 300));

  // Admin approves the version
  const approve = await req('POST', `/api/quotations/versions/${versionId}/approve`,
    { approvalMethod: 'PHONE' }, adminToken);
  check('Quotation version approved', approve.status === 200, JSON.stringify(approve.json).slice(0, 200));

  // Convert lead -> client, then set a known password so we can log in
  const client = await req('POST', `/api/clients/convert/${leadId}`, null, adminToken);
  const clientId = client.json?.data?.id;
  check('Lead converted to Client', !!clientId, JSON.stringify(client.json).slice(0, 200));

  const clientPassword = 'E2eTest123!';
  await prisma.client.update({
    where: { id: clientId },
    data: { passwordHash: await bcrypt.hash(clientPassword, 10) },
  });

  // Admin sends the quotation
  const send = await req('POST', `/api/quotations/${quotationId}/send`, {}, adminToken);
  check('Quotation sent', send.status === 200 && send.json?.data?.status === 'SENT',
    `status=${send.status} q=${send.json?.data?.status}`);

  // Client login
  const clientLogin = await req('POST', '/api/auth/login', {
    email: client.json.data.email, password: clientPassword, actorType: 'CLIENT',
  });
  const clientToken = clientLogin.json?.data?.token;
  check('Client login', !!clientToken, JSON.stringify(clientLogin.json).slice(0, 200));

  // THE FIX UNDER TEST: client accepts
  const accept = await req('POST', `/api/quotations/${quotationId}/accept`, {}, clientToken);
  const acceptedStatus = accept.json?.data?.quotation?.status;
  const projectId = accept.json?.data?.project?.id;
  check('Accept succeeds (201, no Prisma enum error)', accept.status === 201, JSON.stringify(accept.json).slice(0, 300));
  check('Response quotation.status === ACCEPTED', acceptedStatus === 'ACCEPTED', `got ${acceptedStatus}`);
  check('Response includes created project', !!projectId, JSON.stringify(accept.json?.data?.project).slice(0, 200));

  // DB truth: quotation persisted as ACCEPTED
  const dbQuotation = await prisma.quotation.findUnique({ where: { id: quotationId } });
  check('DB quotation.status === ACCEPTED', dbQuotation?.status === 'ACCEPTED', `got ${dbQuotation?.status}`);

  // Client-facing reads reflect the new state
  const clientQuo = await req('GET', `/api/quotations/me/${quotationId}`, null, clientToken);
  check('GET /quotations/me/:id shows ACCEPTED', clientQuo.json?.data?.status === 'ACCEPTED',
    `got ${clientQuo.json?.data?.status}`);

  const clientProjects = await req('GET', '/api/projects/me', null, clientToken);
  const found = (clientProjects.json?.data ?? []).some((p) => p.id === projectId);
  check('GET /projects/me includes the new project', found,
    `projectId=${projectId} not in list of ${clientProjects.json?.data?.length}`);

  // Double-accept must be rejected (idempotence guard)
  const reaccept = await req('POST', `/api/quotations/${quotationId}/accept`, {}, clientToken);
  check('Re-accepting an ACCEPTED quotation is rejected', reaccept.status === 400, `got ${reaccept.status}`);

  await prisma.$disconnect();
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
