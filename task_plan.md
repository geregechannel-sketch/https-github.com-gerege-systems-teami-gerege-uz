# Task Plan — TEAMI Enterprise (EMCOS EC3) System Documentation

## Goal
Log into http://82.215.77.202:8080/teami, study ALL API endpoints, and produce
complete software-standard documentation needed to fully replicate the system:
API spec, system architecture, functional spec, data model, etc. Many detailed docs.

## Context / Facts
- App: **TEAMI Enterprise v3.0** — a rebrand of **EMCOS / EC3** (energy metering & billing MDM system, Sigma Telas).
- Frontend: React SPA (webpack), served by IIS 10 at `/teami/`, `window.__basePath__=/teami`.
- API base: `${protocol}//${hostname}:${port}/ec3api/v1/` → **http://82.215.77.202:8080/ec3api/v1/**
- Auth: JWT in `localStorage.jwtToken`, sent as header **`st-token`** on every request. Also optional MSAL/Azure AD SSO.
- Credentials: user `erdenebatt`, pass `<REDACTED_PASSWORD>`.
- Multi-language (ru default, uz/u2, en, de, pl, ua). mainBrachID=2.

## Phases

### Phase 1 — Recon & API discovery (static)  — Status: complete
- [x] Fetch index, globalSettings, msalConfig
- [x] Identify API base + auth mechanism
- [x] Download JS bundles for mining

### Phase 2 — Login & live API capture  — Status: complete
- [x] Session active (already authenticated); captured live via fetch/XHR interceptor
- [x] Navigated archives, config/classifiers, points, meters, acquisition, events
- [x] Recorded method, URL, response shape, generic grid filter body
- [x] Extracted schemas via direct fetch (?limit=1 + Object.keys)

### Phase 3 — Endpoint catalog  — Status: complete
- [x] ~55 concrete endpoints + schemas consolidated in findings.md, grouped by domain
- [x] API conventions documented ({model}/{action}, envelope, grid DSL, RBAC, SQL-driven)

### Phase 4 — Write documentation set  — Status: complete
- [x] 00-README.md (index, methodology)
- [x] 01-overview.md (system purpose, scope, glossary)
- [x] 02-architecture.md (components, deployment, tech stack, diagram)
- [x] 03-api-spec.md (conventions + metadata mechanism + full endpoint catalog)
- [x] 04-data-model.md (Oracle ST_ entities, columns, relations)
- [x] 05-functional-spec.md (137 routes grouped, user flows)
- [x] 06-auth-security.md (JWT st-token, MSAL, RBAC, risks)
- [x] 07-frontend.md (SPA structure, config, i18n, theming)
- [x] 08-replication-guide.md (step-by-step rebuild, MVP)

### Phase 5 — Review & polish  — Status: complete
- [x] Cross-check docs vs captured evidence (findings.md ↔ docs/)

### Phase 6 — FULL endpoint extraction (user: "нягтлан судлаж дутууг гүйцээ")  — Status: complete
- [x] Loaded all 852 webpack chunks in-browser (throttled, 0 fail) → 6474 factories
- [x] Scanned model configs → 983 endpoints (up from ~55)
- [x] docs/09-endpoints-full.md (grouped) + docs/endpoints-full.txt (raw)
- [x] Updated 03-api-spec, 00-README, 06-auth-security with real endpoints (user/login, ...)

### Phase 7 — Per-endpoint parameter structure (user: "параметрийн бүтцийг гаргаж нэм")  — Status: complete
- [x] Extracted request_label(method)+structure(params+flags) for all 982 endpoints
- [x] docs/endpoints-params.txt (method + param + get/add/req/opt/nonNull flags)
- [x] Documented flag semantics in 03-api-spec.md; linked from README

### Phase 8 — Toshi Theme (user: "бүх дэлгэцийн design/style-ийг theme болгон toshi theme")  — Status: complete
- [x] Extracted 748 computed CSS design tokens from live app (light-dark() = light+dark in one)
- [x] Captured metrics: Roboto 12px, radius 4px, header 70px, sidebar 220px, 11 button colors
- [x] docs/toshi-theme/toshi-theme.css (tokens + .toshi-* component recipes)
- [x] docs/toshi-theme/toshi-theme-preview.html + README.md
- [x] Verified light & dark render faithfully vs real TOSH screens (screenshots)

## Next Step
DONE. Full docs (10 files) + complete 983-endpoint catalog. All phases complete.

## Decisions Made
| # | Decision | Why |
|---|----------|-----|
| 1 | Combine static bundle mining + live network capture | Endpoints built dynamically; live capture is ground truth |
| 2 | Use planning-with-files | Large multi-doc project, context may be lost |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| Server unreachable after initial requests (curl + browser both fail, internet OK) | 1 | Likely rate-limit/IP block (WAF/fail2ban) triggered by rapid bundle downloads + polling. Back off, wait several minutes, retry gently with single spaced requests. NO hammering. |

### Phase 9 — Go + PostgreSQL backend (user: "go, postgre ashiglan backend buteeh, bu test bichij naidvartai")  — Status: in_progress
- [ ] Scaffold backend/ (go.mod, pgx, jwt, bcrypt), config, db pool
- [ ] Migrations: schema (users/roles, groups, points, meters, data_points, dictionaries) + seed
- [ ] Core libs: envelope, grid filter DSL→SQL (whitelisted), jwt/auth middleware, RBAC
- [ ] Metadata-driven resource registry + generic handler (list/get/create/update/delete)
- [ ] Handlers: user/login, user/change_pw, homedashboard/query+data, usersettings
- [ ] Register core models (pointtypes, grouptypes, meter types, groups, points, meters, datapoints, dataservers, systemmodules...)
- [ ] Router mounts /ec3api/v1/*
- [ ] Tests: unit (filter, jwt, envelope) + integration (login, grid+filter+pagination, CRUD, RBAC 403, dict) vs Postgres
- [ ] go build + go test all green; run server + smoke curl

## Next Step
Build the Go backend under backend/ and get all tests green (Phase 9).

### Phase 10 — CI/CD + deploy to toshi.gerege.mn  — Status: pending
- [ ] Dockerfile (multi-stage) + docker-compose (api + postgres) + .env.example
- [ ] GitHub Actions: build+test on push; deploy over SSH to server (docker compose up)
- [ ] Configure server (docker, firewall), DNS toshi.gerege.mn, reverse proxy/TLS
- [ ] Store secrets in GitHub (SSH key, DB pass) — never commit server creds
