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
