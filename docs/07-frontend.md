# 07 — Frontend (SPA) архитектур

## 1. Технологийн стек
| Ангилал | Технологи |
|---|---|
| Framework | React (webpack build) |
| State / data | Redux Toolkit + RTK Query (`reducerPath:"api"`) |
| Routing | React Router (`createBrowserRouter`), 137 маршрут, lazy load |
| HTTP | axios (interceptor: baseURL + `st-token`) |
| i18n | i18next / react-i18next (`_t()`), 7 хэл |
| Огноо | dayjs |
| Утилит | lodash, qs (query string) |
| Grid | react-virtualized (том жагсаалт) |
| Editor | ace editor (SQL debugger, тайлан/схем засварлагч) |
| SSO | @azure/msal |
| Style | emotion (Global styles), theming |

## 2. Bundle / хүргэлт
- IIS 10 дээр `/teami/` замд статик.
- Entry: `index.html` → `main.<hash>.js` + vendor chunk (`6258.<hash>.js`) + ~852 lazy chunk.
- `window.__basePath__ = '/teami'`, `window.__server_env__ = 'production'`.
- Chunk нэр: `<id>.<hash>.js` (webpack contenthash). Route/модуль тус бүр lazy chunk.
- IE илэрвэл `index_ie.html` руу чиглүүлнэ.

## 3. Тохиргооны файлууд (`assets/globalSettings/`)
| Файл | Агуулга |
|---|---|
| `globalSettings.json` | appName/version, apiHost/Port/App, хэл (`languages`, `languageMappings`), `defaultLanguage=ru`, chart өнгө/тохиргоо, `qualityExtraFields`, `mainBrachID=2`, `viewSchemesIdleTime=180` |
| `customSettings.json` | Suurilalt тус бүрийн override (одоо хоосон) |
| `msalConfig.json` | Azure AD SSO (appId, authority, scopes, redirect) |
| `assets/json/menu.json`, `pointMenu.json`, `help.json` | Цэс/тусламж (сервер эсвэл API-аас) |
| `assets/json/icons_<theme>.json` | Theme-ийн icon багц (preload) |

### globalSettings гол талбар
```jsonc
{
  "appName": "TEAMI Enterprise", "appVersion": "3.0",
  "apiHost": null, "apiPort": null, "apiApp": "ec3api/v1/",
  "defaultLanguage": "ru", "dateLocale": "ru", "dateSeparator": "-",
  "enableTranslate": 1, "menuActive": 1, "mainBrachID": 2,
  "viewSchemesIdleTime": 180, "homeDashboardRequestTimeoutMS": 0,
  "qualityExtraFields": [["METER_NUMBER","STRING"],["METER_TYPE_NAME","STRING"],
                         ["MOU_BT","DATETIME"],["MOU_ET","DATETIME"]],
  "chart_*": /* график өнгө/3D/gradient тохиргоо */
}
```

## 4. Олон хэл (i18n)
- Хэл: ru (өгөгдмөл), en, ua, de, pl, u2 (Oʻzbek Lotin), uz (Oʻzbek Kirill).
- `languageMappings` → locale (ru→ru_RU г.м). `_t(key)` орчуулга; `enableTranslate=1`.
- Орчуулгын нөөц lazy chunk/JSON-оор ачаална.

## 5. Theming
- `theme` (light/dark) `localStorage`-д. `prefers-color-scheme`-оос анхны утга.
- `__setPreferredTheme(theme)` глобал; CSS хувьсагчаар (loader өнгө г.м).
- Icon багц theme тус бүрд (`icons_light.json`/`icons_dark.json`).

## 6. Data давхарга
- Ихэнх дуудлага **axios** wrapper + metadata model config-оор (route+structure).
  Interceptor: `config.url = apiBaseUrl + config.url`, `st-token` header.
- Зарим (RTK Query) — `reducerPath:"api"`, `fetchBaseQuery` + `prepareHeaders` (st-token).
  Жишээ: `useGetMlsetQuery` → `GET /measurelinessets`.
- Grid → `{limit,offset,filters:[{c,p,v}]}`; `totalCount`-оор pagination.

## 7. Routing бүтэц
- `createBrowserRouter`, basename `/teami`. Route бүр lazy `Component:Lt("<Name>")`.
- 102 lazy компонент (жишээ: Meters, Points, ArchiveDP, EventLog, ReportExecutor,
  SchemesEditor, GIS, PowerControlPlan, Audit, SqlDebugger г.м).
- Тусгай: `archives_v2` → `/archives` руу redirect; `*` → 404.

## 8. Дахин бүтээхэд frontend зөвлөмж
- Metadata-driven data давхаргыг хадгал (эсвэл эндпойнт бүрийг тодорхой RTK Query slice болгон).
- Config-ийг build-ээс салгаж `globalSettings.json`-оор (олон suurilalt).
- Lazy route split — том тул chunk-ээр ачаал.
- `st-token` header-ийг нэг interceptor-т төвлөрүүл.
- i18n key-үүдийг эх кодоос салга; ru/uz/en доод тал.
