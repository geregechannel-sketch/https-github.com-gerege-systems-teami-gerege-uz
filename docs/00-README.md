# TEAMI Enterprise (EMCOS / EC3) — Системийн баримт бичиг

> **Зорилго:** Энэ баримтын багц нь `http://82.215.77.202:8080/teami` дээр байрлах
> **TEAMI Enterprise v3.0** (эрчим хүчний хэмжилт/тооцооны MDM систем) системийг
> **эхнээс нь дахин бүтээхэд** шаардлагатай бүх мэдээллийг агуулна: архитектур,
> API тодорхойлолт, өгөгдлийн загвар, функциональ шаардлага, аюулгүй байдал, frontend.

## Багцын агуулга

| Файл | Агуулга |
|------|---------|
| [01-overview.md](01-overview.md) | Системийн зорилго, хамрах хүрээ, оролцогчид, толь бичиг |
| [02-architecture.md](02-architecture.md) | Компонент, deployment, tech stack, урсгал |
| [03-api-spec.md](03-api-spec.md) | REST API-ийн бүрэн тодорхойлолт (`ec3api/v1`) |
| [04-data-model.md](04-data-model.md) | Өгөгдлийн загвар (Oracle, `ST_` схем, entity-ууд) |
| [05-functional-spec.md](05-functional-spec.md) | Модуль тус бүрийн функциональ шаардлага, хэрэглэгчийн урсгал |
| [06-auth-security.md](06-auth-security.md) | Нэвтрэлт (JWT `st-token`, MSAL SSO), эрх (RBAC), аудит |
| [07-frontend.md](07-frontend.md) | SPA бүтэц, тохиргоо, i18n, theming, чиглүүлэлт |
| [08-replication-guide.md](08-replication-guide.md) | Системийг дахин бүтээх алхам алхмаар заавар |
| [09-endpoints-full.md](09-endpoints-full.md) | **БҮРЭН 983 endpoint** домэйнаар бүлэглэсэн (+ [endpoints-full.txt](endpoints-full.txt)) |
| [endpoints-params.txt](endpoints-params.txt) | **Endpoint бүрийн параметрийн бүтэц** (982): method + талбар + туг (get/add/req/opt/nonNull) |
| [toshi-theme/](toshi-theme/) | **Toshi Theme** — бүх дэлгэцийн дизайн систем (748 token, light+dark, компонент CSS + preview) |

## Судалгааны эх сурвалж
- **findings.md** (repo root) — түүхий нотолгоо: барьсан API хүсэлт/хариу, схем, багана.
- **task_plan.md**, **progress.md** — төлөвлөгөө ба явцын бүртгэл.

## Аргачлал (баримтыг хэрхэн цуглуулсан)
1. **Статик анализ** — webpack bundle (`main.js`, `6258.js` + 852 chunk-ийн жагсаалт),
   globalSettings/msalConfig тохиргоо, React Router-ийн 137 маршрут, номын сангуудыг задлав.
2. **Live capture** — идэвхтэй нэвтэрсэн session дээр браузерт `fetch`/`XHR` interceptor
   суулгаж, модуль тус бүрээр (archives, config, points, meters, acquisition, events)
   явж, жинхэнэ хүсэлт/хариуг барив. Схемийг `?limit=1` + `Object.keys` шууд-fetch-ээр авав.
3. **Бүрэн endpoint олборлолт** — браузерын webpack санах ойд бүх **852 chunk**-ийг
   throttle-оор ачаалж (`req.e`), 6474 module factory-ийн эх кодоос `route` тодорхойлолт
   бүрийг scan хийж **983 endpoint**-ийн бүрэн жагсаалт гаргав (→ 09-endpoints-full.md).

## Гол дүгнэлт (нэг харцаар)
- **Бүтээгдэхүүн:** EMCOS/EC3 (Sigma Telas) — TEAMI нэрээр rebrand хийсэн v3.0.
- **Frontend:** React SPA (Redux Toolkit + RTK Query, React Router, i18next, axios, ace),
  IIS 10 дээр `/teami/` замд статикаар үйлчилдэг.
- **Backend:** `ec3api/v1` REST үйлчилгээ, **Oracle** ДБ (`ST_` угтвартай хүснэгт),
  SQL-driven metadata архитектур.
- **Auth:** JWT (`st-token` header), сонголтоор Azure AD (MSAL) SSO.
- **API хэв маяг:** `{model}/{action}`, дугтуй `{success,data}`, grid query
  `{limit,offset,filters:[{c,p,v}]}` + `totalCount`, серверийн талд RBAC.
- **API гадаргуу:** нийт **983 endpoint** (14 модуль домэйн: цэг/тоолуур, архив, тайлан,
  баланс, ачаалал(RGB/BGA/pobj), чанар, схем, GIS, DAS/цуглуулга, солилцоо, админ/аудит).
- **Домэйн:** цахилгаан эрчим хүчний арилжааны/техникийн хэмжилтийн өгөгдөл цуглуулах,
  тооцоо/баланс, чанар, тайлан, ачаалал удирдлага, GIS.
