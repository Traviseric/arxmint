---
id: 88
title: "Add Postgres to Docker Compose with internal network isolation"
priority: P1
severity: high
status: completed
source: overnight_tasks_id_23
file: docker-compose.yml
line: 218
created: "2026-02-28T06:00:00Z"
execution_hint: sequential
context_group: infrastructure
group_reason: "Infrastructure tasks 087-089 touch docker-compose.yml. This enables all DB persistence tasks."
---

# Add Postgres to Docker Compose with internal network isolation

**Priority:** P1 (high)
**Source:** OVERNIGHT_TASKS.md ID 23
**Location:** docker-compose.yml, .env.example

## Problem

The Docker Compose stack has no Postgres service. The app references `DATABASE_URL` for Prisma but there's no containerized database. Without Postgres in Docker, DB persistence tasks (075-077) cannot be tested or deployed. Research #1 & #2 require Postgres on an internal Docker network with no public port exposed.

## How to Fix

1. **Add Postgres service to `docker-compose.yml`**:

```yaml
  postgres:
    image: postgres:15-alpine
    container_name: sf-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: arxmint
      POSTGRES_USER: arxmint
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - sovereign  # internal only — no ports exposed
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U arxmint"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
```

2. **Update the `networks` section** — create an `internal` flag if not already present:

```yaml
networks:
  sovereign:
    driver: bridge
    # No external: true — keeps all services on the same private bridge
```

3. **Add `app` service** to docker-compose.yml (the Next.js app):

```yaml
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: sf-app
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://arxmint:${POSTGRES_PASSWORD}@postgres:5432/arxmint
      NODE_ENV: production
    networks:
      - sovereign
    depends_on:
      postgres:
        condition: service_healthy
```

4. **Add `Dockerfile`** if it doesn't exist:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
CMD ["npm", "start"]
```

5. **Add to `.env.example`**:
```
POSTGRES_PASSWORD=changeme-use-strong-password
DATABASE_URL=postgresql://arxmint:changeme@postgres:5432/arxmint
```

6. **Add volume** to docker-compose.yml: `postgres-data`

## Acceptance Criteria

- [ ] Postgres service added to docker-compose.yml with `postgres:15-alpine`
- [ ] No public ports for Postgres — internal network only
- [ ] Healthcheck via `pg_isready` configured
- [ ] App service added with `DATABASE_URL` pointing at internal Postgres
- [ ] `POSTGRES_PASSWORD` added to `.env.example`
- [ ] `postgres-data` volume declared
- [ ] `npm run build` passes (Dockerfile + code unchanged if app already builds)

## Notes

_Generated from OVERNIGHT_TASKS.md ID 23. This is the missing infrastructure piece that enables all DB persistence tasks to be deployed. Postgres must be on internal network — no direct public access._
