# ---- build ----
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
ARG BUILD_COMMIT=unknown
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -X github.com/emcos/ec3-backend/internal/config.BuildCommit=${BUILD_COMMIT}" -o /out/server ./cmd/server
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/teamisync ./cmd/teamisync

# ---- runtime ----
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/server /server
COPY --from=build /out/teamisync /teamisync
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/server"]
