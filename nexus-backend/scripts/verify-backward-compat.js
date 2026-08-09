/* eslint-disable no-console */
/**
 * PHASE 14 — BACKWARD COMPATIBILITY & DATA-INTEGRITY AUDIT
 *
 * Verifies every "must not break / must not lose data" guarantee for the
 * existing deployment:
 *
 *   1. Schema-change discipline  — the Phase 13a/13b migrations are applied and
 *      the legacy JSON columns really were dropped after the backfill.
 *   2. No data loss over time     — row counts per entity are snapshotted and
 *      compared against the previous run; a decrease is flagged (hard-fail with
 *      --fail-on-loss).
 *   3. Referential integrity      — no orphaned rows / broken FKs across Leads,
 *      Clients, Quotations (+versions/items), Projects (+services/sub-services),
 *      Invoices and Payments; every Client's sourceLeadId still resolves.
 *   4. Financial integrity        — quotation-version and invoice totals are
 *      recomputed from line items with the exact app formulas; any drift or
 *      overpayment is a breakage.
 *   5. API contract               — the Phase 13 assembled shapes (features /
 *      whatsIncluded / process / faqs / testimonials / gallery / SEO) still
 *      come back on the public endpoints, and match the normalized tables
 *      row-for-row (proves the backfill lost nothing).
 *
 * Run: node scripts/verify-backward-compat.js   (DB required; API part needs
 *                                                the server on :4000, else it
 *                                                is skipped with a warning)
 * Flags: --fail-on-loss  (turn snapshot count decreases into hard failures)
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const BASE = process.env.NEXUS_BASE_URL || 'http://localhost:4000';
const SNAPSHOT_DIR = path.join(__dirname, 'snapshots');
const SNAPSHOT_PATH = path.join(SNAPSHOT_DIR, 'backward-compat-snapshot.json');
const FAIL_ON_LOSS = process.argv.includes('--fail-on-loss');
const TOLERANCE = 0.02;

let failures = 0;
const warnings = [];
const results = [];

function check(name, ok, detail) {
  results.push({ name, ok });
  console.log(`  ${ok ? '\x1b[32m\u2713\x1b[0m' : '\x1b[31m\u2717\x1b[0m'} ${name}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}
function warn(name, detail) {
  warnings.push({ name, detail });
  console.log(`  \x1b[33m!\x1b[0m ${name} — ${detail}`);
}
const num = (rows) => Number(rows[0].count);

// ---------------------------------------------------------------------------
// Part 0 — Schema-change discipline (migrations applied, legacy columns gone)
// ---------------------------------------------------------------------------
async function auditSchema() {
  console.log('\n== 1. Schema change discipline (migrations + backfill) ==');

  const migs = await prisma.$queryRawUnsafe(
    'SELECT migration_name, finished_at FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND migration_name LIKE \'%phase13%\'',
  );
  const applied = new Set(migs.map((m) => m.migration_name));
  check('Phase 13a (normalized CMS tables + backfill) migration applied', applied.has('20260809172248_phase13a_cms_normalized_tables'),
    `found [${[...applied].join(', ')}]`);
  check('Phase 13b (drop legacy JSON columns) migration applied', applied.has('20260809230124_phase13b_drop_legacy_json_columns'),
    `found [${[...applied].join(', ')}]`);

  const legacy = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS count FROM information_schema.columns
     WHERE table_name IN ('services','sub_services')
       AND column_name IN ('features','gallery','whatsIncluded','process','faqs','testimonials',
                           'seoTitle','metaDescription','metaKeywords','ogImage','canonicalUrl','structuredData')`,
  );
  check('Legacy JSON/SEO columns no longer exist on services/sub_services', num(legacy) === 0, `still present: ${num(legacy)}`);

  const cmsTables = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS count FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN
       ('service_features','service_included_items','service_process_steps','service_faqs',
        'service_testimonials','service_seo','sub_service_features','sub_service_included_items',
        'sub_service_process_steps','sub_service_faqs','sub_service_media','sub_service_seo')`,
  );
  check('All 12 normalized CMS child tables exist', num(cmsTables) === 12, `found ${num(cmsTables)}`);
}

// ---------------------------------------------------------------------------
// Part 1 — Snapshot: row counts per entity, compared against the last run
// ---------------------------------------------------------------------------
const COUNT_MODELS = {
  clients: 'client',
  leads: 'lead',
  lead_services: 'leadService',
  lead_sub_services: 'leadSubService',
  quotations: 'quotation',
  quotation_versions: 'quotationVersion',
  quotation_items: 'quotationItem',
  projects: 'project',
  project_services: 'projectService',
  project_sub_services: 'projectSubService',
  invoices: 'invoice',
  invoice_items: 'invoiceItem',
  payments: 'payment',
  service_features: 'serviceFeature',
  service_included_items: 'serviceIncludedItem',
  service_process_steps: 'serviceProcessStep',
  service_faqs: 'serviceFaq',
  service_testimonials: 'serviceTestimonial',
  service_seo: 'serviceSeo',
  sub_service_features: 'subServiceFeature',
  sub_service_included_items: 'subServiceIncludedItem',
  sub_service_process_steps: 'subServiceProcessStep',
  sub_service_faqs: 'subServiceFaq',
  sub_service_media: 'subServiceMedia',
  sub_service_seo: 'subServiceSeo',
  portfolio_projects: 'portfolioProject',
  portfolio_project_media: 'portfolioProjectMedia',
};

async function auditSnapshot() {
  console.log('\n== 2. No-data-loss snapshot (run-to-run counts) ==');

  const current = {};
  for (const [table, model] of Object.entries(COUNT_MODELS)) {
    current[table] = await prisma[model].count();
  }

  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  let previous = null;
  if (fs.existsSync(SNAPSHOT_PATH)) {
    try { previous = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8')).counts; } catch { previous = null; }
  }

  if (!previous) {
    warn('Baseline snapshot', `no previous snapshot at ${path.relative(process.cwd(), SNAPSHOT_PATH)} — this run establishes the baseline`);
  } else {
    let decreased = 0;
    for (const [table, count] of Object.entries(previous)) {
      if (!(table in current)) {
        warn(`${table} disappeared`, 'table no longer exists in the schema');
        continue;
      }
      const delta = current[table] - count;
      if (delta < 0) {
        decreased += 1;
        const msg = `${table}: ${count} -> ${current[table]} (${delta})`;
        if (FAIL_ON_LOSS) check(`No ${table} rows lost since last snapshot`, false, msg);
        else warn(`${table} row count decreased`, msg);
      }
    }
    check('No core entity row count decreased since the last snapshot', decreased === 0,
      `${decreased} entity(ies) shrank (see warnings)`);
    const added = Object.keys(current).filter((t) => !(t in previous));
    if (added.length) warn('New tables in snapshot', added.join(', '));
  }

  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), counts: current }, null, 2));
  check('Snapshot written', fs.existsSync(SNAPSHOT_PATH));
  console.log(`    counts: ${Object.entries(current).map(([t, c]) => `${t}=${c}`).join('  ')}`);
}

// ---------------------------------------------------------------------------
// Part 2 — Referential integrity (no orphans / broken FKs)
// ---------------------------------------------------------------------------
async function auditIntegrity() {
  console.log('\n== 3. Referential integrity (no orphans, all lineage resolves) ==');

  const queries = [
    ['every Client.sourceLeadId still resolves to a real Lead (data-loss signal)',
      `SELECT COUNT(*)::int AS count FROM clients c LEFT JOIN leads l ON l.id = c."sourceLeadId" WHERE l.id IS NULL`],
    ['every Lead.clientId (when set) resolves to a real Client',
      `SELECT COUNT(*)::int AS count FROM leads l LEFT JOIN clients c ON c.id = l."clientId" WHERE l."clientId" IS NOT NULL AND c.id IS NULL`],
    ['every LeadService resolves to its Lead + Service',
      `SELECT COUNT(*)::int AS count FROM lead_services ls LEFT JOIN leads l ON l.id = ls."leadId" LEFT JOIN services s ON s.id = ls."serviceId" WHERE l.id IS NULL OR s.id IS NULL`],
    ['every LeadService has a non-empty status',
      `SELECT COUNT(*)::int AS count FROM lead_services WHERE status IS NULL OR status = ''`],
    ['no orphan LeadSubService rows',
      `SELECT COUNT(*)::int AS count FROM lead_sub_services lss LEFT JOIN lead_services ls ON ls.id = lss."leadServiceId" LEFT JOIN sub_services ss ON ss.id = lss."subServiceId" WHERE ls.id IS NULL OR ss.id IS NULL`],
    ['every Quotation resolves to its Lead + Client',
      `SELECT COUNT(*)::int AS count FROM quotations q LEFT JOIN leads l ON l.id = q."leadId" LEFT JOIN clients c ON c.id = q."clientId" WHERE l.id IS NULL OR c.id IS NULL`],
    ['every Quotation has at least one version',
      `SELECT COUNT(*)::int AS count FROM quotations q WHERE NOT EXISTS (SELECT 1 FROM quotation_versions v WHERE v."quotationId" = q.id)`],
    ['Quotation.activeVersionId resolves to a version of that same quotation',
      `SELECT COUNT(*)::int AS count FROM quotations q LEFT JOIN quotation_versions v ON v.id = q."activeVersionId" AND v."quotationId" = q.id WHERE q."activeVersionId" IS NOT NULL AND v.id IS NULL`],
    ['exactly one active version per quotation',
      `SELECT COUNT(*)::int AS count FROM (SELECT "quotationId" FROM quotation_versions WHERE "isActive" = true GROUP BY "quotationId" HAVING COUNT(*) > 1) x`],
    ['every QuotationItem resolves to its version + Service (+ SubService when set)',
      `SELECT COUNT(*)::int AS count FROM quotation_items qi LEFT JOIN quotation_versions v ON v.id = qi."quotationVersionId" LEFT JOIN services s ON s.id = qi."serviceId" LEFT JOIN sub_services ss ON ss.id = qi."subServiceId" WHERE v.id IS NULL OR s.id IS NULL OR (qi."subServiceId" IS NOT NULL AND ss.id IS NULL)`],
    ['every QuotationApproval resolves to its version',
      `SELECT COUNT(*)::int AS count FROM quotation_approvals qa LEFT JOIN quotation_versions v ON v.id = qa."quotationVersionId" WHERE v.id IS NULL`],
    ['every Project resolves to its Lead + Client',
      `SELECT COUNT(*)::int AS count FROM projects p LEFT JOIN leads l ON l.id = p."leadId" LEFT JOIN clients c ON c.id = p."clientId" WHERE l.id IS NULL OR c.id IS NULL`],
    ['no Project points at a missing Quotation (quotationId)',
      `SELECT COUNT(*)::int AS count FROM projects p LEFT JOIN quotations q ON q.id = p."quotationId" WHERE p."quotationId" IS NOT NULL AND q.id IS NULL`],
    ['every Project has at least one ProjectService',
      `SELECT COUNT(*)::int AS count FROM projects p WHERE NOT EXISTS (SELECT 1 FROM project_services ps WHERE ps."projectId" = p.id)`],
    ['every ProjectService resolves to its Project + Service, and leadServiceId (when set) belongs to the Project Lead',
      `SELECT COUNT(*)::int AS count FROM project_services ps LEFT JOIN projects p ON p.id = ps."projectId" LEFT JOIN services s ON s.id = ps."serviceId" LEFT JOIN lead_services ls ON ls.id = ps."leadServiceId" WHERE p.id IS NULL OR s.id IS NULL OR (ps."leadServiceId" IS NOT NULL AND (ls.id IS NULL OR ls."leadId" <> p."leadId"))`],
    ['ProjectService.assignedQuotationVersionId (when set) is a version of the origin Quotation',
      `SELECT COUNT(*)::int AS count FROM project_services ps LEFT JOIN projects p ON p.id = ps."projectId" LEFT JOIN quotation_versions v ON v.id = ps."assignedQuotationVersionId" WHERE ps."assignedQuotationVersionId" IS NOT NULL AND (v.id IS NULL OR v."quotationId" IS DISTINCT FROM p."quotationId")`],
    ['no orphan ProjectSubService rows',
      `SELECT COUNT(*)::int AS count FROM project_sub_services pss LEFT JOIN project_services ps ON ps.id = pss."projectServiceId" LEFT JOIN sub_services ss ON ss.id = pss."subServiceId" WHERE ps.id IS NULL OR ss.id IS NULL`],
    ['every Invoice resolves to its Project + Client',
      `SELECT COUNT(*)::int AS count FROM invoices i LEFT JOIN projects p ON p.id = i."projectId" LEFT JOIN clients c ON c.id = i."clientId" WHERE p.id IS NULL OR c.id IS NULL`],
    ['every Invoice has at least one line item',
      `SELECT COUNT(*)::int AS count FROM invoices i WHERE NOT EXISTS (SELECT 1 FROM invoice_items ii WHERE ii."invoiceId" = i.id)`],
    ['Invoice.clientId matches its Project.clientId',
      `SELECT COUNT(*)::int AS count FROM invoices i LEFT JOIN projects p ON p.id = i."projectId" WHERE i."clientId" IS DISTINCT FROM p."clientId"`],
    ['every Payment resolves to its Invoice + Client + Project',
      `SELECT COUNT(*)::int AS count FROM payments pm LEFT JOIN invoices i ON i.id = pm."invoiceId" LEFT JOIN clients c ON c.id = pm."clientId" LEFT JOIN projects p ON p.id = pm."projectId" WHERE i.id IS NULL OR c.id IS NULL OR p.id IS NULL`],
    ['Payment.clientId/projectId match its Invoice',
      `SELECT COUNT(*)::int AS count FROM payments pm LEFT JOIN invoices i ON i.id = pm."invoiceId" WHERE pm."clientId" IS DISTINCT FROM i."clientId" OR pm."projectId" IS DISTINCT FROM i."projectId"`],
    ['no Payment has amount <= 0',
      `SELECT COUNT(*)::int AS count FROM payments WHERE amount <= 0`],
    ['every Payment has a legal status',
      `SELECT COUNT(*)::int AS count FROM payments WHERE status NOT IN ('PENDING','SUCCESS','FAILED','REFUNDED')`],
    ['no Payment is overpaid (paid > grandTotal)',
      `SELECT COUNT(*)::int AS count FROM invoices i WHERE (SELECT COALESCE(SUM(pm.amount), 0) FROM payments pm WHERE pm."invoiceId" = i.id AND pm.status = 'SUCCESS') > i."grandTotal" + 0.01`],
    ['no duplicate Client numbers',
      `SELECT COUNT(*)::int AS count FROM (SELECT "clientNumber" FROM clients GROUP BY "clientNumber" HAVING COUNT(*) > 1) x`],
    ['no duplicate Lead numbers',
      `SELECT COUNT(*)::int AS count FROM (SELECT "leadNumber" FROM leads GROUP BY "leadNumber" HAVING COUNT(*) > 1) x`],
    ['no duplicate Quotation numbers',
      `SELECT COUNT(*)::int AS count FROM (SELECT "quotationNumber" FROM quotations GROUP BY "quotationNumber" HAVING COUNT(*) > 1) x`],
    ['no duplicate Project numbers',
      `SELECT COUNT(*)::int AS count FROM (SELECT "projectNumber" FROM projects GROUP BY "projectNumber" HAVING COUNT(*) > 1) x`],
    ['no duplicate Invoice numbers',
      `SELECT COUNT(*)::int AS count FROM (SELECT "invoiceNumber" FROM invoices GROUP BY "invoiceNumber" HAVING COUNT(*) > 1) x`],
  ];

  for (const [label, sql] of queries) {
    const rows = await prisma.$queryRawUnsafe(sql);
    check(label, num(rows) === 0, `count=${num(rows)}`);
  }
}

// ---------------------------------------------------------------------------
// Part 3 — Financial integrity (recompute every total with the app formulas)
// ---------------------------------------------------------------------------
async function auditFinancials() {
  console.log('\n== 4. Financial integrity (totals recomputed from line items) ==');

  const versions = await prisma.quotationVersion.findMany({ include: { items: true, quotation: true } });
  let versionDrift = 0;
  let itemDrift = 0;
  for (const v of versions) {
    let sub = 0;
    let gst = 0;
    for (const it of v.items) {
      const base = Number(it.quantity) * Number(it.unitPrice);
      const tax = (base * Number(it.taxRate)) / 100;
      sub += base;
      gst += tax;
      const line = base + tax;
      if (Math.abs(Number(it.taxAmount) - tax) > TOLERANCE || Math.abs(Number(it.lineTotal) - line) > TOLERANCE) {
        itemDrift += 1;
        if (itemDrift <= 5) warn(`Quotation line total/tax drift`, `${v.quotation.quotationNumber} v${v.versionNumber} item "${it.description}": stored ${Number(it.lineTotal)}/${Number(it.taxAmount)} vs computed ${line}/${tax}`);
      }
    }
    const expectedGrand = sub + gst + Number(v.transportation) + Number(v.installation) - Number(v.discount);
    if (Math.abs(Number(v.subtotal) - sub) > TOLERANCE || Math.abs(Number(v.gstAmount) - gst) > TOLERANCE
      || Math.abs(Number(v.grandTotal) - expectedGrand) > TOLERANCE) {
      versionDrift += 1;
      if (versionDrift <= 5) warn(`Quotation version total drift`, `${v.quotation.quotationNumber} v${v.versionNumber}: stored sub=${v.subtotal} gst=${v.gstAmount} grand=${v.grandTotal} vs computed ${sub.toFixed(2)}/${gst.toFixed(2)}/${expectedGrand.toFixed(2)}`);
    }
  }
  check('Every quotation version subtotal/GST/grandTotal matches a line-item recompute', versionDrift === 0, `versions drifted: ${versionDrift}`);
  check('Every quotation line total/tax matches its own qty x rate', itemDrift === 0, `lines drifted: ${itemDrift}`);

  const invoices = await prisma.invoice.findMany({ include: { items: true, payments: true } });
  let invoiceDrift = 0;
  let overpaid = 0;
  for (const inv of invoices) {
    let sub = 0;
    let gst = 0;
    for (const it of inv.items) {
      const base = Number(it.quantity) * Number(it.unitPrice);
      const tax = (base * Number(it.taxRate)) / 100;
      sub += base;
      gst += tax;
      const line = base + tax;
      if (Math.abs(Number(it.taxAmount) - tax) > TOLERANCE || Math.abs(Number(it.lineTotal) - line) > TOLERANCE) {
        invoiceDrift += 1;
        if (invoiceDrift <= 5) warn(`Invoice line total/tax drift`, `${inv.invoiceNumber} item "${it.description}": stored ${Number(it.lineTotal)}/${Number(it.taxAmount)} vs computed ${line}/${tax}`);
      }
    }
    if (Math.abs(Number(inv.subtotal) - sub) > TOLERANCE || Math.abs(Number(inv.gstAmount) - gst) > TOLERANCE
      || Math.abs(Number(inv.grandTotal) - (sub + gst)) > TOLERANCE) {
      invoiceDrift += 1;
      if (invoiceDrift <= 5) warn(`Invoice total drift`, `${inv.invoiceNumber}: stored sub=${inv.subtotal} gst=${inv.gstAmount} grand=${inv.grandTotal} vs computed ${sub.toFixed(2)}/${gst.toFixed(2)}/${(sub + gst).toFixed(2)}`);
    }
    const paid = inv.payments.filter((pm) => pm.status === 'SUCCESS').reduce((s, pm) => s + Number(pm.amount), 0);
    if (paid > Number(inv.grandTotal) + TOLERANCE) overpaid += 1;
  }
  check('Every invoice subtotal/GST/grandTotal matches a line-item recompute', invoiceDrift === 0, `invoices drifted: ${invoiceDrift}`);
  check('No invoice is overpaid by its SUCCESS payments', overpaid === 0, `overpaid: ${overpaid}`);
}

// ---------------------------------------------------------------------------
// Part 4 — API contract (assembled Phase 13 shapes vs normalized tables)
// ---------------------------------------------------------------------------
async function apiReq(method, p, token) {
  const res = await fetch(BASE + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
}

async function auditApi() {
  console.log('\n== 5. API contract (assembled shapes still served + match normalized tables) ==');

  const health = await apiReq('GET', '/health');
  if (health.status !== 200) {
    warn('API contract skipped', 'backend not responding on ' + BASE + ' — start it (npm run dev) and re-run');
    return;
  }

  const services = await apiReq('GET', '/api/services');
  const list = Array.isArray(services.json?.data) ? services.json.data : [];
  check('GET /api/services returns the catalog', services.status === 200 && list.length > 0,
    `status=${services.status} count=${list.length}`);
  if (list.length === 0) return;

  const flatKeys = ['seoTitle', 'metaDescription', 'metaKeywords', 'ogImage', 'canonicalUrl', 'structuredData'];
  const arrayKeys = ['features', 'whatsIncluded', 'process', 'faqs', 'testimonials'];
  let assemblyOk = true;
  let backfillOk = true;
  const dbCount = (model, where) => prisma[model].count({ where });
  for (const svc of list.slice(0, 10)) {
    if (!arrayKeys.every((k) => Array.isArray(svc[k])) || !flatKeys.every((k) => k in svc)) assemblyOk = false;

    const expected = {
      features: await dbCount('serviceFeature', { serviceId: svc.id }),
      whatsIncluded: await dbCount('serviceIncludedItem', { serviceId: svc.id }),
      process: await dbCount('serviceProcessStep', { serviceId: svc.id }),
      faqs: await dbCount('serviceFaq', { serviceId: svc.id }),
      testimonials: await dbCount('serviceTestimonial', { serviceId: svc.id }),
    };
    for (const [k, n] of Object.entries(expected)) {
      if (svc[k].length !== n) {
        backfillOk = false;
        if (backfillOk === false) { /* accumulate */ }
        warn(`Backfill mismatch for ${svc.slug}.${k}`, `API=${svc[k].length} DB=${n}`);
      }
    }

    const subs = await apiReq('GET', `/api/services/${svc.id}/sub-services`);
    const subList = Array.isArray(subs.json?.data) ? subs.json.data : [];
    for (const sub of subList) {
      if (!Array.isArray(sub.gallery) || !Array.isArray(sub.features) || !Array.isArray(sub.whatsIncluded)
        || !Array.isArray(sub.process) || !Array.isArray(sub.faqs)) assemblyOk = false;
      const mediaCount = await dbCount('subServiceMedia', { subServiceId: sub.id, isActive: true });
      if (sub.gallery.length !== mediaCount) {
        backfillOk = false;
        warn(`Backfill mismatch for ${svc.slug}/${sub.slug}.gallery`, `API=${sub.gallery.length} DB(active)=${mediaCount}`);
      }
      const featCount = await dbCount('subServiceFeature', { subServiceId: sub.id });
      if (sub.features.length !== featCount) {
        backfillOk = false;
        warn(`Backfill mismatch for ${svc.slug}/${sub.slug}.features`, `API=${sub.features.length} DB=${featCount}`);
      }
    }
  }
  check('Services assembled with features/whatsIncluded/process/faqs/testimonials + flat SEO keys', assemblyOk);
  check('Assembled arrays match normalized tables row-for-row (backfill intact)', backfillOk);
}

// ---------------------------------------------------------------------------
async function main() {
  console.log('=== Phase 14: BACKWARD COMPATIBILITY & DATA-INTEGRITY AUDIT ===');
  await auditSchema();
  await auditSnapshot();
  await auditIntegrity();
  await auditFinancials();
  await auditApi();

  await prisma.$disconnect();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.${warnings.length ? ` ${warnings.length} warning(s) listed above.` : ''}`);
  if (failed.length > 0) {
    console.log('Failed checks:');
    failed.forEach((f) => console.log(`  - ${f.name}`));
  }
  console.log(failed.length === 0 ? '\nPHASE 14 BACKWARD COMPATIBILITY: PASS' : `\nPHASE 14 BACKWARD COMPATIBILITY: ${failed.length} CHECK(S) FAILED`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error('\nAUDIT ERROR:', err);
  await prisma.$disconnect();
  process.exit(1);
});
