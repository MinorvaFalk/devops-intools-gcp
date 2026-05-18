# devops-intools

Internal DevOps platform for monitoring and managing Google Cloud resources. Consists of a Go REST API and a React single-page application, deployable together via Docker Compose.

## Repositories

| Project | Description | README |
|---|---|---|
| [`devops-intools-api`](./devops-intools-api) | Go backend — GCP resource APIs, Appref/Project registries, PostgreSQL | [README](./devops-intools-api/README.md) |
| [`devops-intools-app`](./devops-intools-app) | React frontend — dashboard UI served via nginx | [README](./devops-intools-app/README.md) |

## Features

- Browse and manage **GCE instances**, **GKE clusters**, **Cloud SQL**, **GCS buckets**, **Memorystore Redis**, and **VPC firewall rules**
- **Appref Dictionary** — internal application reference registry with full audit logging
- **Project Reference** — project criticality and ownership registry
- Bearer-token and GCP IAP authentication
- In-memory response caching on the frontend (configurable TTL)

## Quick start

### Local development

Start the API (requires Go 1.26+ and PostgreSQL):

```sh
cd devops-intools-api
cp .env.example .env        # set GOOGLE_APPLICATION_CREDENTIALS and DATABASE_URL
make db-start               # spin up a local Postgres container
make db-migrate             # run migrations
make run                    # API on :8080
```

Start the frontend in a second terminal:

```sh
cd devops-intools-app
bun install
bun dev                     # app on http://localhost:3000
```

### Docker Compose

```sh
cp .env.example .env        # fill in GCP_CREDENTIALS_FILE and other values
docker compose up --build   # app on http://localhost:3000
```

### Production

```sh
cp .env.example .env        # set REGISTRY, IMAGE_NS, TAG, etc.
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## Compose services

| Service | Image | Port |
|---|---|---|
| `db` | postgres:16-alpine | internal |
| `migrate` | `api` image, `migrate` target | runs once |
| `api` | Go binary | internal :8080 |
| `app` | nginx + React SPA | `APP_PORT` → 80 (default :3000) |

## Repository layout

```
devops-intools/
├── devops-intools-api/      # Go API — see devops-intools-api/README.md
├── devops-intools-app/      # React app — see devops-intools-app/README.md
├── docker-compose.yml       # base Compose (dev / local)
├── docker-compose.prod.yml  # production overrides (images, limits, healthchecks)
└── .env.example             # template for all Compose environment variables
```

## Environment variables

The root `.env` file drives both Compose files. See [`.env.example`](./.env.example) for the full reference with descriptions.

Key variables:

| Variable | Description |
|---|---|
| `GCP_CREDENTIALS_FILE` | Path to GCP service account JSON on the host |
| `API_KEY` | Bearer token for API auth (empty = disabled) |
| `VITE_FIREWALL_PROJECTS` | Comma-separated firewall VPC projects (`Label:project-id`) |
| `REGISTRY` / `IMAGE_NS` / `TAG` | Container registry coordinates (prod only) |
