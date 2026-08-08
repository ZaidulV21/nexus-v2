/* Phase 8 + Phase 9 regression harness (Tests 1-9): exercises the full
 * Lead -> Client -> Quotation -> Project lineage end-to-end against a live
 * backend. Run with `npm run regression:test` (backend on :4000 required).
 * See README "Phase 8 + Phase 9 regression harness" for details. */
const {
  prisma, check, req, loginAdmin, setClientPassword, loginClient, qualifyLeadServices, summary, resolveCatalog,
  TEST_PASSWORD,
} = require('./regression-helpers');

const state = {};

// Catalog ids are resolved from the DB in main() before any test runs (see
// resolveCatalog in regression-helpers.js); `let` so the tests can read them.
let INTERIOR, ELECTRICAL, WEBSITE, CCTV, PAINTING, FLOORING, LIGHTING, INACTIVE_CCTV_SUB;

let seq = 0;
function nextName(prefix) {
  seq += 1;
  return `${prefix} ${seq}`;
}
function nextEmail(prefix) {
  seq += 1;
  return `reg-${prefix}-${Date.now()}-${seq}@test.local`;
}

async function dataOf(r) {
  return r.json && r.json.success === false ? r.json : (r.json && r.json.data);
}

// Full lineage: lead -> qualify -> convert -> quotation -> approve -> send -> accept -> project
async function runFullLineage(token, { contactName, phone, email, companyName, services }) {
  const leadRes = await req('POST', '/leads', {
    body: { contactName, phone, email, companyName, source: 'WEBSITE', services },
  });
  if (!leadRes.ok) throw new Error(`lead create failed: ${leadRes.status} ${JSON.stringify(leadRes.json)}`);
  const leadData = await dataOf(leadRes);
  const lead = leadData.lead ?? leadData;
  const leadId = lead.id;

  await qualifyLeadServices(leadId, token);

  const conv = await req('POST', `/clients/convert/${leadId}`, { token });
  if (!conv.ok) throw new Error(`convert failed: ${conv.status} ${JSON.stringify(conv.json)}`);
  const client = await dataOf(conv);
  const clientId = client.id;

  await setClientPassword(clientId, TEST_PASSWORD);
  const cl = await loginClient(email, TEST_PASSWORD);
  if (!cl.token) throw new Error('client login failed');

  return { leadId, clientId, clientToken: cl.token, client };
}

async function createQuotation(token, { clientId, leadId, items, discount }) {
  const body = { clientId, leadId, items };
  if (discount) body.discount = discount;
  const res = await req('POST', '/quotations', { token, body });
  if (!res.ok) {
    throw new Error(`quotation create failed: ${res.status} ${JSON.stringify(res.json)}`);
  }
  return await dataOf(res);
}

// approve -> send -> client accept. Returns { acceptResult } or throws.
async function approveSendAccept(adminToken, clientToken, quotationId, clientId) {
  const quo = await req('GET', `/quotations/${quotationId}`, { token: adminToken });
  const q = await dataOf(quo);
  const activeVersion = (q.versions || []).find((v) => v.id === q.activeVersionId) || (q.versions || [])[0];
  const appr = await req('POST', `/quotations/versions/${activeVersion.id}/approve`, {
    token: adminToken, body: { approvalMethod: 'PHONE' },
  });
  if (!appr.ok) throw new Error(`approve failed: ${appr.status} ${JSON.stringify(appr.json)}`);
  const send = await req('POST', `/quotations/${quotationId}/send`, { token: adminToken, body: {} });
  if (!send.ok) throw new Error(`send failed: ${send.status} ${JSON.stringify(send.json)}`);
  const accept = await req('POST', `/quotations/${quotationId}/accept`, { token: clientToken, body: {} });
  if (!accept.ok) throw new Error(`accept failed: ${accept.status} ${JSON.stringify(accept.json)}`);
  return await dataOf(accept);
}

