# devops-intools-app

React single-page application for the DevOps Internal Tools platform. Provides a unified dashboard for browsing and managing Google Cloud resources, along with internal registries for application and project metadata.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | [Vite 6](https://vitejs.dev) |
| Package manager | [Bun](https://bun.sh) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) (Vite plugin) |
| HTTP | Native `fetch` with in-memory cache |
| Container | nginx 1.31-alpine |

## Pages

| Page | Description |
|---|---|
| Overview | Landing page with links to all services |
| GCE Instances | Browse and start/stop Compute Engine VMs |
| GKE Clusters | Browse clusters and node pools |
| Cloud SQL | Browse Postgres/MySQL instances, export/restore backups |
| Cloud Storage | Browse buckets with live storage metrics |
| Memorystore | Browse Redis instances |
| Firewall Rules | Browse VPC firewall rules across configured projects |
| Appref Dictionary | CRUD registry for internal application references |
| Appref Audit Log | Change history for all appref entries |
| Project Reference | Read-only project criticality and ownership registry |

## Prerequisites

- [Bun](https://bun.sh) 1.3+
- The [devops-intools-api](../devops-intools-api/README.md) running on `localhost:8080`

## Getting started

```sh
bun install
cp .env.example .env.local   # fill in any overrides
bun dev                       # starts at http://localhost:3000
```

The Vite dev server proxies all `/api` requests to `http://localhost:8080`.

## Environment variables

All variables are prefixed `VITE_` and are **baked in at build time**.

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `/api/v1` | Full base URL of the API. Use `/api/v1` when the Vite proxy or nginx handles routing. |
| `VITE_API_KEY` | — | Bearer token sent on every request (`Authorization: Bearer …`). Leave empty to disable. |
| `VITE_CACHE_TTL_MS` | `300000` | In-memory cache TTL for GCP resource lists (ms). |
| `VITE_FIREWALL_PROJECTS` | — | Comma-separated VPC project IDs for the Firewall page. Supports `Label:project-id` pairs. |

See `.env.example` for a ready-to-copy template.

## Scripts

```sh
bun dev        # development server with HMR
bun run build  # production build → dist/
bun preview    # serve the production build locally
```

## Docker

```sh
docker build \
  --build-arg VITE_FIREWALL_PROJECTS="NPRD:my-nprd-shared,PROD:my-prod-shared" \
  -t devops-intools-app .

docker run -p 3000:80 \
  -e API_BACKEND_URL=http://api:8080 \
  devops-intools-app
```

`API_BACKEND_URL` is a **runtime** variable resolved by the nginx entrypoint via `envsubst`. It configures the `/api/` reverse proxy inside the container.

## Project structure

```
src/
  api/          → fetch wrappers, in-memory cache, typed API client
  components/   → shared UI components (DataTable, Drawer, StatusBadge, …)
  hooks/        → useQuery — generic async data fetching hook
  layout/       → Topbar, Sidebar, ProjectPicker
  pages/        → one file per page/route
  types/        → TypeScript interfaces mirroring API response shapes
```
