# 06 — Нэвтрэлт, эрх, аюулгүй байдал

## 1. Нэвтрэлтийн горимууд

### 1.1 Хэрэглэгч нэр/нууц үг (үндсэн)
1. Хэрэглэгч login формд нэр/нууц үг оруулна (`/login` UI маршрут).
2. Frontend **`POST ec3api/v1/user/login`** дуудна → Backend баталгаажуулж **JWT** олгоно.
   - Azure AD-аар: **`POST user/login_az`**.
   - Нууц үг солих: **`POST user/change_pw`**.
3. Frontend дараахыг `localStorage`-д хадгална:
   - `jwtToken` (JWT, ~387 тэмдэгт) — API токен
   - `expiryDate` — хүчинтэй хугацаа
   - `privileges` — хэрэглэгчийн эрхийн жагсаалт (RBAC)
   - `company`, `department` — байгууллага/хэлтэс
   - `authType` — нэвтрэлтийн төрөл
   - `appGlobalSettings` (apiBaseUrl зэрэг), `theme`, `dasSettings`
4. `setTheme`, хэл зэрэг тохиргоо ачаална.

### 1.2 Azure AD / MSAL (сонголтоор SSO)
`assets/globalSettings/msalConfig.json`:
```json
{
  "appId": "1fcbb529-fc0f-4922-b61b-fe5ed52fbe10",
  "authority": "https://login.microsoftonline.com/ivilghelmsigmatelas.onmicrosoft.com",
  "scopes": ["user.Read"],
  "redirectUrl": "http://localhost:3001"
}
```
- `@azure/msal` ашиглана: `getAuthCodeUrl`, `/token`, `/devicecode` эндпойнтууд.
- SSO нь backend JWT-г орлохгүй; MSAL identity-г баталгаажуулж, дараа нь EC3 токен авдаг загвар.

### 1.3 Auth / хэрэглэгч / эрхийн endpoint-ууд (model config-оос)
| Endpoint | Зорилго |
|---|---|
| `user/login`, `user/login_az` | Нэвтрэх (нэр/нууц үг, Azure) |
| `user/change_pw` | Нууц үг солих |
| `users`, `users/not_ug`, `users/owned_objects`, `users/user_root` | Хэрэглэгч удирдах |
| `usergroup`, `usergroup/by_user`, `usergroupdata`, `usergrouptype` | Хэрэглэгчийн бүлэг |
| `roles`, `roles/ug`, `roles/user`, `ugrole`, `ugroot`, `ugr` | Дүр / эрх |
| `accesslevelsgroups` | Хандалтын түвшний бүлэг |
| `usersessions` | Идэвхтэй сессион |
| `usersettings`, `usersettings/data`, `userviews`, `userviews/modules` | Хадгалсан харагдац/эрх |
| `upty`, `upty/available_upty`, `upty_type` | Хэрэглэгчийн шинжийн төрөл |
| `audit`, `audit/details` | Аудит |
| `appinfo/app_version`, `appinfo/db_version`, `appinfo/db_time`, `appinfo/license` | Систем/лиценз мэдээлэл |
| `transaction`, `stgate`, `stgate/wait`, `stgate/destroy` | Гүйлгээ / gate |

## 2. API токен дамжуулалт
- Бүх `ec3api/v1` хүсэлт header: **`st-token: <jwtToken>`**.
- Axios interceptor автоматаар нэмнэ:
  ```
  config.baseURL = apiBaseUrl
  config.url     = apiBaseUrl + config.url
  config.headers["st-token"] = localStorage.jwtToken
  ```
- Токен байхгүй/хүчингүй бол API 401/403; frontend `/login` руу чиглүүлнэ.

## 3. Эрхийн хяналт (RBAC) — серверийн талд
- **Backend эрхийг заавал шалгана** (client-side биш). Эрх дутвал:
  ```json
  { "success": false, "code": 400, "message": "Недостаточно прав на выполнения операции" }
  ```
  (жишээ ажиглагдсан: `monitoringtemplates/pma` → 400).
- `privileges` (localStorage) нь зөвхөн UI-г тохируулна (цэс/товч идэвх), гэхдээ
  эцсийн шийдвэрийг backend гаргана.
- Хэрэглэгч удирдлага: `user_management`, `user_sessions`, `audit` модулиуд.

## 4. Аудит ба бүртгэл
- **Регистр событий** — систем/холбоо/өгөгдөл/Oracle/программын мессеж, хэрэглэгчийн үйлдэл.
- **Аудит** — хэрэглэгчийн үйлдлийг объект/компонентоор бүртгэнэ.
- `sql_debug_log`, `reports_log`, `exchange_log`, `controller_log`, `meter_log` — журналууд.
- `DBU`, `DB_TIME`, `USER_ID`/`USER_NAME` багана entity-үүдэд аудит мөр үлдээнэ.

## 5. Аюулгүй байдлын анхаарах зүйл (дахин бүтээхэд)

### 5.1 SQL-driven архитектурын эрсдэл
- `{model}/query` нь Oracle SQL буцааж, `{model}/data` гүйцэтгэдэг. Хэрэв SQL-ийг
  клиент/хэрэглэгч засах боломжтой бол **SQL injection / эрхийн давалгаа** эрсдэлтэй.
- **Зөвлөмж:** SQL хадгалалт/засварыг зөвхөн эрхтэй админд; параметрийг bind хийх;
  API талд SQL-ийг цагаан жагсаалт/тохиргооноос авах; `sql_debugger` production-д хаах.

### 5.2 Токен ба тээвэр
- Одоо HTTP (8080) дээр ажиллаж байна → **HTTPS заавал** (токен header-т цэвэр текстээр явна).
- JWT-ийн `expiryDate` богино; refresh механизм тодорхой хэрэгжүүлэх.
- `localStorage` дахь токен XSS-д эмзэг → CSP, оролтын sanitization чухал.

### 5.3 Тохиргооны файл ил задгай
- `globalSettings.json`, `msalConfig.json` нийтэд ил (SPA). Нууц утга (appId нээлттэй OK,
  харин client secret хэзээ ч биш) битгий байрлуул. `public_abs_path` зэрэг серверийн зам
  ил гарахаас сэргийл.

### 5.4 CORS / origin
- API frontend-тэй ижил origin (apiHost=null) тул CORS шаардлагагүй. Салгавал CORS-ийг
  чанд тохируулах, `st-token`-ийг allow-list.

### 5.5 Rate limiting / WAF
- Ажиглалт: сервер олон хурдан хүсэлтэд IP түр блоклосон (WAF/fail2ban шинж). Дахин
  бүтээхэд зохистой rate-limit + brute-force хамгаалалт (login) тавих.

## 6. Аюулгүй байдлын шаардлагын хураангуй
- [ ] HTTPS (TLS) заавал; HTTP-г redirect/хаах.
- [ ] JWT баталгаажуулалт + богино expiry + refresh; algorithm бэхлэх.
- [ ] Серверийн RBAC бүх эндпойнтод; UI эрхэд бүү найд.
- [ ] SQL-driven хэсгийг параметржүүлж, эрхээр хамгаалах; debug хаах.
- [ ] Аудит бүртгэл (нэвтрэлт, өөрчлөлт, эрхийн татгалзал).
- [ ] Rate-limit + login brute-force хамгаалалт; CSP/XSS хамгаалалт.
