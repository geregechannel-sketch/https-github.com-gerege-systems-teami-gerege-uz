# 03 — API тодорхойлолт (`ec3api/v1`)

> Энэ баримт нь live capture-аар барьсан нотолгоо + bundle-ийн статик анализ дээр
> суурилна. Бүх эндпойнт **ажиглагдсан** хэлбэрээр тэмдэглэгдсэн; тэмдэглэгдээгүй
> хэсгийг metadata механизмаас гаргасан.

## 1. Суурь ба нийтлэг дүрэм

### 1.1 Base URL
```
{protocol}//{apiHost ?? location.hostname}:{apiPort ?? location.port}/{apiApp ?? "ec3api/v1/"}
```
`globalSettings.json`: `apiHost=null, apiPort=null, apiApp="ec3api/v1/"` →
**`http://82.215.77.202:8080/ec3api/v1/`**.

### 1.2 Authentication
- Бүх хүсэлтэд header: **`st-token: <JWT>`** (frontend `localStorage.jwtToken`-оос авна).
- JWT ойролцоогоор 387 тэмдэгт; `expiryDate` хадгална. Дэлгэрэнгүй → [06-auth-security.md](06-auth-security.md).

### 1.3 Хариу дугтуй (envelope)
```jsonc
// амжилт (жагсаалт)
{ "success": true, "data": [ { /* мөр */ } ] }
// амжилт (grid, pagination)
{ "success": true, "data": [ /* мөрүүд */ ], "totalCount": 1234 }
// амжилт (нэг объект)
{ "success": true, "data": { /* объект */ } }
// алдаа (HTTP 4xx)
{ "success": false, "code": 400, "message": "Недостаточно прав на выполнения операции" }
```

### 1.4 Эндпойнтын нэршил
- Ерөнхий хэлбэр: **`{model}` эсвэл `{model}/{action}`**.
  - Энгийн толь бичиг: `grouptypes`, `pointtypes`, `measuringdevicetypes` (action-гүй).
  - Дэд үйлдэлтэй: `pointmenuv2/points`, `homedashboard/data`, `datasourcetypes/src_type_from_src`.
- HTTP method: `GET` (унших/жагсаалт), `POST` (grid query, үүсгэх/засах/устгах, зарим унших).
- Query параметр GET дээр: `?offset=&limit=` (pagination), `?gr_id=` (бүлэг), `?uv_module=` г.м.

<a name="механизм"></a>
## 2. Metadata-driven request механизм (frontend талаас)

Frontend эндпойнт бүрийг **model configuration**-оос угсарна. Model бүр action бүрдээ:
- `route`: `{ GET: "...", POST: "...", DEFAULT: "..." }` — үндсэн зам.
- `structure`: параметр бүрийн тодорхойлолт, тугнууд:
  - `get: true` → GET query-д заавал; `get: <бус true>` → байвал query-д нэмнэ.
  - `query: true` → POST-д query string-д заавал.
  - `add: true` → POST body-д; `nonNull: true` → null байж болохгүй (заавал).
  - `useRawData: true` → `data`-г бүтнээр body болгож илгээнэ.

Угсралт (bundle-аас гаргасан псевдокод):
```
url = route[METHOD] || route.DEFAULT
if (ids)   url += "/" + ids.join("/")
if (query) url += "?" + qs.stringify(queryParams)   // addQueryPrefix
headers["st-token"] = localStorage.jwtToken
// GET: te(); POST: oe(); body = add-параметрууд эсвэл useRawData ? data : {}
```
Заавал параметр дутвал frontend `"Missing required parameter"` / `"Missing action
'<x>' inside model configuration"` алдаа гаргана.

**structure-ийн жинхэнэ туг (model config-оос):**
| Туг | Утга |
|---|---|
| `get:!0` (true) | GET query параметр, **заавал** |
| `get:!1` (false) | GET query параметр, сонголтоор |
| `add:!0` / `add:{nonNull:!0}` | POST/PUT body талбар, заавал (nonNull=null байж болохгүй) |
| `add:!1` | POST/PUT body талбар, сонголтоор |
| `query:!0/!1` | query string-д (POST үед) |
| `useRawData` | `data`-г бүтнээр body болгоно |
| (туггүй) | ихэвчлэн хариунд буцах/дотоод талбар (ID г.м.) |
| `request_label:{GET|POST|PUT|DELETE}` | тухайн action-ы HTTP method |

