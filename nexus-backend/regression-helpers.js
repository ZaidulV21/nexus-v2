/* Shared helpers for the Phase 8 + Phase 9 regression harness. */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const results = [];

const BASE = 'http://localhost:4000/api';
const ADMIN_EMAIL = 'admin@nexus.local';
const ADMIN_PASSWORD = 'ChangeMe123!';
const TEST_PASSWORD = 'RegressionPass!123';

// Catalog ids (verified against the live DB)
const INTERIOR = '7748995b-f0d6-4948-a3f3-7939b321667b';
const ELECTRICAL = '474f86bc-fef2-431b-8239-6f2157f49e71';
const WEBSITE = '4bc69d5a-73ce-4a24-b94d-061d23ce6e70';
const CCTV = '17898915-f8ca-42e7-af0c-d7826c6da523';
const PAINTING = '91d89094-802a-4e27-b8d4-77427bcabdc7';
const FLOORING = '68092941-40a4-4ecc-8581-c128a1d8bdd8';
const LIGHTING = '61c6f50d-8e70-44e1-a55b-53e1eca55ab2';
const OFFICE_FITOUT = 'f73dfc4a-7647-4a04-ae78-7f9612c09f65';
const INACTIVE_CCTV_SUB = '78eab0fd-0dc4-4e44-9c6c-434c29b4226f';

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
  prisma, check, req, loginAdmin, setClientPassword, loginClient, qualifyLeadServices, summary,
  BASE, ADMIN_EMAIL, ADMIN_PASSWORD, TEST_PASSWORD,
  INTERIOR, ELECTRICAL, WEBSITE, CCTV, PAINTING, FLOORING, LIGHTING, OFFICE_FITOUT, INACTIVE_CCTV_SUB,
};
