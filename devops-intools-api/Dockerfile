# ── Build stage ──────────────────────────────────────────────────────────────
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Download dependencies first (layer cache friendly)
COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w" \
    -o /devops-intools-api \
    ./cmd/server && \
    CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w" \
    -o /devops-intools-migrate \
    ./cmd/migrate

# ── Server runtime ────────────────────────────────────────────────────────────
FROM gcr.io/distroless/static-debian12 AS server

COPY --from=builder /devops-intools-api /devops-intools-api

EXPOSE 8080

ENTRYPOINT ["/devops-intools-api"]

# ── Migrate runtime ───────────────────────────────────────────────────────────
FROM gcr.io/distroless/static-debian12 AS migrate

COPY --from=builder /devops-intools-migrate /devops-intools-migrate

ENTRYPOINT ["/devops-intools-migrate"]
