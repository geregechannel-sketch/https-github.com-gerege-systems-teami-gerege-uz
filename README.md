# teami-gerege-uz

**TEAMI Enterprise (EMCOS / EC3)** системийн бүрэн баримт бичиг ба **Go + PostgreSQL backend** дахин хэрэгжүүлэлт.

## Агуулга
- [`docs/`](docs/) — Системийн баримт бичиг: архитектур, API тодорхойлолт (983 endpoint + параметрийн бүтэц), өгөгдлийн загвар, функциональ шаардлага, аюулгүй байдал, frontend, дахин бүтээх заавар.
  - [`docs/00-README.md`](docs/00-README.md) — индекс
  - [`docs/endpoints-full.txt`](docs/endpoints-full.txt) / [`docs/endpoints-params.txt`](docs/endpoints-params.txt) — 983 endpoint + параметр
  - [`docs/toshi-theme/`](docs/toshi-theme/) — гаргаж авсан дизайн систем (theme)
- [`backend/`](backend/) — Go + PostgreSQL backend (metadata-driven, `st-token` JWT, generic grid DSL).

## Backend хэрхэн ажиллуулах
```bash
cd backend
cp .env.example .env   # эсвэл DATABASE_URL export
docker run -d --name emcos-pg -e POSTGRES_PASSWORD=emcos -e POSTGRES_USER=emcos -e POSTGRES_DB=emcos -p 55432:5432 postgres:16-alpine
make test    # бүх тест
make run     # серверийг асаах
```

> Тэмдэглэл: Энэ бол гуравдагч этгээдийн системийн судалгаа/баримт бичиг. Нэвтрэлтийн нууц үг зэрэг мэдрэмтгий мэдээллийг хассан.
