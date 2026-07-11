/**
 * One-command end-to-end verification of the Nexus backend.
 * Run with: npm run smoke-test  (server must already be running: npm run dev)
 *
 * This is NOT a replacement for `npm test` (unit tests) - it's a black-box
 * check that hits the real running API + real database, verifying modules
 * are correctly wired together, not just correct in isolation.
 *
 * Requires Node 18+ (built-in fetch).
 */

const BASE = process.env.NEXUS_BASE_URL || 'http://localhost:4000';
const results = [];

function pass(name) {
  results.push({ name, ok: true });
  console.log(`  \x1b[32m✓\x1b[0m ${name}`);
}
function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? ` — ${detail}` : ''}`);
}

async function req(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
}

async function main() {
  console.log(`\nRunning Nexus smoke test against ${BASE}\n`);

  // --- 0. Health ---
  const health = await req('GET', '/health');
  health.status === 200 ? pass('Health check responds') : fail('Health check responds', `status ${health.status}`);

  // --- 1. Admin login ---
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@nexus.local';
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const login = await req('POST', '/api/auth/login', { email, password, actorType: 'ADMIN' });
  const adminToken = login.json?.data?.token;
  adminToken ? pass('Admin login succeeds') : fail('Admin login succeeds', JSON.stringify(login.json));
  if (!adminToken) {
    console.log('\nCannot continue without a valid admin token - check SEED_ADMIN_EMAIL/PASSWORD match your seed run.\n');
    return summarize();
  }

  // --- 2. Unauthenticated request to an admin route should be rejected ---
  const unauth = await req('GET', '/api/leads');
  unauth.status === 401 ? pass('Unauthenticated request to /leads is rejected (401)') : fail('Unauthenticated request to /leads is rejected (401)', `got ${unauth.status}`);

  // --- 3. Public services list ---
  const services = await req('GET', '/api/services');
  const svcList = services.json?.data || [];
  svcList.length >= 2 ? pass(`Public service catalog has services (${svcList.length} found)`) : fail('Public service catalog has services', 'fewer than 2 seeded services found - did you run npm run prisma:seed?');
  const [svc1, svc2] = svcList;

  // --- 4. Multi-service Lead creation (atomicity happy path) ---
  // Phone/email are suffixed with a run-unique id so this test can be
  // re-run repeatedly against a persistent dev database without colliding
  // with a Client.email created by a previous run (Client.email is @unique
  // in the schema - correct backend behavior, so the test data must not
  // hardcode a fixed value across runs).
  const runId = Date.now().toString().slice(-9);
  const smokeTestPhone = `7${runId}`;
  const smokeTestEmail = `smoketest+${runId}@example.com`;

  const lead = await req('POST', '/api/leads', {
    contactName: 'Smoke Test User',
    phone: smokeTestPhone,
    email: smokeTestEmail,
    services: [{ serviceId: svc1.id }, { serviceId: svc2.id }],
  });
  const leadId = lead.json?.data?.lead?.id;
  const leadServices = lead.json?.data?.leadServices || [];
  (leadId && leadServices.length === 2)
    ? pass('Multi-service enquiry creates 1 Lead with 2 independent Lead Services')
    : fail('Multi-service enquiry creates 1 Lead with 2 independent Lead Services', JSON.stringify(lead.json));

  // --- 5. Atomicity: a bad serviceId should roll back the WHOLE submission ---
  const badLead = await req('POST', '/api/leads', {
    contactName: 'Should Not Exist',
    phone: '7000000001',
    services: [{ serviceId: svc1.id }, { serviceId: '00000000-0000-0000-0000-000000000000' }],
  });
  badLead.status === 400 ? pass('Invalid service in a multi-service enquiry rejects the whole submission') : fail('Invalid service in a multi-service enquiry rejects the whole submission', `got ${badLead.status}`);

  // --- 6. Illegal status transition should be rejected ---
  const leadServiceId = leadServices[0]?.id;
  const illegalTransition = await req('PATCH', `/api/leads/${leadServiceId}/status`, { toStatus: 'COMPLETED' }, adminToken);
  illegalTransition.status === 400 ? pass('Illegal status transition (NEW -> COMPLETED) is rejected') : fail('Illegal status transition (NEW -> COMPLETED) is rejected', `got ${illegalTransition.status}`);

  // --- 7. Legal transition through to APPROVED so we can convert/quote ---
  // CONTACTED -> QUOTE PREPARING skips the optional SITE VISIT stage, which
  // the Status Engine correctly requires a reason for (business rule, not a
  // bug) - see statusEngine.service.ts's isSkippingSiteVisit check.
  const path = [
    { toStatus: 'QUALIFIED' },
    { toStatus: 'CONTACTED' },
    { toStatus: 'QUOTE PREPARING', reason: 'Site visit not required for this smoke-test service' },
    { toStatus: 'QUOTE SENT' },
    { toStatus: 'NEGOTIATION' },
    { toStatus: 'APPROVED' },
  ];
  let lastStatus = 'NEW';
  for (const step of path) {
    const r = await req('PATCH', `/api/leads/${leadServiceId}/status`, step, adminToken);
    if (r.status !== 200) return fail(`Legal transition ${lastStatus} -> ${step.toStatus}`, JSON.stringify(r.json)), summarize();
    lastStatus = step.toStatus;
  }
  pass('Lead Service progresses legally through the full pipeline to APPROVED');

  // --- 8. Quotation creation with server-calculated totals ---
  const quotation = await req('POST', '/api/quotations', {
    leadId,
    items: [{ serviceId: svc1.id, description: 'Smoke test item', quantity: 2, unitPrice: 1000, taxRate: 18 }],
  }, adminToken);
  const grandTotal = quotation.json?.data?.versions?.[0]?.grandTotal;
  Number(grandTotal) === 2360
    ? pass('Quotation grand total is server-calculated correctly (2 x 1000 + 18% GST = 2360)')
    : fail('Quotation grand total is server-calculated correctly', `expected 2360, got ${grandTotal}`);
  const quotationId = quotation.json?.data?.id;
  const versionId = quotation.json?.data?.versions?.[0]?.id;

  // --- 9. Quotation revision preserves version history ---
  await req('POST', `/api/quotations/${quotationId}/revise`, {
    items: [{ serviceId: svc1.id, description: 'Revised item', quantity: 3, unitPrice: 1000, taxRate: 18 }],
  }, adminToken);
  const quoAfterRevision = await req('GET', `/api/quotations/${quotationId}`, null, adminToken);
  const versionCount = quoAfterRevision.json?.data?.versions?.length || 0;
  versionCount === 2 ? pass('Quotation revision creates v2 while v1 remains readable') : fail('Quotation revision creates v2 while v1 remains readable', `expected 2 versions, found ${versionCount}`);

  // --- 10. Approve the original (still-valid at time of creation) version ---
  await req('POST', `/api/quotations/versions/${versionId}/approve`, { approvalMethod: 'PHONE' }, adminToken);

  // --- 11. Convert Lead to Client ---
  const client = await req('POST', `/api/clients/convert/${leadId}`, null, adminToken);
  const clientId = client.json?.data?.id;
  clientId ? pass('Lead converts to Client successfully') : fail('Lead converts to Client successfully', JSON.stringify(client.json));

  // --- 12. Re-converting the same Lead should be rejected ---
  const reconvert = await req('POST', `/api/clients/convert/${leadId}`, null, adminToken);
  reconvert.status === 409 ? pass('Re-converting an already-converted Lead is rejected (409)') : fail('Re-converting an already-converted Lead is rejected (409)', `got ${reconvert.status}`);

  // --- 13. Create Project ---
  const project = await req('POST', '/api/projects', { leadId, clientId }, adminToken);
  const projectId = project.json?.data?.id;
  const aggregateStatus = project.json?.data?.aggregateStatus;
  projectId ? pass(`Project created with derived aggregateStatus: "${aggregateStatus}"`) : fail('Project created', JSON.stringify(project.json));

  // --- 14. Completing the project before services are done should be rejected ---
  const earlyComplete = await req('POST', `/api/projects/${projectId}/complete`, null, adminToken);
  earlyComplete.status === 400 ? pass('Completing a Project with unfinished services is rejected') : fail('Completing a Project with unfinished services is rejected', `got ${earlyComplete.status}`);

  // --- 15. Issue an invoice with mixed tax rates ---
  const invoice = await req('POST', '/api/invoices', {
    projectId, clientId, label: 'Smoke Test Invoice',
    items: [
      { description: 'Item A', quantity: 1, unitPrice: 10000, hsnSacCode: '9954', taxRate: 18 },
      { description: 'Item B', quantity: 1, unitPrice: 5000, hsnSacCode: '8536', taxRate: 12 },
    ],
  }, adminToken);
  const invoiceId = invoice.json?.data?.id;
  const invoiceNumber = invoice.json?.data?.invoiceNumber;
  (invoiceId && /^INV\//.test(invoiceNumber || ''))
    ? pass(`Invoice issued with sequential number: ${invoiceNumber}`)
    : fail('Invoice issued with correct number format', JSON.stringify(invoice.json));

  // --- 16. Record a partial payment, then confirm financial summary math ---
  await req('POST', `/api/invoices/${invoiceId}/payments`, { amount: 5000, method: 'Bank Transfer' }, adminToken);
  const summary = await req('GET', `/api/invoices/project/${projectId}/financial-summary`, null, adminToken);
  const outstanding = summary.json?.data?.outstanding;
  outstanding === 12400
    ? pass('Financial summary correctly reflects partial payment (outstanding = 12400)')
    : fail('Financial summary correctly reflects partial payment', `expected 12400, got ${outstanding}`);

  // --- 17. Overpayment should be rejected ---
  const overpay = await req('POST', `/api/invoices/${invoiceId}/payments`, { amount: 999999, method: 'Cash' }, adminToken);
  overpay.status === 400 ? pass('Overpayment beyond outstanding balance is rejected') : fail('Overpayment beyond outstanding balance is rejected', `got ${overpay.status}`);

  // --- 18. Cancel invoice - number must be preserved ---
  await req('PATCH', `/api/invoices/${invoiceId}/cancel`, { reason: 'Smoke test cancellation' }, adminToken);
  const afterCancel = await req('GET', `/api/invoices/${invoiceId}`, null, adminToken);
  (afterCancel.json?.data?.status === 'CANCELLED' && afterCancel.json?.data?.invoiceNumber === invoiceNumber)
    ? pass('Cancelled invoice preserves its number and remains queryable')
    : fail('Cancelled invoice preserves its number and remains queryable', JSON.stringify(afterCancel.json?.data));

  // --- 19. Disabling a service removes it from the PUBLIC list but not admin history ---
  await req('PATCH', `/api/services/${svc2.id}/disable`, null, adminToken);
  const publicAfterDisable = await req('GET', '/api/services');
  const stillPublic = (publicAfterDisable.json?.data || []).some((s) => s.id === svc2.id);
  !stillPublic ? pass('Disabled service disappears from the public catalog') : fail('Disabled service disappears from the public catalog', 'still visible publicly');

  // --- 20. Global search finds the smoke-test lead by phone ---
  const search = await req('GET', `/api/search?q=${smokeTestPhone}`, null, adminToken);
  const foundLead = (search.json?.data?.leads || []).some((l) => l.id === leadId);
  foundLead ? pass('Global search finds the Lead by phone number') : fail('Global search finds the Lead by phone number', JSON.stringify(search.json?.data?.leads));

  summarize();
}

function summarize() {
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.\n`);
  if (failed.length > 0) {
    console.log('Failed checks:');
    failed.forEach((f) => console.log(`  - ${f.name}${f.detail ? `: ${f.detail}` : ''}`));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('\nSmoke test crashed:', err);
  process.exitCode = 1;
});