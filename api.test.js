import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';

let server, base;
const valid = {
  name: 'Asha Kumar', email: 'asha@example.com', phone: '+91 98765 43210',
  resumeUrl: 'https://example.com/resume.pdf',
  coverLetter: 'I love building full stack apps and want to learn from your team.',
  internshipId: 1,
};
const post = (body, headers = { 'Content-Type': 'application/json' }) =>
  fetch(`${base}/api/applications`, { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });

before(async () => {
  // High limits so ordinary tests are not throttled; limiter tested separately below
  server = createApp({ generalLimit: { windowMs: 60_000, max: 1000 }, applyLimit: { windowMs: 60_000, max: 1000 } });
  await new Promise((r) => server.listen(0, r));
  base = `http://localhost:${server.address().port}`;
});
after(() => server.close());

// ---------- Data loading ----------
test('GET /api/internships returns seeded list', async () => {
  const res = await fetch(`${base}/api/internships`);
  const { data } = await res.json();
  assert.equal(res.status, 200);
  assert.ok(data.length >= 5);
});

test('search filters results', async () => {
  const { data } = await (await fetch(`${base}/api/internships?search=cyber`)).json();
  assert.equal(data.length, 1);
  assert.match(data[0].title, /Cybersecurity/);
});

test('GET /api/internships/:id returns 404 for unknown id', async () => {
  assert.equal((await fetch(`${base}/api/internships/9999`)).status, 404);
});

// ---------- Server-side validation ----------
test('valid application is created (201)', async () => {
  const res = await post(valid);
  assert.equal(res.status, 201);
  assert.ok((await res.json()).data.id);
});

test('duplicate application is rejected (409)', async () => {
  assert.equal((await post(valid)).status, 409);
});

test('invalid fields are rejected with per-field errors (422)', async () => {
  const res = await post({ ...valid, name: 'A', email: 'nope', coverLetter: 'short', resumeUrl: 'http://x.com' });
  const { fields } = await res.json();
  assert.equal(res.status, 422);
  for (const k of ['name', 'email', 'coverLetter', 'resumeUrl']) assert.ok(fields[k], `${k} should have an error`);
});

test('javascript: resume URL is rejected', async () => {
  const res = await post({ ...valid, email: 'x@example.com', resumeUrl: 'javascript:alert(1)' });
  assert.equal(res.status, 422);
});

test('unknown internshipId is rejected', async () => {
  assert.equal((await post({ ...valid, email: 'y@example.com', internshipId: 9999 })).status, 422);
});

test('string internshipId is rejected (type check)', async () => {
  assert.equal((await post({ ...valid, email: 'z@example.com', internshipId: '1' })).status, 422);
});

test('malformed JSON returns 400', async () => {
  assert.equal((await post('{bad json')).status, 400);
});

test('wrong content type returns 415', async () => {
  assert.equal((await post(JSON.stringify(valid), { 'Content-Type': 'text/plain' })).status, 415);
});

test('oversized body returns 413', async () => {
  const res = await post({ ...valid, email: 'big@example.com', coverLetter: 'a'.repeat(20_000) }).catch(() => null);
  // The server may close the socket after rejecting; either outcome means the payload was refused.
  assert.ok(res === null || res.status === 413);
});

// ---------- Security: SQL injection, headers, traversal ----------
test('SQL injection in search is treated as plain text', async () => {
  const q = encodeURIComponent("' OR 1=1 --");
  const res = await fetch(`${base}/api/internships?search=${q}`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).data.length, 0);
});

test('SQL injection in application fields is stored literally, tables survive', async () => {
  const res = await post({ ...valid, email: 'sql@example.com', name: "Robert'); DROP TABLE internships;--" });
  assert.equal(res.status, 201);
  const { data } = await (await fetch(`${base}/api/internships`)).json();
  assert.ok(data.length >= 5);
});

test('secure headers are present', async () => {
  const res = await fetch(`${base}/api/internships`);
  assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(res.headers.get('x-powered-by'), null);
});

test('path traversal cannot read files outside public/', async () => {
  const res = await fetch(`${base}/..%2fserver%2fdb.js`);
  assert.equal(res.status, 404);
});

test('static frontend is served', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /InternHub/);
});

// ---------- Rate limiting ----------
test('application endpoint is rate limited (429 + Retry-After)', async () => {
  const s = createApp({ applyLimit: { windowMs: 60_000, max: 2 } });
  await new Promise((r) => s.listen(0, r));
  const url = `http://localhost:${s.address().port}/api/applications`;
  const send = () => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal((await send()).status, 422);
  assert.equal((await send()).status, 422);
  const third = await send();
  assert.equal(third.status, 429);
  assert.ok(third.headers.get('retry-after'));
  s.close();
});