// ---------------------------------------------------------------------------
async function test1(token) {
  console.log('\n===== TEST 1: Multi-service / multi-sub full lineage (Lead -> Quotation -> Project) =====');

  // Setup: ensure Wiring + DB Panel sub-services exist under Electrical.
  let wiring = await prisma.subService.findFirst({ where: { serviceId: ELECTRICAL, name: { in: ['Wiring', 'Wiring & DB Panel'] } } });
  let dbpanel = await prisma.subService.findFirst({ where: { serviceId: ELECTRICAL, name: 'DB Panel' } });
  if (!wiring) {
    const r = await req('POST', `/services/${ELECTRICAL}/sub-services`, {
      token, body: { name: 'Wiring', slug: 'electrical-wiring', shortDescription: 'Power wiring and DB works', isActive: true },
    });
    wiring = await dataOf(r);
  }
  if (!dbpanel) {
    const r = await req('POST', `/services/${ELECTRICAL}/sub-services`, {
      token, body: { name: 'DB Panel', slug: 'electrical-db-panel', shortDescription: 'Distribution board panel installation', isActive: true },
    });
    dbpanel = await dataOf(r);
  }
  check('Test1 setup: Wiring + DB Panel sub-services exist under Electrical', !!(wiring && dbpanel),
    `wiring=${wiring && wiring.id} dbpanel=${dbpanel && dbpanel.id}`);
  state.wiringId = wiring.id;
  state.dbPanelId = dbpanel.id;

  // Lead with Electrical[Wiring, DB Panel] + Website (no sub)
  const { leadId, clientId, clientToken } = await runFullLineage(token, {
    contactName: nextName('T1 Multi Service'),
    phone: '9876500001',
    email: nextEmail('t1'),
    companyName: 'T1 Multi Services Pvt Ltd',
    services: [
      { serviceId: ELECTRICAL, subServiceIds: [wiring.id, dbpanel.id] },
      { serviceId: WEBSITE },
    ],
  });
  state.t1 = { leadId, clientId, clientToken };

  const dbLead = await prisma.lead.findUnique({ where: { id: leadId }, include: { leadServices: { include: { subServices: true } } } });
  const lsByService = new Map(dbLead.leadServices.map((ls) => [ls.serviceId, ls]));
  check('Test1: Lead has 2 services (Electrical + Website)', dbLead.leadServices.length === 2, `count=${dbLead.leadServices.length}`);
  const electricalLs = lsByService.get(ELECTRICAL);
  check('Test1: Electrical LeadService carries 2 sub-services (Wiring + DB Panel)', !!electricalLs && electricalLs.subServices.length === 2,
    `subs=${electricalLs && electricalLs.subServices.length}`);

  const quotation = await createQuotation(token, {
    clientId, leadId,
    items: [
      { serviceId: ELECTRICAL, subServiceId: wiring.id, description: 'Full building wiring', quantity: 1, unit: 'Job', unitPrice: 250000, taxRate: 18 },
      { serviceId: ELECTRICAL, subServiceId: dbpanel.id, description: 'DB Panel installation', quantity: 1, unit: 'Nos', unitPrice: 45000, taxRate: 18 },
      { serviceId: WEBSITE, description: 'Corporate website build', quantity: 1, unit: 'Job', unitPrice: 120000, taxRate: 18 },
    ],
  });
  check('Test1: quotation created with subServiceId items', quotation && quotation.id, `quotation=${quotation && quotation.id}`);
  state.t1.quotationId = quotation.id;
  state.t1.expectedGrandTotal = Number(quotation.versions[0].grandTotal);

  const acc = await approveSendAccept(token, clientToken, quotation.id, clientId);
  const project = acc.project;
  check('Test1: accept returns a project', !!project, `project=${project && project.id}`);
  check('Test1: project.quotationId links to origin quotation (Phase 9)', project.quotationId === quotation.id,
    `project.quotationId=${project.quotationId}`);

  const projDetail = await req('GET', `/projects/${project.id}`, { token });
  const pd = await dataOf(projDetail);
  const services = pd.projectServices || pd.services || [];
  const projServiceMap = new Map(services.map((s) => [s.serviceId, s]));
  check('Test1: project has 2 services', services.length === 2, `count=${services.length}`);
  const elecPS = projServiceMap.get(ELECTRICAL);
  const webPS = projServiceMap.get(WEBSITE);
  const elecSubIds = ((elecPS && elecPS.subServices) || []).map((s) => s.subServiceId);
  check('Test1: Electrical project service has Wiring + DB Panel sub-services', !!elecPS && elecSubIds.includes(wiring.id) && elecSubIds.includes(dbpanel.id),
    `subs=[${elecSubIds.join(',')}]`);
  check('Test1: Website project service has no sub-services', !!webPS && (!webPS.subServices || webPS.subServices.length === 0));

  const pss = await prisma.projectSubService.findMany({
    where: { projectService: { projectId: project.id } },
    include: { projectService: true },
  });
  check('Test1: project_sub_services rows exist (Phase 9 derived)', pss.length === 2, `rows=${pss.length}`);
  check('Test1: all project_sub_services belong to Electrical', pss.every((p) => p.projectService.serviceId === ELECTRICAL));

  const lsAfter = await prisma.leadService.findMany({ where: { leadId }, orderBy: { status: 'asc' } });
  check('Test1: lead services advanced to PROJECT CREATED', lsAfter.length === 2 && lsAfter.every((l) => l.status === 'PROJECT CREATED'),
    lsAfter.map((l) => `${l.serviceId}:${l.status}`).join(' '));

  return project.id;
}

