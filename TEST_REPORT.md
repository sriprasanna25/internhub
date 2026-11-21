# Test Report

Run date: 2026-11-19 · Node v22.23.5 · command: `npm test`

| # | Test | Result |
|---|------|--------|
| 1 | GET /api/internships returns seeded list | PASS |
| 2 | search filters results | PASS |
| 3 | GET /api/internships/:id returns 404 for unknown id | PASS |
| 4 | valid application is created (201) | PASS |
| 5 | duplicate application is rejected (409) | PASS |
| 6 | invalid fields are rejected with per-field errors (422) | PASS |
| 7 | javascript: resume URL is rejected | PASS |
| 8 | unknown internshipId is rejected | PASS |
| 9 | string internshipId is rejected (type check) | PASS |
| 10 | malformed JSON returns 400 | PASS |
| 11 | wrong content type returns 415 | PASS |
| 12 | oversized body returns 413 | PASS |
| 13 | SQL injection in search is treated as plain text | PASS |
| 14 | SQL injection in application fields is stored literally, tables survive | PASS |
| 15 | secure headers are present | PASS |
| 16 | path traversal cannot read files outside public/ | PASS |
| 17 | static frontend is served | PASS |
| 18 | application endpoint is rate limited (429 + Retry-After) | PASS |

**Summary:** 18 tests, 18 passed, 0 failed.
