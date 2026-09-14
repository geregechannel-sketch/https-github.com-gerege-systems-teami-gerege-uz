# Predeployment review — 2026-09-14

## Open the isolated frontend

From `frontend`, run `npm ci`, then `node scripts/build-preview.mjs`.
Open `frontend/dist-preview/TOSH_Preview.html` in a browser. No installation, server, password or network connection is required to view the resulting file.

The preview reuses the actual Shell, Dashboard, Archives, Quality and Points components with a build-only API adapter. It uses hash navigation so local files can navigate. Select the date printed in the yellow notice (yesterday in UTC+08), DEMO point and archive parameter to view 24 synthetic intervals; the first value is zero. Later periods have no rows. No source credentials or customer data are embedded.

Other routes explicitly say unavailable. GIS is not represented as real, tariff bills are not fabricated, and no audit records are invented. Save/delete and command requests return an explicit unsupported result. A Content Security Policy disables network connections and form submission in the standalone file. This is presentation isolation, not a substitute for server access control.

Production builds use the original API. Development proxy now defaults to localhost:8080 instead of production TOSH.

## Verification

- Frontend: TypeScript, existing nine archive coverage tests, production build.
- After dependency updates: TypeScript, all 12 frontend/preview tests, production and standalone builds passed locally; `npm audit --audit-level=moderate` reported 0 vulnerabilities on 2026-09-14. This is a package advisory check, not a penetration test.
- Preview: three adapter tests cover bounded results, zero, empty periods, wrong series, unsupported mutations and no fetch calls; standalone build checks external asset removal.
- Backend at prior commit a70472885bae234d431c536c07df3c1d8b721720: GitHub CI run 34821293878 succeeded, including Go/race/PostgreSQL tests. No local Go/PostgreSQL runtime was available during this review.

## Still required before production approval

**Confirmed migration blocker:** `db.Migrate` re-executes every migration at startup. `0006_extras.sql` still contains 13 `TRUNCATE` statements affecting event logs, acquisition statistics, meter/controller logs and configuration tables. Do not treat this branch as deployment-ready. These must be separated from production startup with preservation tests before a real deployment.

**Visual verification limitation:** the remote browser rejected `http://127.0.0.1:4173/TOSH_Preview.html` with `ERR_BLOCKED_BY_CLIENT`. No completed browser rendering or end-to-end interaction test is claimed. The downloadable standalone HTML is intended for review in the administrator's Chrome/Edge.

Dependency audit initially reported five affected package entries. MapLibre was unused by source imports (GIS uses Leaflet); removed it. React Router and Vite/plugin-react are upgraded for advisory fixes. The build now requires Node 20.19+ or 22.12+; workflows use Node 22. Relevant advisories: https://github.com/advisories/GHSA-wrjc-x8rr-h8h6 and https://github.com/advisories/GHSA-fx2h-pf6j-xcff . Record final npm audit and CI outcomes before deployment review.

- Live TEAMI source authorization, confirmed source timezone and source-to-target internal point mapping.
- Executable collector, scheduling, token renewal, monitoring and a real ingestion/retry trial on an isolated staging database.
- Effective tariff rates, currency, validity dates and independently checked expected bills. The existing energy conversion evidence is not a payment calculation.
- Real actor event capture, per-point authorization, least-privilege database role and protection outside the database owner's control. Existing append-only triggers alone do not prove full audit protection.
- Backups with restore trial, complete seed/migration review, staging deployment, host ownership/configuration, rollback and deployment workflow branch alignment.
- End-to-end browser and production-load/security testing. Passing current automated tests does not establish these results.

No production deployment or device command is part of this preview work.
