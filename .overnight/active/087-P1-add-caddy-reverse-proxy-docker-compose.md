---
id: 87
title: "Add Caddy reverse proxy to Docker Compose for automatic HTTPS"
priority: P1
severity: medium
status: completed
source: overnight_tasks_id_22
file: docker-compose.yml
line: 1
created: "2026-02-28T06:00:00Z"
execution_hint: sequential
context_group: infrastructure
group_reason: "Infrastructure tasks 087-089 touch docker-compose.yml and scripts."
---

# Add Caddy reverse proxy to Docker Compose for automatic HTTPS

**Priority:** P1 (medium)
**Source:** OVERNIGHT_TASKS.md ID 22
**Location:** docker-compose.yml, docker/Caddyfile (new)

## Problem

The Docker stack has no HTTPS termination. The app runs on port 3000 with no TLS, no automatic certificate management, and all services (LND gRPC, REST, Prometheus) exposed on public ports. Research #2 requires Caddy for automatic HTTPS via Let's Encrypt/ZeroSSL with zero-config certificate renewal.

## How to Fix

1. **Add Caddy service to `docker-compose.yml`**:

```yaml
  caddy:
    image: caddy:2-alpine
    container_name: sf-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"  # HTTP/3
    volumes:
      - ./docker/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
    networks:
      - sovereign
    depends_on:
      - app
```

2. **Create `docker/Caddyfile`**:

```
{
  email {$CADDY_EMAIL}
}

{$DOMAIN} {
  reverse_proxy app:3000
}

grafana.{$DOMAIN} {
  reverse_proxy grafana:3000
}

# Internal services NOT exposed via Caddy:
# - LND gRPC (10009): internal only
# - Postgres (5432): internal only
# - Prometheus (9090): internal only
# - LND REST (8080): internal only (use gRPC or tunnel)
```

3. **Move LND ports to internal-only** in docker-compose.yml:
   - Remove `10009:10009` and `8080:8080` public port bindings
   - Keep only `9735:9735` for Lightning P2P (must be public)
   - Services access LND via internal `sovereign` network

4. **Add to `.env.example`**:
```
DOMAIN=yourdomain.com
CADDY_EMAIL=admin@yourdomain.com
```

5. **Add volumes** to docker-compose.yml: `caddy-data` and `caddy-config`

## Acceptance Criteria

- [ ] Caddy service added to docker-compose.yml
- [ ] `docker/Caddyfile` created with correct reverse proxy rules
- [ ] LND gRPC/REST ports removed from public bindings
- [ ] `DOMAIN` and `CADDY_EMAIL` added to `.env.example`
- [ ] `caddy-data` and `caddy-config` volumes declared
- [ ] `npm run build` passes (no code changes, just config)

## Notes

_Generated from OVERNIGHT_TASKS.md ID 22. Caddy handles automatic HTTPS — no manual cert management. HTTP/3 (QUIC) supported via UDP port 443. Internal services remain on the sovereign Docker network._
