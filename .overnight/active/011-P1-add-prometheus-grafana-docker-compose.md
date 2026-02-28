---
id: 11
title: "Add Prometheus + Grafana to root docker-compose.yml"
priority: P1
severity: medium
status: completed
source: gap_analyzer + overnight_tasks
file: docker-compose.yml
line: null
created: "2026-02-27T00:00:00"
execution_hint: sequential
context_group: docker_config
group_reason: "Same docker-compose.yml as task 010 and 013 — run sequentially to avoid conflicts"
---

# Add Prometheus + Grafana to root docker-compose.yml

**Priority:** P1 (medium)
**Source:** gap_analyzer P2 + OVERNIGHT_TASKS.md (ID: 10)
**Location:** `docker-compose.yml`, new `docker/grafana/` config

## Problem

The community generator (`lib/community-generator.ts`) generates Prometheus scrape configs and Grafana references as part of every deployment config. However, the root `docker-compose.yml` doesn't reliably include a Prometheus and Grafana stack by default (or if they are defined, the configuration may not be enabled/active). Operators have no monitoring out of the box.

**Note from gap_analyzer:** "docker-compose.yml has Prometheus and Grafana services defined. However, these may not be enabled by default in the root compose." Verify the actual state of the file and fix accordingly.

## How to Fix

1. Read the current `docker-compose.yml` to check if Prometheus/Grafana services exist and are enabled
2. If missing or disabled, add/enable:
   ```yaml
   prometheus:
     image: prom/prometheus:latest
     volumes:
       - ./docker/prometheus.yml:/etc/prometheus/prometheus.yml
     ports:
       - "9090:9090"
     restart: unless-stopped

   grafana:
     image: grafana/grafana:latest
     volumes:
       - grafana_data:/var/lib/grafana
       - ./docker/grafana/dashboards:/etc/grafana/provisioning/dashboards
     ports:
       - "3001:3000"
     depends_on:
       - prometheus
     restart: unless-stopped
   ```
3. Create `docker/prometheus.yml` with scrape targets for:
   - LND metrics (port 9092 if LND has metrics enabled)
   - Cashu mint health endpoint
   - Fedimint node metrics
   - The Next.js app itself (if metrics endpoint exists)
4. Create `docker/grafana/dashboards/arxmint.json` — a basic dashboard showing:
   - Channel balance over time
   - Transaction count
   - Mint liquidity
5. Add `grafana_data` to the volumes section

## Acceptance Criteria

- [ ] `docker compose config` includes active prometheus and grafana services
- [ ] `docker/prometheus.yml` exists with scrape configs for LND and Cashu
- [ ] Grafana provisioning directory exists at `docker/grafana/`
- [ ] `docker compose up` can start the monitoring stack without errors
- [ ] `npm run build` passes

## Notes

Run this task after task 010 (Fedimint v0.10.0 update) since both touch `docker-compose.yml`. The gap_analyzer says these services may already be defined — check before adding duplicates.

_Generated from OVERNIGHT_TASKS.md ID:10 + gap_analyzer P2 "Monitoring stack"._
