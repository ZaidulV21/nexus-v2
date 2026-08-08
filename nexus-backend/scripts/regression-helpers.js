/* Shared helpers for the Phase 8 + Phase 9 regression harness. */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const results = [];

const BASE = 'http://localhost:4000/api';
const ADMIN_EMAIL = 'admin@nexus.local';
const ADMIN_PASSWORD = 'ChangeMe123!';
const TEST_PASSWORD = 'RegressionPass!123';

// Catalog ids are resolved by slug against the live DB (see resolveCatalog)
// so the harness is idempotent against a clean baseline - a `prisma migrate
// reset` regenerates every UUID, so hard-coding them would leave the harness
// permanently broken after a reset. Sub-services that the seed does not ship
// (Painting/Flooring/Lighting under Interior, an inactive CCTV sub) are
// created on demand, mirroring what Test 1 does for Wiring/DB Panel.
const SERVICE_SLUGS = {
  INTERIOR: 'interior-design',
  ELECTRICAL: 'electrical-work',
  WEBSITE: 'website-it-services',
  CCTV: 'cctv-installation',
};

// { name, slug, isActive } for sub-services the harness depends on, keyed by
// the exported constant name. Slugs are unique per parent service.
const SUB_SERVICE_FIXTURES = {
  PAINTING: { name: 'Painting', slug: 'interior-painting', isActive: true },
  FLOORING: { name: 'Flooring', slug: 'interior-flooring', isActive: true },
  LIGHTING: { name: 'Lighting', slug: 'interior-lighting', isActive: true },
  INACTIVE_CCTV_SUB: { name: 'Inactive CCTV sub-service', slug: 'cctv-inactive-sub', isActive: false },
};

const catalog = {};

async function ensureSubService(serviceId, { name, slug, isActive }) {
  const row = await prisma.subService.upsert({
    where: { serviceId_slug: { serviceId, slug } },
    update: { name, isActive },
    create: { serviceId, name, slug, isActive },
  });
  return row.id;
}

// Populates `catalog` and returns a snapshot of the resolved ids. Must be
// awaited in main() before any test runs; the tests read the module-level
// constants in regression-run.js, which are assigned from the snapshot.
async function resolveCatalog() {
  for (const [key, slug] of Object.entries(SERVICE_SLUGS)) {
    const svc = await prisma.service.findFirst({ where: { slug, isActive: true } });
    if (!svc) throw new Error(`resolveCatalog: seed is missing active service with slug="${slug}" (re-run prisma db seed)`);
    catalog[key] = svc.id;
  }
  for (const [key, fixture] of Object.entries(SUB_SERVICE_FIXTURES)) {
    const parentKey = key === 'INACTIVE_CCTV_SUB' ? 'CCTV' : 'INTERIOR';
    catalog[key] = await ensureSubService(catalog[parentKey], fixture);
  }
  return { ...catalog };
}

function check(name, ok, details) {
  results.push({ name, ok: !!ok, details });
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}${details ? ` :: ${details}` : ''}`);
}

async function req(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  for (let attempt = 0; attempt <= 12; attempt++) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json = null;
    const text = await res.text();
    try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
    if (res.status === 429 && attempt < 12) {
      const retryAfter = Number(res.headers.get('retry-after') || res.headers.get('ratelimit-reset') || 0);
      const waitMs = Math.max(retryAfter * 1000, 1000) + 500;
      console.log(`    [rate-limit] ${method} ${path} 429 - waiting ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1}/12)`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    return { status: res.status, json, ok: res.ok };
  }
}

async function loginAdmin() {
  const r = await req('POST', '/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  return r.json.data?.token ?? r.json.token;
}

async function setClientPassword(clientId, password) {
  const hash = await bcrypt.hash(password, 10);
  await prisma.client.update({ where: { id: clientId }, data: { passwordHash: hash } });
}

async function loginClient(email, password) {
  const r = await req('POST', '/auth/login', { body: { email, password } });
  return { token: r.json.data?.token ?? r.json.token, actor: r.json.data?.actor ?? r.json.actor };
}

const MANUAL_LEAD_ORDER = [
  'NEW',
  'CONTACTED',
  'SITE VISIT SCHEDULED',
  'SITE VISIT COMPLETED',
  'QUOTE PREPARING',
];

async function qualifyLeadServices(leadId, token) {
  const lead = await req('GET', `/leads/${leadId}`, { token });
  const services = lead.json.data?.leadServices ?? lead.json.leadServices ?? [];
  for (const s of services) {
    const fromIdx = MANUAL_LEAD_ORDER.indexOf(s.status);
    if (fromIdx === -1 || fromIdx >= MANUAL_LEAD_ORDER.indexOf('QUOTE PREPARING')) continue;
    // Walk one adjacent step at a time - the Status Engine rejects jumps over
    // non-skippable stages (e.g. NEW -> QUOTE PREPARING skips CONTACTED).
    for (let i = fromIdx + 1; i <= MANUAL_LEAD_ORDER.indexOf('QUOTE PREPARING'); i++) {
      const r = await req('PATCH', `/leads/${s.id}/status`, {
        token,
        body: { toStatus: MANUAL_LEAD_ORDER[i], reason: 'Regression test setup: qualify service' },
      });
      if (!r.ok) throw new Error(`qualify ${s.id} ${MANUAL_LEAD_ORDER[i - 1]} -> ${MANUAL_LEAD_ORDER[i]} failed: ${r.status} ${JSON.stringify(r.json)}`);
    }
  }
}

function summary() {
  const fails = results.filter((r) => !r.ok);
  console.log(`\n========== REGRESSION SUMMARY ==========`);
  console.log(`  Total checks: ${results.length}`);
  console.log(`  PASS: ${results.length - fails.length}`);
  console.log(`  FAIL: ${fails.length}`);
  for (const f of fails) console.log(`    FAIL: ${f.name} :: ${f.details}`);
  return { total: results.length, pass: results.length - fails.length, fail: fails.length, fails };
}

module.exports = {
  prisma, check, req, loginAdmin, setClientPassword, loginClient, qualifyLeadServices, summary, resolveCatalog,
  BASE, ADMIN_EMAIL, ADMIN_PASSWORD, TEST_PASSWORD,
};