Бүх 982 endpoint-ийн бүрэн параметрийн жагсаалт → [endpoints-params.txt](endpoints-params.txt).

> **Дахин бүтээхэд:** backend талд model бүрд route+structure-ийг тодорхойлж, generic
> handler-ээр SQL/CRUD руу буулгах нь эх системийн зарчим. Frontend-д ижил metadata
> давхарга шаардлагатай (эсвэл эндпойнт бүрийг тодорхой кодлож болно).

## 3. Generic grid query (жагсаалтын стандарт)
Grid өгөгдлийн эндпойнт (жишээ: `POST ev`) дараах body авна:
```jsonc
{
  "limit": 100,
  "offset": 0,
  "filters": [ { "c": "<багана>", "p": "<оператор>", "v": "<утга>" } ],
  // + нэмэлт id-ууд (жишээ: ev_view, evc_id, gr_id ...)
}
```
Хариу: `{ success:true, data:[...], totalCount:<нийт> }`.
`filters` нь багана/предикат/утгын ерөнхий DSL; `limit/offset` pagination.

## 4. SQL-driven query/data (dashboard ба тайлангийн хөдөлгүүр)
- `GET homedashboard/query` → `[{ "RPQ_SLC": "<Oracle SQL текст>" }]` (товч тус бүрийн SQL).
- `POST homedashboard/data` → SQL-ийг гүйцэтгэж `[{ TITLE, DATE_VALUE, STAT, COLOR, URL }]`.
- Ижил `query`/`data` хос тайлан/dashboard/монитор модулиудад хэрэглэгдэнэ.

## 5. Эндпойнтын каталог

> **БҮРЭН ЖАГСААЛТ (983 endpoint): [09-endpoints-full.md](09-endpoints-full.md)**
> (түүхий: [endpoints-full.txt](endpoints-full.txt)).
> **ПАРАМЕТРИЙН БҮТЭЦ (982): [endpoints-params.txt](endpoints-params.txt)** — endpoint бүрийн
> HTTP method + параметрийн нэр + туг (`get=req/opt` GET query, `add=req/opt` body, `nonNull`).
> Жишээ: `points [GET,PUT] :: POINT_ID(get=req), POINT_NAME, POINT_ENABLED, POINT_COMMERCIAL,
> POINT_AUTO_READ_ENABLED, POINT_LICENSED, ECP_ID, ...`
> Энэ нь браузерт бүх **852 webpack chunk**-ийг ачаалж, model config бүрийн `route`
> тодорхойлолтыг scan хийж гаргасан **бүрэн** API гадаргуу — 414 үндсэн бүлэгт.
> Доорх хэсэг нь live-capture-аар **хариу схемтэй** нь баталгаажсан үндсэн endpoint-ууд
> (Oracle багануудтай). Бусад 900+ endpoint ижил конвенц (`{model}/{action}`, дугтуй,
> grid DSL)-оор ажиллана.

Тэмдэглэгээ: `M PATH [?query]` → `хариу товч`. Багануудын нэр = Oracle багана.

### 5.1 Session / хэрэглэгч
| Method | Path | Query | Хариу (гол талбар) |
|---|---|---|---|
| GET | `usersettings` | `uv_module=<MODULE>` | `[{UV_ID,UV_NAME,UV_PUBLIC,UV_MODULE,UV_TYPE,UV_SUBTYPE,UV_TECH_INFO,USER_NAME,DB_TIME}]` — модуль тус бүрийн хадгалсан харагдац/форм |

### 5.2 Dashboard
| Method | Path | Хариу |
|---|---|---|
| GET | `homedashboard/query` | `[{RPQ_SLC:<SQL>}]` |
| POST | `homedashboard/data` | `[{TITLE,DATE_VALUE,STAT,COLOR,URL}]` (KPI товч) |

