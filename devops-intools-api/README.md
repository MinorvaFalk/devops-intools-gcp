# devops-intools-api

Backend API for the DevOps Internal Tools platform. Provides a unified read interface over Google Cloud resources (GCE, GKE, Cloud SQL, GCS, Memorystore) and a managed registry for application references and project metadata.

## Tech stack

| Layer | Technology |
|---|---|
| Language | Go 1.26 |
| HTTP framework | [Fiber v3](https://github.com/gofiber/fiber) |
| Database | PostgreSQL 16 via [pgx v5](https://github.com/jackc/pgx) + [scany](https://github.com/georgysavva/scany) |
| GCP SDKs | `cloud.google.com/go` (Compute, Container, SQL Admin, Storage, Redis, Monitoring) |
| Config | [Viper](https://github.com/spf13/viper) — env vars + `.env` file |
| Logging | [Zap](https://github.com/uber-go/zap) |
| Migrations | [golang-migrate](https://github.com/golang-migrate/migrate) (embedded SQL) |

## Features

- **GCE** — list and inspect Compute Engine VMs across all zones
- **GKE** — list clusters and node pools
- **Cloud SQL** — list and inspect Postgres/MySQL instances (activation policy, flags, parameters)
- **Cloud Storage** — list buckets with storage-class metrics from Cloud Monitoring
- **Memorystore** — list and inspect Redis instances
- **Firewall** — list VPC firewall rules
- **Appref Dictionary** — CRUD registry for internal application references with audit logging
- **Project Reference** — proxy to an external project registry API
- **Overview** — aggregated resource counts across all services

## Prerequisites

- Go 1.26+
- PostgreSQL 16 (or `podman`/`docker` for a local instance)
- A GCP service account JSON key with read permissions on the target projects
- `podman` (or `docker`) for container workflows

## Getting started

### 1. Configure environment

```sh
cp .env.example .env
```

Edit `.env`:

```env
# GCP credentials
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# PostgreSQL connection string
DATABASE_URL=postgres://devtools:devtools@localhost:5432/devtools?sslmode=disable

# Optional: protect the API with a bearer token
API_KEY=your-secret-key

# Optional: proxy to an external project registry
PROJECT_REF_URL=https://your-internal-registry/api/projects/?format=json
```

### 2. Start a local database

```sh
make db-start
```

This spins up a Postgres 16 container named `devops-intools-postgres` on port 5432.

### 3. Run migrations

```sh
make db-migrate
```

### 4. Start the server

```sh
make run
```

The server listens on `PORT` (default `8080`).

## Makefile targets

| Target | Description |
|---|---|
| `make run` | Run the server with `go run` |
| `make db-start` | Start a local Postgres container |
| `make db-stop` | Stop and remove the Postgres container |
| `make db-migrate` | Apply all pending migrations |
| `make db-rollback` | Roll back the last migration |
| `make db-version` | Print the current migration version |

## Docker

```sh
# Build image
docker build -t devops-intools-api .

# Run
docker run -p 8080:8080 \
  -e GOOGLE_APPLICATION_CREDENTIALS=/creds/sa.json \
  -e DATABASE_URL=postgres://... \
  -v /path/to/sa.json:/creds/sa.json:ro \
  devops-intools-api
```

The image is built on `gcr.io/distroless/static-debian12` with a multi-stage build — no shell, minimal attack surface.

## Authentication

| Mode | Config |
|---|---|
| None | Leave `API_KEY` empty |
| Bearer token | Set `API_KEY=<secret>`; every request (except `/health`, `/readyz`) must include `Authorization: Bearer <secret>` |
| GCP IAP | Set `ENABLE_IAP=true` and `IAP_AUDIENCE=<audience>` |

## API reference

All resource endpoints live under `/api/v1`. GCP endpoints require `?project=<project-id>`.

### Health

```
GET /health        → {"status":"ok"}
GET /readyz        → {"status":"ready"}
```

### GCP resources

```
GET /api/v1/projects
GET /api/v1/gce/instances?project=
GET /api/v1/gce/instances/:name?project=&zone=
GET /api/v1/cloudsql/instances?project=
GET /api/v1/cloudsql/instances/:name?project=
GET /api/v1/gke/clusters?project=
GET /api/v1/gke/clusters/:name?project=&location=
GET /api/v1/gke/clusters/:name/nodepools?project=&location=
GET /api/v1/gcs/buckets?project=
GET /api/v1/gcs/buckets/:bucket
GET /api/v1/gcs/buckets/:bucket/metrics?project=
GET /api/v1/redis/instances?project=
GET /api/v1/redis/instances/:name?project=&location=
GET /api/v1/firewall/rules?project=
GET /api/v1/overview?project=
```

### Appref dictionary

```
GET    /api/v1/apprefs?status=&stage=&project_code=
POST   /api/v1/apprefs
GET    /api/v1/apprefs/:code
PUT    /api/v1/apprefs/:code
DELETE /api/v1/apprefs/:code        (soft-delete → DECOMMISSIONED)
GET    /api/v1/apprefs/:code/audit-logs
```

### Project reference

```
GET /api/v1/ref-projects
GET /api/v1/ref-projects/:id
```

## Project structure

```
cmd/
  server/       → main entry point
  migrate/      → standalone migration runner
internal/
  config/       → env/config loading (Viper)
  handlers/     → HTTP handlers (Fiber)
  middleware/   → auth, CORS, logging, recovery
  models/       → request/response structs
  repository/   → PostgreSQL queries (pgx + scany)
  services/     → business logic + GCP API calls
migrations/     → embedded SQL migration files
pkg/
  audit/        → audit log writer
  database/     → pgx pool setup
  gcp/          → GCP client factory
  gcperr/       → GCP error → HTTP status mapper
  logger/       → Zap logger factory
  response/     → JSON response helpers
  validate/     → request validation
tests/          → integration and unit tests
```

## Configuration reference

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | HTTP listen port |
| `SERVER_READ_TIMEOUT` | `30s` | Request read timeout |
| `SERVER_WRITE_TIMEOUT` | `60s` | Response write timeout |
| `SERVER_IDLE_TIMEOUT` | `120s` | Keep-alive idle timeout |
| `CORS_ORIGIN` | `*` | Allowed CORS origin(s) |
| `GOOGLE_APPLICATION_CREDENTIALS` | — | Path to GCP service account JSON |
| `API_KEY` | — | Bearer token (empty = auth disabled) |
| `ENABLE_IAP` | `false` | Enable GCP IAP JWT validation |
| `IAP_AUDIENCE` | — | Expected IAP audience string |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |
| `LOG_FORMAT` | `console` | `console` (coloured) \| `json` |
| `DATABASE_URL` | — | PostgreSQL DSN |
| `PROJECT_REF_URL` | — | Full URL of the project registry API endpoint (path + query params included) |
| `PROJECT_REF_SKIP_TLS_VERIFY` | `false` | Skip TLS verification for the project ref API (self-signed certs) |
