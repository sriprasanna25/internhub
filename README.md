# InternHub: Secure Full-Stack Internship Board

A small full-stack app: a vanilla JS frontend, a Node.js REST API, and SQLite storage.
It has **zero npm dependencies** (Node 22.13+ only), so `npm install` is not needed.

## Run it
```bash
npm start        # http://localhost:3000
npm test         # 18 automated API/security tests
```

## What it covers (Step 04: Secure Application Integration)
| Requirement | Where |
|---|---|
| Load and render API data with loading and failure states | `public/app.js` (`showLoading`, `showError`, retry button, backoff) |
| Application form validated on client **and** server | `public/app.js` (`clientValidate`) and `server/validate.js` |
| Rate limits | `server/security.js` (100 req/min overall, 5 applications/min) |
| Secure headers | `server/security.js` (`applySecurityHeaders`) |
| Parameterized queries | `server/app.js` and `server/db.js` (every query uses `?` placeholders) |
| Tests | `test/api.test.js` |

## Structure
```
server/   index.js (entry) · app.js (routes) · db.js (schema + seed) · validate.js · security.js
public/   index.html · app.js · styles.css
test/     api.test.js
docs/     SECURITY_CHECKLIST.md · TEST_REPORT.md
```

## API
- `GET  /api/internships?search=&page=`: list
- `GET  /api/internships/:id`: detail
- `POST /api/applications`: submit (JSON). Returns 201, 409 (duplicate), 422 (field errors), 429 (rate limited)

## Ideas to extend it
Add login (sessions or JWT), an admin view of applications, email confirmation, a CAPTCHA,
switch to Express + helmet + express-rate-limit, or deploy it and use the URL as your proof link.
