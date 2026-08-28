# EC3 Backend (Go + PostgreSQL)

`docs/`-д баримтжуулсан **TEAMI/EMCOS EC3** API-ийн конвенцийг Go + PostgreSQL дээр
дахин хэрэгжүүлсэн backend. Эх системийн адил **metadata-driven**.

## Онцлог
- **`st-token` JWT** нэвтрэлт (`golang-jwt`, bcrypt нууц үг), серверийн талд **RBAC**.
- **`{success, data[, totalCount]}`** дугтуй; алдаа `{success:false, code, message}`.
- **Generic grid DSL**: `POST /{model}/query {limit,offset,filters:[{c,p,v}],order}` →
  whitelist-баганаар parameterized SQL (injection-гүй).
- **Metadata-driven registry**: model бүр (table, талбар, action, RBAC) → нэг generic
  handler `list/get/create/update/delete`. Шинэ endpoint = тохиргоо, код биш.
- Oracle `ST_` схемийг Postgres-т буулгаж, SQL alias-аар `POINT_ID` гэх UPPER_CASE key-г хадгална.

## Багц бүтэц
```
cmd/server        — entrypoint (config, db, migrate, seed, serve)
internal/config   — env тохиргоо
internal/db       — pgx pool + embedded migrations + seeder
internal/auth     — JWT issue/parse, st-token middleware, RBAC
internal/httpx    — response envelope
internal/grid     — grid filter DSL -> parameterized SQL
internal/resource — model registry + generic CRUD/grid handler
internal/handlers — auth (login/change_pw), dashboard, usersettings
internal/router   — /ec3api/v1/* маршрутууд
internal/apitest  — integration тестүүд (httptest ↔ Postgres)
```

## Ажиллуулах
```bash
# Postgres (dev)
docker run -d --name emcos-pg -e POSTGRES_PASSWORD=emcos -e POSTGRES_USER=emcos -e POSTGRES_DB=emcos -p 55432:5432 postgres:16-alpine
docker exec emcos-pg createdb -U emcos emcos_test    # тестийн DB

make test    # бүх тест (unit + integration)
make run     # серверийг :8080 дээр асаах
# эсвэл бүхэлд нь:
make up      # docker compose (api + postgres)
```

## Endpoint (хэрэгжүүлсэн)
| Method | Path | Тайлбар |
|---|---|---|
| POST | `/ec3api/v1/user/login` | Нэвтрэх → `{token,...}` (client нь `st-token`-оор илгээнэ) |
| POST | `/ec3api/v1/user/change_pw` | Нууц үг солих |
| GET  | `/ec3api/v1/homedashboard/query` | Dashboard товчны тодорхойлолт |
| POST | `/ec3api/v1/homedashboard/data` | KPI (тооцооны/унших цэг, суваг) |
| GET/POST | `/ec3api/v1/usersettings` | Хадгалсан харагдац (модулиар) |
| GET  | `/ec3api/v1/{model}` | Жагсаалт (+`?limit&offset`) |
| POST | `/ec3api/v1/{model}/query` | Grid шүүлт/pagination |
| GET  | `/ec3api/v1/{model}/{id}` | Нэг мөр |
| POST/PUT/DELETE | `/ec3api/v1/{model}[/{id}]` | Үүсгэх/засах/устгах |

Бүртгэсэн model: `grouptypes, pointtypes, measuringdevicetypes, ecocategories,
ecoprofiles, dataservers, systemmodules, groups, points, measuringdevices, datapoints, events`.
Бусад 900+ endpoint-ыг registry-д model нэмэх замаар өргөтгөнө
([../docs/endpoints-params.txt](../docs/endpoints-params.txt)).

## Тест
- Unit: grid filter DSL (injection-ээс хамгаалалт), JWT (roundtrip/tamper/expiry).
- Integration (Postgres): login, auth 401, dictionary, dashboard, points CRUD,
  grid+filter+pagination, injection→400, RBAC 403. Бүх схемийг hermetic-ээр дахин үүсгэнэ.