// ---------------------------------------------------------------------------
async function test2(token) {
  console.log('\n===== TEST 2: Single service lineage (Interior -> Painting) =====');
  const { leadId, clientId, clientToken } = await runFullLineage(token, {
    contactName: nextName('T2 Single Service'),
    phone: '9876500002',
    email: nextEmail('t2'),
    companyName: 'T2 Interiors',
    services: [{ serviceId: INTERIOR, subServiceIds: [PAINTING] }],
  });
  state.t2 = { leadId, clientId, clientToken };

  const quotation = await createQuotation(token, {
    clientId, leadId,
    items: [
      { serviceId: INTERIOR, subServiceId: PAINTING, description: 'Interior painting', quantity: 500, unit: 'Sq Ft', unitPrice: 120, taxRate: 18 },
      { serviceId: INTERIOR, description: 'False ceiling basic', quantity: 1, unit: 'Job', unitPrice: 85000, taxRate: 18 },
    ],
  });
  check('Test2: quotation created', quotation && quotation.id, `quotation=${quotation && quotation.id}`);
  state.t2.quotationId = quotation.id;

  const acc = await approveSendAccept(token, clientToken, quotation.id, clientId);
  const project = acc.project;
  check('Test2: project created', !!project, `project=${project && project.id}`);

  const projDetail = await req('GET', `/projects/${project.id}`, { token });
  const pd = await dataOf(projDetail);
  const services = pd.projectServices || [];
  check('Test2: project has exactly 1 service (Interior)', services.length === 1 && services[0].serviceId === INTERIOR,
    `count=${services.length} serviceId=${services[0] && services[0].serviceId}`);
  const subs = (services[0].subServices || []).map((s) => s.subServiceId);
  check('Test2: Interior project service derived Painting sub-service', subs.includes(PAINTING), `subs=[${subs.join(',')}]`);

  const pss = await prisma.projectSubService.findMany({ where: { projectService: { projectId: project.id } } });
  check('Test2: project_sub_services has 1 row', pss.length === 1 && pss[0].subServiceId === PAINTING, `rows=${pss.length}`);

  return project.id;
}

// ---------------------------------------------------------------------------
async function test3(token) {
  console.log('\n===== TEST 3: Manual quotation + edit/delete items + validation =====');
  const { leadId, clientId } = await runFullLineage(token, {
    contactName: nextName('T3 Manual Quote'),
    phone: '9876500003',
    email: nextEmail('t3'),
    companyName: 'T3 Manual Quoting Co',
    services: [{ serviceId: INTERIOR, subServiceIds: [PAINTING, FLOORING] }],
  });
  state.t3 = { leadId, clientId };

  // Manual quotation (3 items, not derived from a wizard).
  const manual = await createQuotation(token, {
    clientId, leadId,
    items: [
      { serviceId: INTERIOR, subServiceId: PAINTING, description: 'Painting - living room', quantity: 300, unit: 'Sq Ft', unitPrice: 110, taxRate: 18 },
      { serviceId: INTERIOR, subServiceId: FLOORING, description: 'Vitrified flooring', quantity: 250, unit: 'Sq Ft', unitPrice: 95, taxRate: 18 },
      { serviceId: INTERIOR, description: 'Modular kitchen (base)', quantity: 1, unit: 'Job', unitPrice: 300000, taxRate: 18 },
    ],
  });
  check('Test3: manual quotation created', manual && manual.id, `quotation=${manual && manual.id}`);
  const q0 = manual;
  check('Test3: initial version is v1 with 3 items', q0.versions.length === 1 && q0.versions[0].items.length === 3,
    `versions=${q0.versions.length} items=${q0.versions[0].items.length}`);
  const total0 = Number(q0.versions[0].grandTotal);

  // Edit: change qty of item1, delete item3, add a new item2 via revise.
  const reviseItems = [
    { serviceId: INTERIOR, subServiceId: PAINTING, description: 'Painting - living room (extra coat)', quantity: 400, unit: 'Sq Ft', unitPrice: 110, taxRate: 18 },
    { serviceId: INTERIOR, subServiceId: FLOORING, description: 'Vitrified flooring', quantity: 250, unit: 'Sq Ft', unitPrice: 95, taxRate: 18 },
    { serviceId: INTERIOR, subServiceId: LIGHTING, description: 'LED lighting package', quantity: 20, unit: 'Nos', unitPrice: 2500, taxRate: 18 },
  ];
  const rev = await req('POST', `/quotations/${manual.id}/revise`, { token, body: { items: reviseItems } });
  check('Test3: revise succeeds', rev.ok, `${rev.status} ${JSON.stringify(rev.json)}`);
  const q1 = await dataOf(rev);
  const v1 = q1.versions.find((v) => v.id === q1.activeVersionId) || q1.versions[q1.versions.length - 1];
  check('Test3: revision created v2 with 3 (edited) items', v1.versionNumber === 2 && v1.items.length === 3,
    `version=${v1.versionNumber} items=${v1.items.length}`);
  check('Test3: edited qty reflected (400 sqft painting)', v1.items.find((i) => i.subServiceId === PAINTING).quantity == 400);
  check('Test3: modular kitchen line removed', !v1.items.some((i) => i.description.includes('Modular kitchen')));
  check('Test3: new lighting line added', v1.items.some((i) => i.subServiceId === LIGHTING));
  check('Test3: grand total recomputed on revision', Number(v1.grandTotal) !== total0, `${total0} -> ${v1.grandTotal}`);
  check('Test3: status reset to DRAFT after revision', q1.status === 'DRAFT', `status=${q1.status}`);

  // Validation negatives.
  const neg1 = await req('POST', '/quotations', {
    token,
    body: {
      clientId, leadId,
      items: [{ serviceId: ELECTRICAL, subServiceId: PAINTING, description: 'Mismatch', quantity: 1, unitPrice: 100, taxRate: 18 }],
    },
  });
  check('Test3: sub-service from a DIFFERENT service rejected', !neg1.ok && neg1.status >= 400, `status=${neg1.status}`);

  const neg2 = await req('POST', '/quotations', {
    token,
    body: {
      clientId, leadId,
      items: [{ serviceId: CCTV, subServiceId: INACTIVE_CCTV_SUB, description: 'Inactive sub', quantity: 1, unitPrice: 100, taxRate: 18 }],
    },
  });
  check('Test3: inactive/archived sub-service rejected', !neg2.ok && neg2.status >= 400, `status=${neg2.status}`);

  const neg3 = await req('POST', '/quotations', { token, body: { leadId, items: [{ serviceId: INTERIOR, description: 'No client', quantity: 1, unitPrice: 100, taxRate: 18 }] } });
  check('Test3: quotation without clientId rejected', !neg3.ok && neg3.status >= 400, `status=${neg3.status}`);

  const neg4 = await req('POST', '/quotations', { token, body: { clientId, leadId, items: [] } });
  check('Test3: empty items rejected', !neg4.ok && neg4.status >= 400, `status=${neg4.status}`);

  const neg5 = await req('POST', `/quotations/${manual.id}/revise`, {
    token,
    body: { items: [{ serviceId: ELECTRICAL, subServiceId: PAINTING, description: 'Painting under Electrical', quantity: 1, unitPrice: 100, taxRate: 18 }] },
  });
  check('Test3: revise with mismatched sub-service rejected', !neg5.ok && neg5.status >= 400, `status=${neg5.status}`);
}