### 5.3 Point-menu / мод (өгөгдлийн модулиудад нийтлэг)
| Method | Path | Query | Хариу |
|---|---|---|---|
| GET | `pointmenuv2/curr_root` | | `{GR_ID}` (одоогийн үндэс бүлэг) |
| GET | `pointmenuv2/top_gr` | | `[{GR_ID,GR_NAME,GR_CODE}]` |
| GET | `pointmenuv2/groups` | `gr_id, check_gr_children` | `[{GR_ID,ID,GRC_NR,GRC_DESC,GR_CODE,GR_NAME,USER_NAME,USER_ID,DBU,IS_PUBLIC,IS_PUBLIC_TXT,GR_TYPE_ID,GR_TYPE_NAME,GR_TYPE_CODE,...}]` |
| GET | `pointmenuv2/points` | `gr_id` | `[{цэгийн мөр}]` |
| GET | `pointmenuv2/signals` | `gr_id` | `[{сигналын мөр}]` |
| GET | `pointmenuv2/group_ffp` | | `[]` (бүлгийн шүүлтүүр профиль) |
| GET | `pointmenuv2/point_ffp` | | (том; цэгийн FFP) |
| POST | `parammenuv2/ms_type` | | `[]` (параметрийн мод — pointmenu-тэй параллель) |

### 5.4 Толь бичиг / классификатор (GET, жагсаалт)
| Path | Хариу (багана) | Тоо |
|---|---|---|
| `grouptypes` | `GR_TYPE_ID, GR_TYPE_CODE, GR_TYPE_NAME` | 17 |
| `pointtypes` | `POINT_TYPE_ID, POINT_TYPE_CODE, POINT_TYPE_NAME` | 6 |
| `measuringdevicetypes` | `METER_TYPE_ID, METER_TYPE_NAME, METER_TYPE_PRODUCER` | 21 |
| `ecocategories` | `EC_ID, EC_CODE, EC_NAME, EC_IN` | 4 |
| `ecoprofiles` | `ECP_ID, ECP_CODE, ECP_NAME` | 7 |
| `realtimeprofiles` | `RTP_ID, RTP_CODE, RTP_NAME` | 4 |
| `fillingprofiles` | `FP_ID, FP_CODE, FP_NAME` | 2 |
| `verificationprofiles` | `VP_ID, VP_CODE, VP_NAME, VP_BIAS, VP_SEPARATE_TFF, VP_SMALLEST_INTERVAL` | 1 |
| `linkprofiles` | `LP_ID, LP_NAME` | 1 |
| `aggfunctions/tff` | `AGGF_ID, AGGF_NAME, AGGF_LABEL_ID` | 3 |
| `tariffplans` | (тарифын төлөвлөгөө) | 0 |
| `databranchsets` | `WITHESET_ID, WITHESET_CODE, WITHESET_NAME, SRC_TYPE_ID, WITHESET_JOURNAL, SRC_TYPE_CODE, SRC_TYPE_NAME` | 7 |
| `substitutiontemplates` | (орлуулгын загвар) | 0 |
| `exchangeaddresses` | (солилцооны хаяг) | 0 |
| `measurelinessets` | (хэмжилтийн шугамын багц) | — |
| `groupmodifications` | (бүлгийн өөрчлөлт) | 0 |
| `systemmodules` | `MDL_ID, MDL_CODE, MDL_NAME` | 35 |
| `dataservers` | `DAS_ID, DAS_NAME, DAS_ENABLED, DB_TIME, DAS_ACTIVE` | 7 |
| `datapoints` | `DP_ID, ...` | 31 |
| `datasourcetypes/src_type_from_src` | `SRC_TYPE_ID, SRC_TYPE_CODE, SRC_TYPE_NAME` | 3 |
| `monitoringtemplates/pma` | **403/400** (эрх дутвал) | — |

### 5.5 Цэг (Points) модуль
| Method | Path | Тайлбар |
|---|---|---|
| GET | `pointmenuv2/points?gr_id=` | Бүлгийн цэгийн жагсаалт |
| — | (form) | Цэгийн шинж: нэр, код, тугнууд (Действителен/Автом.считывание/Коммерческий/Свой/Лицензируемая), Типы точек, Экономические профили, Получатель/отправитель |
| — | (үйлдэл) | Свойства точки, Измерения точки, Считываемые измерения, Изменение коэффициентов трансформации (CT/VT), Замена счетчика, Присвоенные профили, Тарифные планы |

> Цэг үүсгэх/засах нь POST-оор metadata `structure` (add/nonNull) дагуу явна.

