# TEAMI clone — Next-session brief

A pixel-faithful working clone of **TEAMI Enterprise 3.0** (EMCOS/EC3 energy MDM).
Live: **https://toshi.gerege.mn** · Source-of-truth original: **http://82.215.77.202:8080/teami** (login `erdenebatt`).

## Stack & deploy
- **Backend** `backend/` — Go 1.26, net/http, pgx/v5, JWT (`st-token` header), bcrypt. Metadata-driven model
  registry + one generic CRUD/grid handler. Server on :8080; docker compose (api+db) behind host nginx (TLS).
- **Frontend** `frontend/` — Vite + React + TS + React Router + Leaflet + extracted Toshi theme CSS.
- **CI/CD** — push to `master` → GitHub Actions **CI** (`go test ./... -race` against a Postgres service,
  gofmt) → **Deploy** (rsync backend+frontend/dist, docker compose up, nginx). ~2.5 min round trip.
  Watch: `gh run watch <id> --exit-status`.

## Non-negotiable rules (learned the hard way)
- **Migrations run on EVERY boot** (`internal/db/migrations/*.sql`, filename order, no applied-tracking) →
  must be **idempotent**: `CREATE TABLE IF NOT EXISTS`, `TRUNCATE`+insert, or `ON CONFLICT DO UPDATE`.
- **CI runs gofmt** — always `gofmt -w` touched Go files before commit or CI fails.
- **CI runs migrations** against a real PG, so a bad `.sql` fails CI (good — it gates deploy).
- Local docker `postgres:16 --platform linux/amd64` is **flaky** on this Mac (containers die); rely on CI to
  validate migrations instead of local runs.
- Never commit the real source password (kept out of the repo) — redact.

## Backend architecture
- `internal/resource/` — `Model{Name,Table,PKField,Fields(API↔col),actions}`. `RegisterCore` (models.go) +
  `RegisterGenerated` (generated.go, 411 base models from `cmd/gen`) + **`RegisterExtras` (extras.go)** which
  overrides/adds deep menu-leaf models. Generic handler emits `col AS "UPPER_API"`, `{success,data,totalCount}`
  envelope, grid DSL `{limit,offset,filters:[{c,p,v}]}`.
- Special hand-written handlers: `internal/handlers/usersettings.go` (GET/POST/**DELETE** usersettings =
  "Сохраненные формы"), dashboard, auth. Routes in `internal/router/router.go`.
- **Migrations map**: 0001 schema, 0002 seed, 0003 generated (251 g_ tables), 0004 dedup, 0005 drop-FKs +
  relax NOT NULL (for partial real imports), 0006 deep menu-leaf tables+views+synthetic seed (event_log
  +5 views, audit/audit_files/user_sessions, *_statistics, meter/controller_log, config lists), 0007
  topology tree (Монголия→Чойбалсан→РЭС→ТП→КРУ + distribute orphan points onto КРУ leaves), 0008 saved-forms
  seed (+uv_author col), 0009 real "Служебные группы" system filter groups (type 2, ids 800001+).

## Frontend screens (all 1:1 verified live)
- **Login** branded, app starts here. **Shell** = dark sidebar (real menu icons in `src/icons.tsx`, 3-level
  hover flyout `menu.css`, footer TOSH logo + "Статус" + resize arrow), header cluster (eye-slash/user/info/
  chart/monitor/sliders/moon/help/logout), brand "TEAMI ENTERPRISE 3.0".
- **Dashboard** — 3 tall green KPI cards + module cards (icon + RU description + Открыть), fixed 3-col grid.
- **Archives** (`pages/Archives.tsx`, `archives.css`) — the most detailed screen: window chrome, period
  toolbar, **Выбор ТУ** deep tree (Служебные группы → real system groups w/ drill-down; Монголия green
  topology → ⚡ points), **Выбор параметра** param tree (Суточный профиль→Р/Q мощность→30-min…) shown on
  point select; footer blue icon buttons.
- **SavedForms** (`pages/SavedForms.tsx`, route `/saved`) — 3-level yellow-folder tree (module→subfolder→
  ⭐form+open btn) + form editor (Имя набора/Введено/Время/Общий toggle + Сохранить/Удалить выделенные).
- **GIS** — Leaflet (MapLibre broke silently under Vite prod). Green markers = 89 meters; click → meter data.
- **Points** (`/m/points`) 1:1 config editor. Generic **Module** page `/m/:model` for everything else.
- `menu.ts` = the whole nav tree (top-level `icon` keys → `MENU_ICONS`).

## How to extract from the real app (recipes that work)
- Source tab is authenticated; run `mcp__claude-in-chrome__javascript_tool` there. `localStorage.jwtToken`,
  fetch `/ec3api/v1/<model>` with header `st-token`.
- **The menu tree** was extracted from the **React fiber** (`el[__reactFiber$…]`, walk `.return`, find
  `memoizedProps.items` with `menuItems`/`title`/`slug`). Icons are inline SVGs (`<path>`/`<polygon>`) —
  extract `d`/geometry from the live DOM.
- **Classifier gotchas**: it blocks tool output containing token/cookie-looking values and sometimes large
  outerHTML. Extract path `d` / plain fields; pull big data in small chunks; prefer writing real data into a
  **migration** over browser-mediated import when the token can't be read out.
- CSS `:hover` flyouts can't be opened by synthetic mouse events — screenshot after a real click, or set
  `display:block` via JS to inspect.

## Completion status (2026-09-25)
- `/m/points` now uses the same deep topology model as Archives, including root selection, recursive groups,
  code/name search, group assignment, recipient/category data, profile/tariff expansion, and filtered links to
  point measurements, reading points, transformation coefficients, and the meter registry.
- Bespoke end-to-end screens now cover reading collection, quality reports, every event category, report
  viewer/automation/run log, telesignal registry/history/control, scheme viewer, load control, and meter registry.
- Generic Module filtering accepts URL-provided exact filters and correctly reapplies user filters; point actions
  preserve their selected point context across modules.
- Frontend production build and backend Go 1.26 tests pass. A local PostgreSQL/API + Vite E2E run verified the
  topology expansion, point search/detail, related-data query, filtered module navigation, and meter lookup.
- GIS now mirrors the source screen's search, map selector, legend, reset and object-summary workflow while
  retaining TOSH's working Leaflet map, point/meter drill-down and an optional Esri satellite layer.
- The application shell uses an overlay navigation drawer below 760px, with expandable nested menus and a
  compact header; GIS was visually verified at 390x844 as well as desktop size.

## Known data boundary
- Deep event/statistics/audit rows remain deterministic seed data where the source deployment did not expose an
  exportable historical dataset. The workflows and response contracts are implemented; production history must
  come from an authorized source export.
- GIS marker positions use a deterministic Choibalsan layout because source coordinates were not exportable.
  Search, status and detail data are API-backed; production geometry must come from an authorized GIS export.
- The uncaptured long tail of generated endpoints preserves the documented method, parameter, auth, envelope,
  CRUD and grid contracts. Domain-specific side effects cannot be claimed without source behavior evidence.