// ---------------------------------------------------------------------------
async function test4(token) {
  console.log('\n===== TEST 4: Existing pre-Phase-8 quotations render/edit/send/portal =====');

  // Find a pre-Phase-8 quotation: any active-version item with subServiceId IS
  // null means its lines predate Phase 8 (they were created without sub refs).
  // (All existing pre-Phase-8 quotations happen to be ACCEPTED, so no status
  // filter here - the revision flow is what proves edit/resend still works.)
  const all = await prisma.quotation.findMany({
    include: { versions: { include: { items: true, approvals: true }, orderBy: { versionNumber: 'desc' } } },
    orderBy: { createdAt: 'asc' },
  });
  let pre = all.find((q) =>
    (q.versions.find((v) => v.id === q.activeVersionId) || q.versions[0]).items.every((i) => i.subServiceId === null)
  );
  if (!pre && state.t1) {
    // Fresh baseline: no legacy quotations survive a migrate reset. Synthesise
    // one in the pre-Phase-8 shape (every item without subServiceId) so the
    // legacy render/revise/approve/send/portal path is still exercised.
    const legacy = await createQuotation(token, {
      clientId: state.t1.clientId, leadId: state.t1.leadId,
      items: [
        { serviceId: ELECTRICAL, description: 'Legacy wiring line', quantity: 1, unit: 'Job', unitPrice: 100000, taxRate: 18 },
        { serviceId: ELECTRICAL, description: 'Legacy panel line', quantity: 1, unit: 'Job', unitPrice: 30000, taxRate: 18 },
      ],
    });
    pre = legacy && { id: legacy.id, clientId: state.t1.clientId, quotationNumber: legacy.quotationNumber };
  }
  check('Test4: found a pre-Phase-8 quotation (existing or synthesised)', !!pre, `quotation=${pre && pre.quotationNumber} (${pre && pre.id})`);
  if (!pre) return;
  const qId = pre.id;
  state.t4 = { quotationId: qId, clientId: pre.clientId };

  // Render via admin.
  const render = await req('GET', `/quotations/${qId}`, { token });
  check('Test4: admin renders pre-Phase-8 quotation', render.ok, `status=${render.status}`);
  const rq = await dataOf(render);
  const rv = rq.versions.find((v) => v.id === rq.activeVersionId) || rq.versions[0];
  check('Test4: rendered items carry serviceName (denormalized)', rv.items.every((i) => i.serviceName), `count=${rv.items.length}`);
  check('Test4: rendered items have null subServiceId (unchanged)', rv.items.every((i) => i.subServiceId === null));

  // Edit via revise - keep all lines, tweak one quantity.
  const editedItems = rv.items.map((i, idx) => ({
    serviceId: i.serviceId,
    subServiceId: i.subServiceId || undefined,
    description: i.description,
    quantity: idx === 0 ? Number(i.quantity) + 1 : Number(i.quantity),
    unit: i.unit === 'None' ? undefined : i.unit,
    unitPrice: Number(i.unitPrice),
    taxRate: Number(i.taxRate),
  }));
  const rev = await req('POST', `/quotations/${qId}/revise`, { token, body: { items: editedItems } });
  check('Test4: pre-Phase-8 quotation can be revised (edit items)', rev.ok, `${rev.status} ${JSON.stringify(rev.json)}`);
  const revQ = await dataOf(rev);
  const revV = revQ.versions.find((v) => v.id === revQ.activeVersionId) || revQ.versions[revQ.versions.length - 1];
  const prevMaxVer = Math.max(...rq.versions.map((v) => v.versionNumber));
  check('Test4: revision incremented version (no mutation of old versions)',
    revV.versionNumber === prevMaxVer + 1,
    `v${prevMaxVer} -> v${revV.versionNumber}`);

  // Approve + send (old quotation was never sent before).
  const appr = await req('POST', `/quotations/versions/${revV.id}/approve`, { token, body: { approvalMethod: 'PHONE' } });
  const send = await req('POST', `/quotations/${qId}/send`, { token, body: {} });
  check('Test4: pre-Phase-8 quotation can be approved + sent', appr.ok && send.ok, `appr=${appr.status} send=${send.status}`);

  // Portal: client can view after send.
  await setClientPassword(pre.clientId, TEST_PASSWORD);
  const clientRow = await prisma.client.findUnique({ where: { id: pre.clientId } });
  const cl = await loginClient(clientRow.email, TEST_PASSWORD);
  const portal = await req('GET', `/quotations/me/${qId}`, { token: cl.token });
  check('Test4: client portal renders sent pre-Phase-8 quotation', portal.ok, `status=${portal.status}`);
  const pq = await dataOf(portal);
  check('Test4: portal shows items + grand total', pq && pq.versions && pq.versions[0].items.length > 0, `total=${pq && pq.versions && pq.versions[0].grandTotal}`);
}