### 5.6 Тоолуур (Meters) модуль
| Method | Path | Query | Хариу (багана) |
|---|---|---|---|
| GET | `measuringdevices` | `offset, limit` | `METER_ID, METER_TYPE_ID, METER_NUMBER, MADE, EXPL_START, METER_CLASS, METER_TYPE_NAME, METER_TYPE_PRODUCER, MOU_BT, MOU_ET, POINT_ID, POINT_CODE, POINT_NAME` |
| GET | `profilesdata/filter_data` | `search` | Шүүлтийн туслах |
| GET | `measuringdevicetypes` | | Тоолуурын төрөл |

### 5.7 Уншилт / цуглуулга (Acquisition, `/show`)
| Method | Path | Хариу |
|---|---|---|
| POST | `parammenuv2/ms_type` | `[]` |
| POST | `ph_type_show` | `[{PH_TYPE_ID,PH_TYPE_NAME}]` (6) |
| POST | `dl_type_show` | `[{DL_TYPE_ID,DL_TYPE_NAME}]` (2) |
| POST | `dp_type_show` | `[{DP_TYPE_ID,DP_TYPE_NAME}]` (1) |
| GET | `orn/withe` | (эх сурвалж/салбар) |

### 5.8 Үйл явдал (Events)
| Method | Path | Query/Body | Хариу |
|---|---|---|---|
| GET | `evt` | `evc_id` | Үйл явдлын ангилал/тохиргоо |
| POST | `ev` | `{limit,offset,filters:[{c,p,v}],ev_view,evc_id}` | `{data:[...], totalCount}` — үйл явдлын grid |
| GET | `systemmodules` | | Модуль толь |
| GET | `dataservers` | | DAS толь |
| GET | `datapoints` | | Өгөгдлийн цэг |
| GET | `datasourcetypes/src_type_from_src` | | Эх сурвалжийн төрөл |

### 5.9 Архив (Archives) — цаг цувааны унших
| Method | Path | Query | Тайлбар |
|---|---|---|---|
| GET | `usersettings` | `uv_module=ARCHIVES` | Хадгалсан харагдац |
| GET | `grouptypes`, `pointtypes`, `measuringdevicetypes`, `ecocategories`, `groupmodifications` | | Толь бичиг |
| GET | `pointmenuv2/*` | | Цэгийн мод |
| — | `archives/query`, `archives/data` | цэг+хугацаа+параметр | Архивын өгөгдөл (query→SQL, data→мөр) — modeled ижил query/data хосоор |

> Архивын дэлгэц: хугацааны сонголт (Сегодня/Неделя/Месяц/Год + огнооны муж), цэгийн мод,
> параметрийн сонголт (По ресурсу / По дискретности), Просмотр/Просмотр(гр.).

### 5.10 Бусад домэйн (route-аас гаргасан model slug)
Дараах модулиуд ижил конвенцоор (`{model}/{action}`, grid DSL, query/data) ажиллана.
Тодорхой route → [05-functional-spec.md](05-functional-spec.md):
`balance_config/balance_view/loss_wizard` (баланс), `reports_*`/`report_executor`/
`automated_reports` (тайлан), `quality_reports`/`verification` (чанар),
`power_control_*`/`rgb_*`/`bga*` (ачаалал), `schemes_*` (схем), `das/dp_das/rp_das/xa_das`
(цуглуулга), `user_management`/`user_sessions`/`audit` (админ), `gis` (газрын зураг).

## 6. Алдаа боловсруулах
- HTTP 4xx + `{success:false, code, message}`. Frontend модаль alert-ээр харуулна
  (жишээ: `monitoringtemplates/pma` → 400 "Недостаточно прав на выполнения операции").
- 401/403 (token хүчингүй/дуссан) → нэвтрэлт рүү чиглүүлнэ.

## 7. OpenAPI-д хөрвүүлэх зөвлөмж
- `securityScheme`: apiKey header `st-token`.
- Ерөнхий бүрэлдэхүүн (component) schema: `Envelope`, `GridRequest{limit,offset,filters[]}`,
  `GridResponse{data,totalCount}`, `Error{success:false,code,message}`.
- Толь бичиг эндпойнт бүрийг `get` + `Envelope<Item[]>`-ээр загварчил.
- Metadata-driven тул нэг ерөнхий `path` (`/{model}/{action}`) + тодорхой эндпойнтуудын
  жагсаалтыг зэрэг өгөх нь бодит байдалд хамгийн ойр.
