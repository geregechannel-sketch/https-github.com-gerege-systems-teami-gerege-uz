# 02 — Системийн архитектур

## 2.1 Өндөр түвшний харагдац

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Хэрэглэгчийн браузер                          │
│   React SPA (TEAMI Enterprise)  —  /teami/ дор статикаар үйлчилдэг      │
│   Redux Toolkit + RTK Query · React Router · i18next · axios · ace     │
└───────────────┬───────────────────────────────────────────────────────┘
                │  HTTP(S), header: st-token: <JWT>
                │  (сонголтоор Azure AD / MSAL SSO)
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Microsoft IIS 10  (веб сервер)                     │
│   • Статик SPA файл (/teami/*.js, assets, globalSettings.json)         │
│   • REST API reverse endpoint: /ec3api/v1/*                            │
└───────────────┬───────────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 EC3 API үйлчилгээ  (ec3api/v1, backend)                │
│   • JWT баталгаажуулалт (st-token) · RBAC эрхийн шалгалт               │
│   • Metadata/SQL-driven загвар: {model}/{action} → route + structure   │
│   • {model}/query → Oracle SQL буцаана, {model}/data → гүйцэтгэнэ       │
└───────────────┬───────────────────────────────────────────────────────┘
                │  Oracle client (SQL)
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Oracle DB  (ST_ схем)                            │
│   ST_POINT0 (цэг) · ST_DP (суваг) · тоолуур · бүлэг · толь бичиг ·      │
│   архив (цаг цуваа) · үйл явдал · тохиргоо · хэрэглэгч/эрх              │
└───────────────┬───────────────────────────────────────────────────────┘
                ▲
                │  өгөгдөл цуглуулах (poll/push)
┌───────────────┴───────────────────────────────────────────────────────┐
│         DAS — Data Acquisition Servers (7 ш)  +  тоолуур/контроллер     │
│   ИИК-ээр дамжуулан хэмжилтийн төхөөрөмжөөс өгөгдөл татна               │
└───────────────────────────────────────────────────────────────────────┘
```

## 2.2 Компонентууд

### A. Frontend SPA
- **Технологи:** React, Redux Toolkit + RTK Query (`reducerPath:"api"`), React Router
  (`createBrowserRouter`, 137 маршрут), i18next/react-i18next, axios, dayjs, lodash, qs,
  react-virtualized (том grid), ace editor (SQL/тайлан/схем засварлагч), Azure MSAL.
- **Хүргэлт:** webpack bundle (`main.<hash>.js` + code-split lazy chunk-ууд, ~852),
  IIS 10 дээр `/teami/` замд. `window.__basePath__ = '/teami'`.
- **Тохиргоо:** `assets/globalSettings/globalSettings.json` (apiApp, хэл, chart, quality
  талбар), `customSettings.json`, `msalConfig.json`. Дэлгэрэнгүй → [07-frontend.md](07-frontend.md).

### B. IIS веб сервер
- Microsoft-IIS/10.0. SPA статик болон `ec3api/v1` API-г нэг host:port дор үйлчилдэг
  (`apiHost=null, apiPort=null` тул frontend одоогийн origin-ийг ашиглана).

### C. EC3 API backend (`ec3api/v1`)
- REST маягийн үйлчилгээ. Гол зарчим: **metadata/SQL-driven**.
  - Эндпойнт бүр `{model}/{action}` бүтэцтэй; model бүр `route` (HTTP method → зам) ба
    `structure` (параметрийн тодорхойлолт: `get`/`query`/`add`/`nonNull`/`useRawData`) агуулна.
  - Frontend request builder эдгээр metadata-аас URL, query, body-г угсарна
    (Frontend талд, [03-api-spec.md](03-api-spec.md#механизм) үзнэ үү).
  - `{model}/query` нь тухайн товчлуур/тайлангийн **Oracle SQL**-ийг буцаана,
    `{model}/data` нь түүнийг гүйцэтгэж мөрүүдийг өгнө (dashboard, тайлангийн хөдөлгүүр).
- **Хариу дугтуй:** `{ "success": true, "data": [...] }`; grid дээр `totalCount` нэмэгдэнэ;
  алдаа `{ "success": false, "code": <int>, "message": "..." }` (HTTP 4xx).

### D. Oracle өгөгдлийн сан
- `ST_` угтвартай схем. Гол хүснэгт: `ST_POINT0` (цэг), `ST_DP` (суваг), тоолуур, бүлэг,
  толь бичиг, архив, үйл явдал. Дэлгэрэнгүй → [04-data-model.md](04-data-model.md).

### E. DAS ба хэмжих төхөөрөмж
- 7 DAS (`dataservers`: DAS_ID, DAS_NAME, DAS_ENABLED, DAS_ACTIVE). Тоолуур/контроллероос
  ИИК-ээр өгөгдөл цуглуулж Oracle руу бичдэг. "Считывание показаний" модуль бодит цагийн
  холбоо/уншилтыг харуулна.

## 2.3 Нэвтрэлт ба session урсгал
1. Хэрэглэгч нэр/нууц үгээр нэвтэрнэ → backend JWT олгоно.
2. JWT `localStorage.jwtToken`-д хадгалагдана (мөн `privileges`, `company`, `department`,
   `expiryDate`, `authType`, `appGlobalSettings`).
3. Дараагийн бүх хүсэлт `st-token: <jwtToken>` header-тэй явна (axios interceptor нэмнэ).
4. Сонголтоор Azure AD (MSAL) SSO — `msalConfig.json` (appId, authority, scopes).
5. Backend эрх (RBAC) шалгаж, эрх дутвал 4xx `{success:false, message:"Недостаточно прав..."}`.

Дэлгэрэнгүй → [06-auth-security.md](06-auth-security.md).

## 2.4 Deployment топологи (ажиглагдсан)
- Нэг Windows сервер: IIS 10 + EC3 API + (мөн `C:\xampp\htdocs\emcos3` зам — түүхэн
  PHP/XAMPP бүрэлдэхүүн байж болзошгүй). Oracle DB (тусдаа эсвэл нэг серверт).
- DAS-ууд ижил эсвэл салангид хостод; тоолууртай ИИК/сериал/TCP-ээр холбогдоно.
- Frontend build нь backend-тэй ижил origin (port 8080) дор.

## 2.5 Design зарчмууд (дахин бүтээхэд анхаарах)
- **Metadata-driven:** эндпойнтуудыг hard-code хийхгүй; model config (route+structure)
  нь API гэрээг тодорхойлно. Энэ нь шинэ entity/grid-ийг код багатай нэмэх боломж олгоно.
- **SQL-driven тайлан/dashboard:** SQL-ийг DB/тохиргоонд хадгалж, API гүйцэтгэнэ.
  → Аюулгүй байдлын анхаарал: SQL хадгалалт/гүйцэтгэлийг зөвхөн эрхтэй админд нээх.
- **Generic grid DSL:** бүх жагсаалт `{limit,offset,filters:[{c,p,v}]}`-ээр pagination/шүүлт.
- **Тусгаарлагдсан frontend:** SPA нь зөвхөн API-тай HTTP-ээр харьцана; өөр backend хамаарал үгүй.