// ---------------------------------------------------------------------------
async function test5(token) {
  console.log('\n===== TEST 5: Existing pre-Phase-9 projects + status workflow + portal =====');

  // A pre-Phase-9 project: created before the Phase-9 migration, with at
  // least one service still in a mutable state (so the workflow can run).
  // Pre-Phase-9 rows only exist when the DB predates the Phase-9 migration;
  // on a clean baseline fall back to a project created earlier in this run
  // whose services are still in a mutable state.
  let pre = (await prisma.project.findMany({
    where: {
      createdAt: { lt: new Date('2026-08-07T00:00:00Z') },
      projectServices: { some: { status: { in: ['PROJECT CREATED', 'IN PROGRESS', 'ON HOLD'] } } },
    },
    include: { projectServices: true },
    orderBy: { createdAt: 'asc' },
  })).sort((a, b) => b.projectServices.length - a.projectServices.length)[0];
  const legacyMode = !!pre;
  if (!pre) {
    pre = (await prisma.project.findMany({
      where: { projectServices: { some: { status: { in: ['PROJECT CREATED', 'IN PROGRESS', 'ON HOLD'] } } } },
      include: { projectServices: true },
      orderBy: { createdAt: 'asc' },
    })).sort((a, b) => b.projectServices.length - a.projectServices.length)[0];
  }
  check('Test5: found a multi-service project with mutable services', !!pre && pre.projectServices.length >= 2,
    `project=${pre && pre.id} services=${pre && pre.projectServices.length}${legacyMode ? ' (legacy)' : ' (fresh baseline)'}`);
  if (!pre) return;
  const pId = pre.id;
  state.t5 = { projectId: pId, clientId: pre.clientId };

  const detail = await req('GET', `/projects/${pId}`, { token });
  const pd = await dataOf(detail);
  const services = pd.projectServices || [];
  check('Test5: project detail renders services with statuses', services.length >= 2 && services.every((s) => s.status), `count=${services.length}`);
  check('Test5: project detail renders subServices array (may be empty for pre-Phase-9)',
    services.every((s) => Array.isArray(s.subServices)));

  // Status workflow: exercise legal moves from the service's current state.
  const target = services.find((s) => ['PROJECT CREATED', 'IN PROGRESS', 'ON HOLD'].includes(s.status));
  if (target) {
    const steps = {
      'PROJECT CREATED': ['IN PROGRESS', 'ON HOLD', 'IN PROGRESS'],
      'IN PROGRESS': ['ON HOLD', 'IN PROGRESS'],
      'ON HOLD': ['IN PROGRESS'],
    }[target.status];
    let allOk = true;
    for (const to of steps) {
      const s = await req('PATCH', `/projects/services/${target.id}/status`, { token, body: { toStatus: to, reason: `Regression T5: -> ${to}` } });
      if (!s.ok) { allOk = false; console.log(`    workflow step ${to} failed: ${s.status} ${JSON.stringify(s.json)}`); }
    }
    check(`Test5: project status workflow ${target.status} -> ${steps.join(' -> ')}`, allOk, `service=${target.id}`);
  } else {
    check('Test5: found a mutable project service for workflow test', false, 'none available');
  }

  // Portal view of the existing project (log in as that project's client).
  const portalClientRow = await prisma.client.findUnique({ where: { id: pre.clientId } });
  if (portalClientRow) {
    await setClientPassword(pre.clientId, TEST_PASSWORD);
    const cl = await loginClient(portalClientRow.email, TEST_PASSWORD);
    const mine = await req('GET', '/projects/me', { token: cl.token });
    check('Test5: client portal lists own projects', mine.ok, `status=${mine.status}`);
    const mineData = await dataOf(mine);
    const found = (Array.isArray(mineData) ? mineData : mineData.items || []).some((p) => p.id === pId);
    check('Test5: existing pre-Phase-9 project visible in client portal', found);
    const mineOne = await req('GET', `/projects/me/${pId}`, { token: cl.token });
    check('Test5: client portal renders pre-Phase-9 project detail', mineOne.ok, `status=${mineOne.status}`);
  } else {
    check('Test5: existing project client available for portal', false, 'no client row');
  }
}

