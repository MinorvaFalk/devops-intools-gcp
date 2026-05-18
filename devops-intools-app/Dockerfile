# ─── Stage 1: build ──────────────────────────────────────────────────────────
FROM oven/bun:1.3.14-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ARG VITE_API_BASE_URL=/api/v1
ARG VITE_CACHE_TTL_MS=300000
ARG VITE_API_KEY=""
ARG VITE_FIREWALL_PROJECTS=""

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_CACHE_TTL_MS=$VITE_CACHE_TTL_MS
ENV VITE_API_KEY=$VITE_API_KEY
ENV VITE_FIREWALL_PROJECTS=$VITE_FIREWALL_PROJECTS

RUN bun run build

# ─── Stage 2: serve ───────────────────────────────────────────────────────────
FROM nginx:1.31-alpine AS runner

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

ENV API_BACKEND_URL=

CMD ["nginx", "-g", "daemon off;"]
