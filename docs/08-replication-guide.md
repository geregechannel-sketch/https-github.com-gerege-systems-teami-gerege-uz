# 08 — Системийг дахин бүтээх заавар

> Энэ систем (TEAMI/EMCOS EC3)-ийг эхнээс нь бүтээх дараалал. Гурван давхарга:
> Oracle DB → EC3 API (backend) → React SPA (frontend).

## Алхам 0 — Орчин бэлтгэх
- **DB:** Oracle (11g+). Схем `ST_`. (Эх систем XAMPP/emcos3 зам ашигласан ч гол нь Oracle.)
- **Backend хост:** Windows + IIS 10 (эх шиг) эсвэл дурын reverse-proxy + app сервер.
- **Build:** Node.js (SPA build), Oracle client (backend).

## Алхам 1 — Өгөгдлийн сан
1. `ST_` схем үүсгэх. Гол хүснэгт ([04-data-model.md](04-data-model.md)):
   - `ST_POINT0` (цэг), `ST_DP` (суваг), тоолуур, бүлэг, толь бичгүүд, архив, үйл явдал,
     хэрэглэгч/эрх, `usersettings (UV_)`.
2. Толь бичгийг populate: grouptypes(17), pointtypes(6), measuringdevicetypes(21),
   ecocategories(4), ecoprofiles(7), realtimeprofiles(4), fillingprofiles(2),
   verificationprofiles, linkprofiles, aggfunctions, datasourcetypes(3), systemmodules(35),
   ph/dl/dp_type.
3. Нэршлийн конвенц: `<E>_ID` PK, `<E>_CODE`, `<E>_NAME`, `<E>_ENABLED/_DELETED`,
   аудит `DBU`/`DB_TIME`/`USER_ID`.
4. Тусгай мөр: `POINT_CODE='EMCOS_STATUS'`, `DP_CODE='GENERATED_BY_ORACLE'`.

## Алхам 2 — EC3 API (backend, `ec3api/v1`)
1. **Auth:** login → JWT; header `st-token` шалгах middleware. Богино expiry + refresh.
2. **RBAC:** эндпойнт/үйлдэл бүрд серверийн эрх шалгалт; эрх дутвал
   `{success:false,code,message}` (HTTP 4xx).
3. **Envelope:** бүх хариу `{success,data}`; grid `{...,totalCount}`.
4. **Metadata давхарга:** model config (route+structure). Эсвэл (энгийнээр) эндпойнт бүрийг
   тодорхой кодлох. Хамгийн багадаа дараах бүлгийг хэрэгжүүл:
   - Session: `usersettings?uv_module=`
   - Point-menu: `pointmenuv2/{curr_root,top_gr,groups,points,signals,group_ffp,point_ffp}`,
     `parammenuv2/ms_type`
   - Толь бичиг (жагсаалт GET): дээрх бүгд
   - Entity: `measuringdevices?offset&limit`, `points`, `groups`, `datapoints`, `dataservers`,
     `systemmodules`
   - Grid query (POST): `ev` + generic `{limit,offset,filters:[{c,p,v}]}` → `{data,totalCount}`
   - SQL-driven: `homedashboard/query`(SQL)/`homedashboard/data`(гүйцэтгэл); тайлан/монитор адил
5. **Generic filter DSL:** `filters:[{c,p,v}]` → SQL WHERE (bind параметрээр, injection-гүй).
   Оператор `p` (=, LIKE, >, < г.м) цагаан жагсаалт.
6. **SQL хадгалалт:** query/data хосыг тохиргоо/DB-д хадгалж, зөвхөн эрхтэй засах.

## Алхам 3 — Frontend (SPA)
1. React + Redux Toolkit + React Router + i18next + axios (эсвэл дүйцэх стек).
2. `globalSettings.json`-оор тохируул: `apiApp="ec3api/v1/"`, хэл, chart, quality талбар.
3. axios interceptor: `url = apiBaseUrl + url`, header `st-token`.
4. Route/модуль ([05-functional-spec.md](05-functional-spec.md)) — эхлээд гол 10 модуль,
   дараа нь дэд модулиуд. Lazy chunk-ээр split.
5. Grid компонент → `{limit,offset,filters}` + `totalCount` pagination.
6. Point-tree компонент (`pointmenuv2/*`), толь бичгийн dropdown-ууд.
7. i18n (ru/uz/en доод тал), theming (light/dark).
8. (Сонголт) MSAL SSO — `msalConfig.json`.

## Алхам 4 — Өгөгдөл цуглуулга (DAS)
1. DAS үйлчилгээ (`dataservers`): тоолуур/контроллероос протоколоор (ИИК) унших.
2. Архив хүснэгт рүү цаг цувааны утга бичих; уншилтын мөчлөг (`manage_periods`).
3. `show`/`das`/`direct_read` модулиуд бодит цагийн холбоо/уншилт.

## Алхам 5 — Тайлан / баланс / чанар
1. Тайлангийн хөдөлгүүр (query/data, ace editor засварлагч, `report_executor`, `automated_reports`).
2. Баланс (`balance_config/view`, `loss_wizard`), схем (`schemes_*`).
3. Чанар (`quality_reports`, `verification`), орлуулга (`substitution`).

## Алхам 6 — Аюулгүй байдал / production ([06-auth-security.md](06-auth-security.md))
- HTTPS/TLS, JWT expiry+refresh, серверийн RBAC, аудит, rate-limit, CSP/XSS,
  SQL-driven хэсгийг параметржүүлэх, `sql_debugger`/`test_igor*` production-д хаах.

## Хамгийн бага амьд систем (MVP) дараалал
1. Oracle схем + толь бичиг + цөөн цэг/тоолуур/бүлэг.
2. API: auth(st-token) + envelope + `pointmenuv2/*` + толь бичиг GET + `measuringdevices` +
   generic grid `POST {model}` + `homedashboard/query|data`.
3. SPA: login → dashboard(KPI) → Просмотр архивов + Конфигурация(Точки/Счетчики) + Регистр событий.
4. Дараа нь модуль нэмэх (тайлан, баланс, ачаалал, GIS, DAS).

## Баталгаажуулах шалгуур
- `st-token`-гүй хүсэлт 401; буруу эрх 4xx.
- Grid `totalCount` зөв, `filters` ажиллана.
- Dashboard KPI (тооцооны/унших цэг, сувгийн бэлэн байдал) харагдана.
- Цэг/тоолуур CRUD; архив query/data мөр буцаана.
- 7 хэл, theme солигдоно.