// ---------------------------------------------------------------------------
async function test6(token, adminClientToken) {
  console.log('\n===== TEST 6: Invoice creation from existing + new quotation (totals unchanged) =====');

  // Invoice for the NEW project born from Test 1's accepted quotation.
  const newProjectId = state.t1 ? await prisma.project.findFirst({ where: { leadId: state.t1.leadId }, select: { id: true } }).then((p) => p.id) : null;
  const t1client = state.t1 && state.t1.clientId;
  if (newProjectId && t1client) {
    const inv = await req('POST', '/invoices', {
      token,
      body: {
        projectId: newProjectId, clientId: t1client, label: 'Advance - Electrical wiring',
        items: [
          { description: 'Wiring materials', quantity: 1, unitPrice: 150000, hsnSacCode: '8537', taxRate: 18 },
          { description: 'Labour - wiring', quantity: 1, unitPrice: 50000, hsnSacCode: '9987', taxRate: 18 },
        ],
      },
    });
    check('Test6: invoice created for Phase-8/9 project', inv.ok, `${inv.status} ${JSON.stringify(inv.json)}`);
    const invData = await dataOf(inv);
    state.t6 = { newInvoiceId: invData.id };
    const expected = 150000 + 50000 + 0.18 * (150000 + 50000);
    check('Test6: invoice grandTotal computed correctly', Number(invData.grandTotal) === expected, `grandTotal=${invData.grandTotal}`);
  } else {
    check('Test6: new project available for invoice', false, 'missing new project');
  }

  // Invoice for an EXISTING pre-Phase-8 project (fetched directly from DB so
  // we don't depend on the list endpoint's projection).
  const existing = await prisma.project.findFirst({
    where: { quotationId: { not: null } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, clientId: true },
  });
  if (existing) {
    const inv2 = await req('POST', '/invoices', {
      token,
      body: {
        projectId: existing.id, clientId: existing.clientId, label: 'Regression test invoice',
        items: [{ description: 'Retainer', quantity: 1, unitPrice: 10000, hsnSacCode: '9983', taxRate: 18 }],
      },
    });
    check('Test6: invoice created for existing project', inv2.ok, `${inv2.status} ${JSON.stringify(inv2.json)}`);

    const fs = await req('GET', `/invoices/project/${existing.id}/financial-summary`, { token });
    check('Test6: project financial summary renders', fs.ok, `status=${fs.status}`);
  } else {
    check('Test6: existing project available for invoice', false, 'none with quotationId');
  }

  // Totals unchanged: re-fetch Test 1 quotation and Test 2 quotation.
  if (state.t1 && state.t1.quotationId) {
    const q = await req('GET', `/quotations/${state.t1.quotationId}`, { token });
    const qd = await dataOf(q);
    check('Test6: Phase-8/9 quotation totals unchanged after invoicing', Number(qd.versions[0].grandTotal) === state.t1.expectedGrandTotal,
      `grandTotal=${qd.versions[0].grandTotal}`);
  }
  if (state.t2 && state.t2.quotationId) {
    const q = await req('GET', `/quotations/${state.t2.quotationId}`, { token });
    const qd = await dataOf(q);
    check('Test6: Test2 quotation totals intact', qd && qd.versions && qd.versions[0].grandTotal > 0, `grandTotal=${qd && qd.versions && qd.versions[0].grandTotal}`);
  }
}

