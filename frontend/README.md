# Toshi Frontend

TEAMI Enterprise (EMCOS EC3)-ийн дэлгэцүүдийг өөрийн API-д тааруулан хийсэн SPA.

## Стек
Vite + React + TypeScript + React Router + MapLibre GL + **Toshi theme** (docs/toshi-theme/-ээс).

## Онцлог (metadata-driven — backend шиг)
- **Login** → `POST user/login` → `st-token` (localStorage), protected routes.
- **App shell**: TOSH header (хэрэглэгч, theme toggle, гарах) + бараан sidebar (эх аппын модулийн цэс).
- **Dashboard**: 3 KPI (`homedashboard/data`) + модуль картууд.
- **Generic Module** (`/m/<model>`): аль ч API model-ыг grid (баганаг хариунаас) + detail form
  (CRUD: create/update/delete) + `POST {model}/query` шүүлт/pagination болгон харуулна.
  → ~400 model нэг компонентоор.
- **Archives** (`/archives`): цэгийн жагсаалт + хугацаа + `archives/point`.
- **GIS** (`/gis`): MapLibre + OSM + цэгийн маркер (Чойбалсан).

## Ажиллуулах
```bash
npm install
npm run dev     # dev proxy -> https://toshi.gerege.mn
npm run build   # -> dist/
```

## Deploy
CI/CD: `npm run build` → `dist/` -ийг серверийн `/opt/toshi/frontend`-д rsync;
nginx static (SPA fallback) + `/ec3api` proxy. Live: **https://toshi.gerege.mn**.
