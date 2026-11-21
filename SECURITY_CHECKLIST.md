# Security Checklist

- [x] **Server-side validation** for every field (type, length, format); the client check is UX only
- [x] **Parameterized queries** everywhere (`?` placeholders); LIKE wildcards in search are escaped
- [x] **Rate limiting**: general (100/min/IP) and stricter on `POST /api/applications` (5/min/IP) with `Retry-After`
- [x] **Secure headers**: CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, CORP, Permissions-Policy, HSTS
- [x] **XSS prevention**: UI renders API data with `textContent`, never `innerHTML`; CSP blocks inline scripts
- [x] **Input limits**: 10 KB body cap, `application/json` only, resume links must be `https://`
- [x] **Safe errors**: generic 500 message to clients; details only in server logs
- [x] **Path traversal blocked** on static files; only `.html/.js/.css` served
- [x] **Duplicate protection**: UNIQUE(internship_id, email) returns 409
- [x] **Retry safety**: GET requests retry with backoff; POST is never auto-retried
- [ ] Before production: HTTPS termination, shared rate-limit store (Redis), CAPTCHA, auth for admin routes, DB backups, dependency audit