// ---------------------------------------------------------------------------
async function test7(token) {
  console.log('\n===== TEST 7: Client service history (multi-services, multiple conversions) =====');

  const baseClientId = state.t1 && state.t1.clientId;
  check('Test7: Test1 client exists', !!baseClientId, `client=${baseClientId}`);
  if (!baseClientId) return;

  // Repeat enquiry: new Lead attached to the SAME client (repeat conversion path).
  const repeatEmail = nextEmail('t7');
  const leadRes = await req('POST', '/leads', {
    body: {
      contactName: nextName('T7 Repeat Enquiry'), phone: '9876500007', email: repeatEmail,
      source: 'WEBSITE', clientId: baseClientId,
      services: [{ serviceId: CCTV, subServiceIds: [] }],
    },
  });
  const leadData = await dataOf(leadRes);
  const leadId = leadData.lead ? leadData.lead.id : leadData.id;
  check('Test7: repeat enquiry lead created for existing client', !!leadId, `lead=${leadId}`);

  await qualifyLeadServices(leadId, token);
  const conv = await req('POST', `/clients/convert/${leadId}`, { token });
  const convData = await dataOf(conv);
  console.log('    T7 convert raw:', conv.status, JSON.stringify(conv.json).slice(0, 300));
  check('Test7: repeat lead converts to SAME client (no duplicate account)', conv.ok && convData && convData.id === baseClientId,
    `ok=${conv.ok} status=${conv.status} converted=${convData && convData.id}`, );
  if (!conv.ok) console.log('    convert body:', JSON.stringify(conv.json).slice(0, 400));

  // Quotation + accept for the repeat lead -> second project for this client.
  const quotation = await createQuotation(token, {
    clientId: baseClientId, leadId,
    items: [{ serviceId: CCTV, description: 'Commercial CCTV system', quantity: 8, unit: 'Nos', unitPrice: 18500, taxRate: 18 }],
  });
  check('Test7: quotation for repeat lead created', quotation && quotation.id, `quotation=${quotation && quotation.id}`);

  const acc = await approveSendAccept(token, state.t1.clientToken, quotation.id, baseClientId);
  check('Test7: second project created from repeat lead', !!acc.project, `project=${acc.project && acc.project.id}`);
  state.t7 = { secondProjectId: acc.project && acc.project.id };

  // Client service history should now show Electrical, Website AND CCTV.
  const hist = await req('GET', `/clients/${baseClientId}/services`, { token });
  const services = await dataOf(hist);
  const names = (services || []).map((s) => s && s.name);
  check('Test7: service history spans multiple conversions + services', names.includes('Electrical Work') && names.includes('Website & IT Services') && names.includes('CCTV Installation'),
    `services=[${names.join(' | ')}]`);

  const leads = await req('GET', `/clients/${baseClientId}/leads`, { token });
  const leadList = await dataOf(leads);
  check('Test7: client lists both source + repeat leads', (leadList || []).length >= 2, `leads=${(leadList || []).length}`);
}

// ---------------------------------------------------------------------------
async function test8(token) {
  console.log('\n===== TEST 8: Timeline / audit no duplicates =====');

  const targets = [];
  if (state.t1) targets.push(['LEAD', state.t1.leadId], ['QUOTATION', state.t1.quotationId], ['CLIENT', state.t1.clientId]);
  if (state.t7 && state.t7.secondProjectId) targets.push(['PROJECT', state.t7.secondProjectId]);
  if (state.t5) targets.push(['PROJECT', state.t5.projectId]);
  if (targets.length === 0) { check('Test8: targets available', false, 'none'); return; }

  for (const [entityType, entityId] of targets) {
    const tl = await req('GET', `/timeline/${entityType}/${entityId}`, { token });
    const events = await dataOf(tl);
    const ids = (events || []).map((e) => e.id);
    check(`Test8: timeline for ${entityType} has no duplicate event ids`, new Set(ids).size === ids.length, `events=${ids.length}`);

    const au = await req('GET', `/audit-logs/${entityType}/${entityId}`, { token });
    const audits = await dataOf(au);
    const auIds = (audits || []).map((e) => e.id);
    check(`Test8: audit trail for ${entityType} has no duplicate ids`, new Set(auIds).size === auIds.length, `audits=${auIds.length}`);
  }

  // Quotation accept should NOT have duplicated QUOTATION_ACCEPTED events.
  if (state.t1 && state.t1.quotationId) {
    const tl = await req('GET', `/timeline/QUOTATION/${state.t1.quotationId}`, { token });
    const events = await dataOf(tl);
    const accepted = (events || []).filter((e) => e.eventType === 'QUOTATION_ACCEPTED');
    check('Test8: single QUOTATION_ACCEPTED event (no duplicates)', accepted.length === 1, `count=${accepted.length}`);
  }
}

