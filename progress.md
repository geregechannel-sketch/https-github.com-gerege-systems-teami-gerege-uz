# Progress Log

## Session 1 — 2026-08-28
- Probed target; identified TEAMI Enterprise v3.0 (EMCOS/EC3) React SPA on IIS.
- Extracted API base `http://82.215.77.202:8080/ec3api/v1/`, auth via `st-token` JWT.
- Downloaded JS bundles (main + 6258 chunk) to scratchpad/bundle for mining.
- Fetched globalSettings/msalConfig/customSettings.
- Created planning files. Phase 1 complete.
- Next: log in via Chrome, capture live API requests.

## Session 1 (cont.) — live capture complete
- Server had intermittent outage/IP block (~40 min); recovered.
- Logged-in session found active (jwtToken valid). Tenant: TOSH ELECTROAPPARAT, Mongolia deployment (Choibalsan).
- Installed fetch/XHR interceptor; captured ~55 endpoints w/ schemas across archives, config/classifiers, points, meters, acquisition, events.
- Key: {model}/{action} convention; Oracle SQL-driven; generic grid POST {limit,offset,filters:[{c,p,v}]} + totalCount; RBAC 4xx; envelope {success,data}.
- Full route map (137) + module hierarchy captured. Phase 2 & 3 complete.
- Next: write docs/ set (Phase 4).

## Session 1 — docs complete
- Wrote 9 docs (docs/00-README..08-replication-guide), 903 lines, standards-based.
- Covers: overview/glossary, architecture+diagram, full API spec (conventions+mechanism+~55 endpoints), Oracle data model, 137-route functional spec, auth/security/RBAC, frontend, replication guide.
- Phases 1-5 complete. Optional exhaustive per-leaf endpoint capture offered to user.

## Session 2 — FULL endpoint extraction (user asked to complete gaps)
- Found webpack runtime; loaded ALL 852 chunks throttled (0 failures, server OK).
- Scanned 6474 module factories for route configs → 983 endpoints (from ~55).
- Wrote docs/09-endpoints-full.md (grouped, 414 roots) + docs/endpoints-full.txt (raw 983).
- Updated 03-api-spec / 00-README / 06-auth-security (real endpoints: user/login, user/login_az, user/change_pw).
- All phases complete. 10 docs total.

## Session 2 — per-endpoint parameters (user asked to add param structures)
- Extracted method + parameter names + flags for all 982 endpoints from model configs.
- docs/endpoints-params.txt: "<path> [METHODS] :: PARAM(get=req/opt|add=req/opt|nonNull)".
- 750 with params, 260 param-less. Verified vs UI (points fields match).
- Documented flag semantics in 03-api-spec.md; linked from 00-README.

## Session 2 — Toshi Theme (user asked to save all-screen design as "toshi theme")
- Extracted 748 CSS design tokens (light-dark() -> light+dark) + metrics (Roboto 12px, radius 4px, header 70px, sidebar 220px, 11 button colors) from live app.
- Built docs/toshi-theme/: toshi-theme.css (tokens + .toshi-* components), preview.html, README.
- Verified both light & dark render matches real TOSH screens.

## Session 2 — Go+Postgres backend + CI/CD (user asked to build backend, test, reliable; deploy to toshi.gerege.mn)
- Built Go+PostgreSQL backend (metadata-driven, st-token JWT, RBAC, grid DSL, generic CRUD). 12 models.
- Tests all green: grid 91.8% cov, 7 integration tests (login/auth/dict/dashboard/CRUD/grid/RBAC) vs Postgres. Running-server smoke curl OK.
- Repo gerege-systems/teami-gerege-uz (private); redacted live password before push.
- CI (GitHub Actions) PASSING: gofmt/vet/test+race with Postgres service.
- Deploy workflow + Caddy TLS deploy stack wired; secrets set. DNS toshi.gerege.mn already -> server.
- BLOCKED: server SSH is publickey-only (password disabled). Deploy key generated + set in secrets; user must authorize it on the server, then Deploy runs.

## Session 2 — DEPLOYED to toshi.gerege.mn (LIVE)
- Server SSH was key-only + no keys present (fresh Ubuntu 26.04). Password auth off.
- Entered via provider VNC console (38.180.91.53:5902) with vncdotool.
- QEMU VNC keymap breaks shifted symbols; `key <symbol>` hangs. Solved: generated a no-'+' ed25519 key, wrote via `tee` (no redirect), fixed underscore in filename via backtick+printf '\137'.
- Installed nothing extra (docker preinstalled). Deployed docker compose (api+db), api on 127.0.0.1:8080.
- Host nginx (already on 80/443, serving open/osb.gerege.mn) reverse-proxies toshi.gerege.mn; TLS via certbot.
- LIVE + verified: https://toshi.gerege.mn/health -> {success:true}; http->https 301; login -> JWT.
- deploy.yml aligned (nginx first-deploy-only to preserve certbot TLS); secrets synced.

