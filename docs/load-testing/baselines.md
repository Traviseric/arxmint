# ArxMint Load Testing — Throughput Baselines

## Target SLOs (from Roadmap 5.10b)

| Metric | Target | Status |
|--------|--------|--------|
| Concurrent checkout sessions | 100 | ⏳ Pending baseline |
| Transactions per day | 1,000 | ⏳ Pending baseline |
| Webhook delivery | 10/sec sustained | ⏳ Pending baseline |
| Checkout API p95 latency | < 500ms | ⏳ Pending baseline |
| Health endpoint p99 | < 50ms | ⏳ Pending baseline |

## Test Suite

| File | Purpose | Command |
|------|---------|---------|
| `tests/load/smoke.yml` | CI gate — 10 req/s for 30s | `npm run test:load:smoke` |
| `tests/load/checkout-flow.yml` | Full throughput — ramp to 100 concurrent | `npm run test:load:full` |
| `tests/load/webhook-delivery.yml` | Webhook delivery — 10/s sustained | `npm run test:load:webhooks` |

## Prerequisites

Full load tests require the regtest stack:

```bash
npm run setup:regtest
# Wait for LND + Cashu + Postgres to be ready
npm run test:load:full
```

Smoke test can run against a local dev server:

```bash
npm run dev &
npm run test:load:smoke
```

## Baseline Results

> **Status: Not yet recorded.** Run against regtest stack and fill in below.

### Smoke Test (10 req/s × 30s)

- **Date:** —
- **Stack:** regtest / local dev
- **p50 latency:** —
- **p95 latency:** —
- **p99 latency:** —
- **Error rate:** —
- **Throughput (req/s):** —

### Checkout Flow (ramp to 100 concurrent)

- **Date:** —
- **Stack:** regtest
- **Peak concurrent:** —
- **p50 latency:** —
- **p95 latency:** —
- **p99 latency:** —
- **Error rate:** —
- **Max sustained throughput:** —

### Webhook Delivery (10/s sustained)

- **Date:** —
- **Stack:** regtest
- **Sustained rate achieved:** —
- **p50 latency:** —
- **p95 latency:** —
- **Error rate:** —

## Capacity Planning

### Checkout API

Estimated capacity (to be validated):
- Single Vercel function: ~50 req/s
- With Supabase connection pooling: up to 200 concurrent
- Lightning invoice generation: bottleneck at LND RPC (~20 req/s on NUC)

### Webhook Delivery

- Printful/OpenBazaar.ai webhooks: low volume (<1/s expected)
- Lightning payment confirmations: burst at payment time
- Target 10/s provides 10× headroom over expected peak

## CI Integration

The smoke test runs automatically in CI after every build:

```yaml
# .github/workflows/ci.yml — load-smoke job
# Requires: Next.js app running on localhost:3000
# Runs: smoke.yml (10 req/s × 30s)
# Non-blocking: yes (continue-on-error: true until baselines established)
```

## Known Bottlenecks

1. **LND RPC** — Invoice creation is synchronous, ~20 req/s on NUC hardware
2. **Supabase free tier** — 60 connections max; connection pooler required at scale
3. **WASM init** — Fedimint/Cashu WASM cold starts add ~200ms on first request

## Recording New Baselines

```bash
# 1. Start regtest stack
npm run setup:regtest

# 2. Run full load test
npm run test:load:full -- --output json > docs/load-testing/results-$(date +%Y%m%d).json

# 3. Summarise and update this file with p50/p95/p99 from the JSON output
```