// ---------------------------------------------------------------------------
async function test9() {
  console.log('\n===== TEST 9: Direct DB integrity chains + orphans =====');

  // Chain for Test 1: lead -> client -> quotation -> project.
  if (state.t1 && state.t1.quotationId && state.t1.leadId) {
    const quotation = await prisma.quotation.findUnique({ where: { id: state.t1.quotationId }, include: { projects: true, versions: { include: { projectServices: true } } } });
    check('Test9: quotation.leadId == lead.id', quotation.leadId === state.t1.leadId);
    check('Test9: quotation.clientId == client.id', quotation.clientId === state.t1.clientId);
    check('Test9: quotation has exactly 1 project', quotation.projects.length === 1, `projects=${quotation.projects.length}`);

    const project = quotation.projects[0];
    check('Test9: project.quotationId points back at the quotation', project.quotationId === quotation.id);

    // Every ProjectService with assignedQuotationVersionId matches a version of the origin quotation.
    const projectServices = await prisma.projectService.findMany({
      where: { projectId: project.id },
      include: { subServices: true, assignedQuotationVersion: true },
    });
    const versionIds = new Set(quotation.versions.map((v) => v.id));
    check('Test9: all assignedQuotationVersionIds are versions of origin quotation',
      projectServices.every((ps) => !ps.assignedQuotationVersionId || versionIds.has(ps.assignedQuotationVersionId)));

    // ProjectSubService rows reference real sub-services and real project services (no orphans).
    const pss = await prisma.projectSubService.findMany({
      where: { projectService: { projectId: project.id } },
      include: { subService: true, projectService: true },
    });
    check('Test9: project_sub_services fully resolved (no orphan FKs)',
      pss.length > 0 && pss.every((p) => p.subService && p.projectService), `rows=${pss.length}`);

    // Lead services marked PROJECT CREATED mirror the project services exactly.
    const leadServices = await prisma.leadService.findMany({ where: { leadId: state.t1.leadId } });
    const serviceIdSet = new Set(projectServices.map((ps) => ps.serviceId));
    check('Test9: every converted service has a matching project service',
      leadServices.length === projectServices.length && leadServices.every((ls) => serviceIdSet.has(ls.serviceId)),
      `leadServices=${leadServices.length} projectServices=${projectServices.length}`);
  }

  // Orphan scan across the whole DB. These relations are required/non-null, so
  // Prisma's generated where types can't express `is: null`; run raw LEFT JOIN
  // FK-integrity queries to genuinely detect orphaned rows.
  const orphanQuotes = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM quotations q LEFT JOIN leads l ON l.id = q."leadId" WHERE l.id IS NULL`;
  const orphanProjects = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM projects p LEFT JOIN leads l ON l.id = p."leadId" WHERE l.id IS NULL`;
  const orphanQuotationProjects = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM projects p WHERE p."quotationId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM quotations q WHERE q.id = p."quotationId")`;
  const orphanPss = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM project_sub_services ps LEFT JOIN project_services pss ON pss.id = ps."projectServiceId" WHERE pss.id IS NULL`;
  const n = (rows) => Number(rows[0].count);
  check('Test9: no orphan quotations (lead relation broken)', n(orphanQuotes) === 0, `count=${n(orphanQuotes)}`);
  check('Test9: no orphan projects (lead relation broken)', n(orphanProjects) === 0, `count=${n(orphanProjects)}`);
  check('Test9: no projects pointing at missing quotations', n(orphanQuotationProjects) === 0, `count=${n(orphanQuotationProjects)}`);
  check('Test9: no orphan project_sub_services rows', n(orphanPss) === 0, `count=${n(orphanPss)}`);
}

// ---------------------------------------------------------------------------
async function main() {
  console.log('=== Phase 8 + Phase 9 REGRESSION HARNESS ===');
  const adminToken = await loginAdmin();
  check('setup: admin login', !!adminToken);

  const cat = await resolveCatalog();
  ({ INTERIOR, ELECTRICAL, WEBSITE, CCTV, PAINTING, FLOORING, LIGHTING, INACTIVE_CCTV_SUB } = cat);

  const tests = [
    ['Test1', () => test1(adminToken)],
    ['Test2', () => test2(adminToken)],
    ['Test3', () => test3(adminToken)],
    ['Test4', () => test4(adminToken)],
    ['Test5', () => test5(adminToken)],
    ['Test6', () => test6(adminToken)],
    ['Test7', () => test7(adminToken)],
    ['Test8', () => test8(adminToken)],
    ['Test9', () => test9()],
  ];
  for (const [name, fn] of tests) {
    try {
      await fn();
    } catch (err) {
      check(`${name}: harness error`, false, err && err.message ? err.message : String(err));
    }
  }

  const s = summary();
  await prisma.$disconnect();
  process.exit(s.fail === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error('\nHARNESS ERROR:', err);
  const s = summary();
  await prisma.$disconnect();
  process.exit(1);
});

module.exports = { test1, test2, test3, test4, test5, test6, test7, test8, test9, state };
