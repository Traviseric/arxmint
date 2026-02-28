---
id: 42
title: "Add Prometheus + Grafana to root docker-compose.yml"
priority: P1
severity: medium
status: completed
source: project_declared
file: docker-compose.yml
line: null
created: "2026-02-27T04:30:00"
execution_hint: parallel
context_group: docker_stack
group_reason: "docker-compose.yml change. Related to task 041 (Fedimint version). Both touch root compose."
---

# Add Prometheus + Grafana to Root docker-compose.yml

**Priority:** P1 (monitoring)
**Source:** OVERNIGHT_TASKS.md ID:10
**Location:** `docker-compose.yml`, new `docker/grafana/` config

## Problem

`lib/community-generator.ts` generates Prometheus scrape configs and Grafana references for generated communities. However, the root `docker-compose.yml` may not include Prometheus and Grafana services by default, or they may not have scrape targets configured for LND, Cashu mint, and Fedimint.

## How to Fix

### Step 1: Check current state
Read `docker-compose.yml` to see if Prometheus and Grafana are already defined.

### Step 2: Add Prometheus and Grafana services (if not present)
Add to `docker-compose.yml`:

```yaml
prometheus:
  image: prom/prometheus:v2.48.0
  container_name: arxmint-prometheus
  ports:
    - "9090:9090"
  volumes:
    - ./docker/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    - prometheus_data:/prometheus
  command:
    - '--config.file=/etc/prometheus/prometheus.yml'
    - '--storage.tsdb.path=/prometheus'
    - '--web.console.libraries=/etc/prometheus/console_libraries'
    - '--web.console.templates=/etc/prometheus/consoles'
  depends_on:
    - lnd
    - nutshell

grafana:
  image: grafana/grafana:10.2.2
  container_name: arxmint-grafana
  ports:
    - "3001:3000"  # 3000 is already used by Next.js
  volumes:
    - grafana_data:/var/lib/grafana
    - ./docker/grafana/provisioning:/etc/grafana/provisioning:ro
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=arxmint
    - GF_USERS_ALLOW_SIGN_UP=false
  depends_on:
    - prometheus
```

Also add volumes:
```yaml
volumes:
  prometheus_data:
  grafana_data:
```

### Step 3: Create Prometheus config
Create `docker/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'lnd'
    static_configs:
      - targets: ['lnd:8080']
    metrics_path: '/v1/getinfo'  # LND REST metrics endpoint

  - job_name: 'nutshell'
    static_configs:
      - targets: ['nutshell:3338']
    metrics_path: '/metrics'

  - job_name: 'arxmint'
    static_configs:
      - targets: ['host.docker.internal:3000']
    metrics_path: '/api/metrics'
```

### Step 4: Create Grafana provisioning
Create `docker/grafana/provisioning/datasources/prometheus.yml`:

```yaml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
```

Create a basic dashboard JSON at `docker/grafana/provisioning/dashboards/arxmint.json` — a simple dashboard showing LND channels, Cashu balance, and request rates.

## Acceptance Criteria

- [ ] `docker-compose.yml` includes Prometheus and Grafana services
- [ ] Prometheus is configured to scrape LND and Cashu mint metrics
- [ ] Grafana is accessible at port 3001 with Prometheus as data source
- [ ] `docker/prometheus/prometheus.yml` created with scrape configs
- [ ] `docker/grafana/provisioning/` created with datasource config
- [ ] `docker compose config` validates without errors
- [ ] `npm run build` passes
- [ ] `npm test` passes

## Notes

Grafana runs on port 3001 (not 3000) to avoid conflicting with Next.js dev server. Default password is `arxmint` — document this in DEPLOY.md. Read `docker-compose.yml` first to understand the existing service names and network configuration before adding services.

_Generated from OVERNIGHT_TASKS.md P1 ID:10 + gap_analyzer finding._
