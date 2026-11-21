const $ = (s) => document.querySelector(s);
const listEl = $('#list'), statusEl = $('#status'), searchEl = $('#search');
const section = $('#apply-section'), form = $('#apply-form');
let selectedId = null;

// ---------- API helper: timeout + retry with backoff for transient failures ----------
async function api(path, options = {}, { retries = 2 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(path, { ...options, signal: ctrl.signal });
      const body = await res.json().catch(() => ({}));
      // Retry only on server errors, never on 4xx (client mistakes won't fix themselves)
      if (res.status >= 500 && attempt < retries) throw new Error('server');
      return { ok: res.ok, status: res.status, body, retryAfter: res.headers.get('Retry-After') };
    } catch (err) {
      if (attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
    } finally {
      clearTimeout(timer);
    }
  }
}

// ---------- Listing: loading, empty, and failure states ----------
function showLoading() {
  statusEl.textContent = 'Loading internships…';
  listEl.replaceChildren(...Array.from({ length: 3 }, () => {
    const li = document.createElement('li'); li.className = 'skeleton'; return li;
  }));
}

function showError(message, retryFn) {
  listEl.replaceChildren();
  statusEl.replaceChildren();
  const box = document.createElement('div'); box.className = 'banner'; box.setAttribute('role', 'alert');
  const p = document.createElement('p'); p.textContent = message;
  const btn = document.createElement('button'); btn.textContent = 'Try again';
  btn.addEventListener('click', retryFn);
  box.append(p, btn);
  statusEl.append(box);
}

function renderCards(items) {
  statusEl.textContent = items.length ? '' : 'No internships match your search.';
  // textContent (never innerHTML) so API data can't inject markup -> prevents XSS
  listEl.replaceChildren(...items.map((it) => {
    const li = document.createElement('li'); li.className = 'card';
    const h = document.createElement('h3'); h.textContent = it.title;
    const m = document.createElement('p'); m.className = 'meta'; m.textContent = `${it.company} · ${it.location}`;
    const d = document.createElement('p'); d.textContent = it.description;
    const b = document.createElement('button'); b.textContent = 'Apply';
    b.addEventListener('click', () => openForm(it));
    li.append(h, m, d, b);
    return li;
  }));
}

async function load() {
  showLoading();
  try {
    const q = encodeURIComponent(searchEl.value.trim());
    const { ok, status, body, retryAfter } = await api(`/api/internships?search=${q}`);
    if (status === 429) return showError(`Too many requests. Try again in ${retryAfter || 'a few'} seconds.`, load);
    if (!ok) return showError('We could not load internships.', load);
    renderCards(body.data);
  } catch {
    showError('Network problem. Check your connection and try again.', load);
  }
}

let debounce;
searchEl.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(load, 300); });

// ---------- Application form: client validation (UX only; server is the authority) ----------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;

function clientValidate(v) {
  const e = {};
  if (v.name.length < 2 || v.name.length > 80) e.name = 'Name must be 2-80 characters';
  if (!EMAIL_RE.test(v.email)) e.email = 'Enter a valid email address';
  if (v.phone && !PHONE_RE.test(v.phone)) e.phone = 'Enter a valid phone number';
  if (v.resumeUrl && !/^https:\/\/\S+$/.test(v.resumeUrl)) e.resumeUrl = 'Resume link must be a valid https URL';
  if (v.coverLetter.length < 20 || v.coverLetter.length > 1000) e.coverLetter = 'Cover letter must be 20-1000 characters';
  return e;
}

function showFieldErrors(errors) {
  form.querySelectorAll('.err[data-for]').forEach((p) => {
    const msg = errors[p.dataset.for] || '';
    p.textContent = msg;
    const input = form.elements[p.dataset.for];
    if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  });
}

function openForm(item) {
  selectedId = item.id;
  $('#apply-title').textContent = item.title;
  form.reset(); showFieldErrors({});
  $('#form-error').textContent = ''; $('#form-ok').textContent = '';
  section.hidden = false;
  section.scrollIntoView({ behavior: 'smooth' });
  form.elements.name.focus();
}

$('#cancel').addEventListener('click', () => { section.hidden = true; });

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const fd = new FormData(form);
  const v = Object.fromEntries(['name', 'email', 'phone', 'resumeUrl', 'coverLetter'].map((k) => [k, String(fd.get(k) || '').trim()]));
  const errors = clientValidate(v);
  showFieldErrors(errors);
  if (Object.keys(errors).length) return;

  const btn = $('#submit');
  btn.disabled = true; btn.textContent = 'Submitting…';
  $('#form-error').textContent = ''; $('#form-ok').textContent = '';
  try {
    // retries: 0, because POST is not idempotent; the user decides whether to resend
    const { ok, status, body, retryAfter } = await api('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...v, internshipId: selectedId }),
    }, { retries: 0 });
    if (ok) { form.reset(); $('#form-ok').textContent = 'Application submitted. Good luck!'; return; }
    if (status === 422 && body.fields) { showFieldErrors(body.fields); return; }
    if (status === 429) { $('#form-error').textContent = `Too many attempts. Try again in ${retryAfter || 'a few'} seconds.`; return; }
    $('#form-error').textContent = body.error || 'Submission failed. Please try again.';
  } catch {
    $('#form-error').textContent = 'Network problem. Your input is kept, so please try again.';
  } finally {
    btn.disabled = false; btn.textContent = 'Submit application';
  }
});

load();