## Session 2 — FULL ~1000-endpoint backend (user: build ~1000 APIs)
- Logged out VNC console.
- Built cmd/gen generator: parses docs/endpoints-params.txt -> 0003_generated.sql (251 tables) + generated.go (399 base models + 588 sub-actions).
- Added Virtual model + generic SubAction handler; router auto-mounts base CRUD/grid + every {model}/{action}.
- Total surface: 411 base models + 588 sub-actions = 999 endpoints. All tests green (surface + count + auth + CRUD).
- Column safety: c_ prefix (reserved-word proof), ?query variants stripped, table g_ prefix.
- Next: commit -> CI/CD auto-deploys full surface to toshi.gerege.mn.

## Session 2 — FULL SURFACE LIVE + verified on toshi.gerege.mn
- CI/CD auto-deployed the 999-endpoint surface. Verified 15/15 sample endpoints (base+sub-action, GET/POST) -> 200 + envelope.
- CRUD roundtrip on generated 'channels': create returns UPPER_CASE record, totalCount=1.
- login 405 on GET (POST-only, correct), channels 401 without token (auth enforced), health 200.
- DONE: ~1000 endpoints implemented, tested, CI/CD, and LIVE at https://toshi.gerege.mn.

## Session 2 — Frontend (replicate all screens, own stack) — LIVE
- Stack: Vite + React + TS + React Router + MapLibre GL + extracted Toshi theme.
- Metadata-driven (like backend): login, app shell (header+dark sidebar real menu), dashboard (KPI+cards),
  generic Module page (any model -> grid + detail CRUD + query filter), Archives, GIS (OSM map + markers).
- Wired to live API; deployed static to /opt/toshi/frontend; nginx serves SPA + proxies /ec3api.
- Verified in browser: login -> dashboard (live KPI 1/0/66%), pointtypes grid (6 seeded rows), GIS map (Choibalsan, 1 point).
- deploy.yml builds frontend (node) + rsyncs dist; nginx config self-contained (static+api+TLS).

## Session 2 — Branded login screen + app starts from login
- Fetched real TOSH logo (assets/img/logo.png) and embedded it.
- Rebuilt Login as a branded full-page screen: logo, "TEAMI Enterprise 3.0", login/password, language selector, error, footer, subtle gradient bg, themed (light/dark).
- Confirmed app entry: root "/" redirects to /login when unauthenticated -> starts from login.
- Verified live: login screen renders, login -> dashboard works. Deployed to toshi.gerege.mn.

## Session 2 — Real data import + flyout menu + real-logo header
- Added POST /ec3api/v1/admin/import/{model} (upsert incl PK, replace mode). Dropped FKs + relaxed NOT NULL (0005) for importing real, partial data.
- Imported REAL data from source system (browser-mediated, cross-origin to my API): grouptypes 17, pointtypes 6, meter types 21, ecocategories 4, ecoprofiles 7, dataservers 7, systemmodules 35, measuringdevices 89, datapoints 31, points 87 (derived from meters).
- Dashboard now shows real 87 accounting points / 31 reading points.
- Rebuilt sidebar as cascading hover FLYOUT menu (nested), matching real TEAMI; header uses real TOSH logo centered + right icon cluster.
- 0004 dedup fixed duplicated seeded dictionaries.
- Verified live: /m/points shows real 87 points; flyout submenu opens on hover.

## Session 3 — Final module completion + topology E2E (2026-09-25)
- Added bespoke domain APIs and screens for readings, event register, reports, telesignals, schemes, load control,
  quality reports and meter registry; preserved the TOSH shell and dashboard advantages.
- Rebuilt `/m/points` around the real recursive group topology. Added root filtering, code/name search, group and
  recipient/category editing, related profile/tariff data, and point-context links to measurements and meters.
- Fixed generic Module filtering so Apply uses the submitted value, URL exact filters work, and empty result
  pagination/filter labels remain correct.
- Made Vite's dev API proxy configurable with `VITE_API_PROXY` while retaining the live server as the default.
- Verified with a production frontend build, Go 1.26 backend tests, and a local PostgreSQL/API browser E2E run.

## Session 4 — GIS parity + responsive application shell (2026-09-26)
- Compared the source and TOSH GIS screens side by side in Chrome and restored the source toolbar structure:
  object search, map/object selectors, legend, orientation reset and six-row live object summary.
- Switched the map workflow from meter-only markers to accounting-point markers with point/meter detail,
  configured two-day availability state, direct point/meter navigation and OSM/Esri layer switching.
- Rebuilt the application shell below 760px as an overlay drawer with nested touch-friendly menu expansion;
  compacted the header and content spacing so all modules retain usable viewport width on mobile.
- Verified the production build, desktop search/detail flow, both tile layers, legend, 390x844 layout and mobile drawer.

## Session 5 — precision GIS parity + full-system audit (2026-09-30)
- Audited all 11 primary TEAMI/TOSH route pairs at the same 1920x889 viewport; every route loaded and both browser audit tabs remained free of console errors.
- Replaced approximate GIS markers with the exact source 22x30 green/gray PNG assets, matched the ArcGIS y-offset anchor, restored 87 records on 46 source coordinate slots, refined the initial map framing and added the metric scale bar.
- Exercised the GIS popup and downstream links end to end. Archive selection already worked; repaired the quality-report deep-link so it selects the requested point and expands its parent groups.
- Kept TOSH operational advantages, including populated event/report/relay views and reference dictionaries, instead of copying source empty states.
- Added the reproducible audit report at `docs/10-system-parity-audit.md`.
