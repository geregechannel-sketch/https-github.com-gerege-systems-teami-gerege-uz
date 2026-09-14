.PHONY: build run test test-unit vet tidy docker up down fmt

DB ?= postgres://emcos:emcos@localhost:55432/emcos?sslmode=disable
TEST_DB ?= postgres://emcos:emcos@localhost:55432/emcos_test?sslmode=disable

build:
	go build -o bin/server ./cmd/server

run: build
	DATABASE_URL="$(DB)" ./bin/server

test:
	TEST_DATABASE_URL="$(TEST_DB)" go test ./... -count=1

test-unit:
	go test ./internal/grid/... ./internal/auth/... -count=1

vet:
	go vet ./...

fmt:
	gofmt -w .

tidy:
	go mod tidy

docker:
	docker build -t ec3-backend:latest .

up:
	docker compose up -d --build

down:
	docker compose down
