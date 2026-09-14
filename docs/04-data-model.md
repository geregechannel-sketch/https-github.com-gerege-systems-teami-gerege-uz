# 04 — Өгөгдлийн загвар (Oracle, `ST_` схем)

> Багануудыг live API хариунаас (Oracle багана шууд гарна) болон dashboard SQL-ээс
> гаргасан. Төрөл нь ажиглалт дээр суурилсан таамаг; PK/FK нэрийн конвенцоор дүгнэв.

## 1. Гол entity-үүд ба хамаарал

```
ST_POINT0 (цэг) 1───* measuringdevices (тоолуур, MOU_BT/ET-ээр монтаж)
     │  *
     │  └───* ST_DP (суваг/data point) ──* архив (цаг цуваа)
     │
     *──* GROUP (бүлэг, GR_ID) ── GR_TYPE (17)
     │
     ├── POINT_TYPE (6)          ├── ECO_CATEGORY (4) / ECO_PROFILE (7)
     ├── REALTIME_PROFILE (4)    ├── FILLING_PROFILE (2)
     ├── VERIFICATION_PROFILE    ├── LINK_PROFILE
     └── TARIFF_PLAN             └── DATABRANCHSET / WITHESET (7)

DAS (7) ──* datapoints (31) ── SRC_TYPE (3)      SYSTEM_MODULES (35)
EVENTS (ev, evc_id ангиллаар) ── SYSTEM_MODULES / DAS / DP
USER ── USER_SETTINGS (UV_, модуль тус бүрийн харагдац) ── PRIVILEGES (RBAC)
```

## 2. Хүснэгтийн тодорхойлолт (ажиглагдсан багана)

### 2.1 `ST_POINT0` — Цэг (Point / Точка учёта)
| Багана | Төрөл | Тайлбар |
|---|---|---|
| `POINT_ID` | number (PK) | Цэгийн ID |
| `POINT_CODE` | string | Код (жишээ `EMCOS_STATUS` тусгай) |
| `POINT_NAME` | string | Нэр |
| `POINT_ENABLED` | number(0/1) | Идэвхтэй эсэх |
| `POINT_TYPE_ID` | number (FK→pointtypes) | Цэгийн төрөл |
| `EC_ID` | number (FK→ecocategories) | Эдийн засгийн ангилал |
| — | flags | Действителен, Автом.считывание, Коммерческий, Свой, Лицензируемая |
> Тусгай мөр: `POINT_CODE='EMCOS_STATUS'` (dashboard тооллогоос хасагдана).

### 2.2 `ST_DP` — Суваг / Data Point
| Багана | Төрөл | Тайлбар |
|---|---|---|
| `DP_ID` | number (PK) | Сувгийн ID |
| `DP_CODE` | string | Код (`GENERATED_BY_ORACLE` тусгай) |
| `DP_ENABLED` | number(0/1) | Идэвхтэй |
| `DP_DELETED` | number(0/1) | Устгасан тэмдэг (soft delete) |
| `DP_TYPE_ID` | number (FK→dp_type) | Сувгийн төрөл (dp_type_show) |

### 2.3 Тоолуур — `measuringdevices`
| Багана | Төрөл | Тайлбар |
|---|---|---|
| `METER_ID` | number (PK) | Тоолуурын ID |
| `METER_TYPE_ID` | number (FK) | Төрөл (measuringdevicetypes) |
| `METER_NUMBER` | string | Серийн дугаар |
| `MADE` | date/number | Үйлдвэрлэсэн |
| `EXPL_START` | date | Ашиглалтад орсон |
| `METER_CLASS` | string/number | Нарийвчлалын анги |
| `METER_TYPE_NAME`, `METER_TYPE_PRODUCER` | string | Төрлийн нэр/үйлдвэрлэгч |
| `MOU_BT`, `MOU_ET` | datetime | Монтажийн эхлэл/төгсгөл (mounting begin/end) |
| `POINT_ID`, `POINT_CODE`, `POINT_NAME` | | Холбогдсон цэг |

### 2.4 Бүлэг — Group (`pointmenuv2/groups`)
| Багана | Тайлбар |
|---|---|
| `GR_ID` (PK), `GR_CODE`, `GR_NAME` | Бүлэг |
| `GR_TYPE_ID`, `GR_TYPE_NAME`, `GR_TYPE_CODE` | Бүлгийн төрөл (17) |
| `GRC_NR`, `GRC_DESC` | Бүлгийн доторх дараалал/тайлбар |
| `IS_PUBLIC`, `IS_PUBLIC_TXT` | Нийтийн эсэх |
| `USER_ID`, `USER_NAME`, `DBU` | Эзэмшигч/өөрчилсөн |

### 2.5 Толь бичгүүд (dictionaries)
| Хүснэгт (endpoint) | PK / багана |
|---|---|
| `grouptypes` | GR_TYPE_ID, GR_TYPE_CODE, GR_TYPE_NAME (17) |
| `pointtypes` | POINT_TYPE_ID, POINT_TYPE_CODE, POINT_TYPE_NAME (6) |
| `measuringdevicetypes` | METER_TYPE_ID, METER_TYPE_NAME, METER_TYPE_PRODUCER (21) |
| `ecocategories` | EC_ID, EC_CODE, EC_NAME, EC_IN (4) |
| `ecoprofiles` | ECP_ID, ECP_CODE, ECP_NAME (7) |
| `realtimeprofiles` | RTP_ID, RTP_CODE, RTP_NAME (4) |
| `fillingprofiles` | FP_ID, FP_CODE, FP_NAME (2) |
| `verificationprofiles` | VP_ID, VP_CODE, VP_NAME, VP_BIAS, VP_SEPARATE_TFF, VP_SMALLEST_INTERVAL |
| `linkprofiles` | LP_ID, LP_NAME |
| `aggfunctions` (tff) | AGGF_ID, AGGF_NAME, AGGF_LABEL_ID (3) |
| `databranchsets` (WITHESET) | WITHESET_ID, WITHESET_CODE, WITHESET_NAME, SRC_TYPE_ID, WITHESET_JOURNAL, SRC_TYPE_CODE, SRC_TYPE_NAME (7) |
| `datasourcetypes` | SRC_TYPE_ID, SRC_TYPE_CODE, SRC_TYPE_NAME (3) |
| `ph_type` / `dl_type` / `dp_type` | *_TYPE_ID, *_TYPE_NAME (физик/лог/data-point төрөл) |
| `tariffplans` | тарифын төлөвлөгөө |
| `substitutiontemplates` | орлуулгын загвар |

### 2.6 Систем / цуглуулга
| Хүснэгт | PK / багана |
|---|---|
| `systemmodules` | MDL_ID, MDL_CODE, MDL_NAME (35 модуль) |
| `dataservers` (DAS) | DAS_ID, DAS_NAME, DAS_ENABLED, DAS_ACTIVE, DB_TIME (7) |
| `datapoints` | DP_ID (+ бусад) (31) |

### 2.7 Хэрэглэгчийн харагдац — `usersettings` (UV_)
| Багана | Тайлбар |
|---|---|
| `UV_ID` (PK), `UV_NAME` | Хадгалсан харагдац/форм |
| `UV_MODULE` | Аль модульд (ARCHIVES, ...) |
| `UV_TYPE`, `UV_SUBTYPE`, `UV_TECH_INFO` | Төрөл/тохиргоо (JSON) |
| `UV_PUBLIC` | Нийтийн эсэх |
| `USER_NAME`, `DB_TIME` | Эзэмшигч/цаг |

## 3. Архив (цаг цувааны өгөгдөл)
- `ST_DP` (суваг) бүрд цаг хугацааны хэмжилтийн утга хадгалагдана (архив хүснэгт(үүд)).
- Уншилт нь цэг/бүлэг + хугацааны муж + параметр (ресурс/дискрет)-ээр шүүгдэнэ.
- "Качество показаний" модуль архивын бүрэн бүтэн байдал/цоорхойг шинжилнэ; орлуулга
  (substitution) нь дутуу утгыг загвараар нөхнө.

## 4. Тэмдэглэл (дахин бүтээхэд)
- Нэршил: `<ENTITY>_ID` (PK), `<ENTITY>_CODE` (бизнес код), `<ENTITY>_NAME`,
  `<ENTITY>_ENABLED/DELETED` (soft flag), `DB_TIME`/`DBU` (аудит).
- Soft delete (`*_DELETED=0/1`) ба enabled flag өргөн хэрэглэгдэнэ.
- Толь бичгүүд жижиг, тогтвортой; entity том хүснэгтүүд pagination шаардана.
- Oracle-специфик: `sysdate`, `to_char`, sequence (`GENERATED_BY_ORACLE`).
