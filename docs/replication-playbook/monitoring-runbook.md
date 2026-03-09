# Monitoring Runbook

Operational playbook for ArxMint community operators: dashboards, alerts, and incident response.

---

## Access

| Service | URL | Default login |
|---------|-----|---------------|
| Prometheus | `http://your-server:9090` | None (restrict by IP) |
| Grafana | `http://your-server:3001` | admin / GRAFANA_PASSWORD env var |
| ArxMint health | `https://your-domain.com/api/health` | Public |
| LND metrics | `http://localhost:9090/metrics` (internal) | N/A |

**Security:** Restrict Prometheus and Grafana to your admin IP. Do NOT expose them publicly.

```bash
# Nginx example — restrict Grafana to admin IP
location /grafana/ {
    allow 1.2.3.4;  # Your IP
    deny all;
    proxy_pass http://localhost:3001/;
}
```

---

## Key Dashboards

Configure these Grafana dashboards (import JSON from `docker/grafana/dashboards/`):

### 1. Federation/Mint Health

**Panels:**
- Guardian online count (target: all guardians online)
- Consensus round latency (target: < 2s)
- Mint token issuance rate (sats/hour)
- Pending redemptions queue

**Alert:** Page on-call if guardian count drops below quorum threshold.

### 2. Lightning Channel Health

**Panels:**
- Total inbound liquidity (sats) — target: > 1M sats
- Total outbound liquidity (sats)
- Channel count — target: 3+ channels
- Routing success rate (%) — target: > 95%
- Largest channel (sats)

**Alert:** Warn if inbound drops below 200K sats.

### 3. Payment Operations

**Panels:**
- Payment success rate (%) — 15-min rolling average
- Failed payments by reason (insufficient balance, route not found, etc.)
- Average payment latency (ms)
- Payments per hour
- Invoice expiry rate

**Alert:** Critical if success rate drops below 90% for 15 consecutive minutes.

### 4. Community Health (BCE)

**Panels:**
- Total merchants active (30d)
- Monthly active spenders
- Spend velocity (tx/user/month)
- BCE maturity tier progression

**Refresh:** Daily — data from ArxMint BCE metrics API.

### 5. Infrastructure

**Panels:**
- CPU usage per container
- Memory usage per container
- Disk usage (especially LND + mint databases)
- Network I/O

**Alert:** Warn if disk < 5 GB free.

---

## Alert Rules

Configure these in Grafana Alerting → Alert Rules:

### Critical (page immediately)

| Alert | Condition | Message |
|-------|-----------|---------|
| Federation down | < 2/3 guardians responsive for 5 min | "CRITICAL: Federation below quorum — check guardians immediately" |
| Payment success < 80% | 15-min rolling average | "CRITICAL: Payment failures spiking — investigate LND and mint" |
| LND offline | `/api/health` returns LND unhealthy | "CRITICAL: LND node down — Lightning payments failing" |

### High (respond within 1 hour)

| Alert | Condition | Message |
|-------|-----------|---------|
| Low inbound liquidity | Inbound < 200K sats | "HIGH: Inbound liquidity low — open new channels or use Loop" |
| Payment success 80–95% | 15-min rolling average | "HIGH: Payment success degraded — check channel balances" |
| Disk space low | < 5 GB free | "HIGH: Disk space low — clean logs or expand storage" |

### Medium (respond within 24 hours)

| Alert | Condition | Message |
|-------|-----------|---------|
| Channel force-close | Any force-close event | "MEDIUM: Channel force-closed — review on-chain tx and reopen" |
| Guardian offline | Any single guardian offline > 30 min | "MEDIUM: Guardian [id] offline — contact guardian" |
| High payment latency | P95 > 10 seconds | "MEDIUM: Slow payments — check neutrino sync and channel routes" |

---

## Notification Channels

Configure at least one notification channel in Grafana:

### Telegram Bot (recommended for real-time)

1. Create bot via @BotFather on Telegram
2. Get chat ID (message the bot, check `https://api.telegram.org/bot<TOKEN>/getUpdates`)
3. In Grafana → Alerting → Contact Points → Add Telegram:
   - Bot token: `<your-bot-token>`
   - Chat ID: `<your-chat-id>`

### Email

Configure in `docker-compose.yml` environment:
```yaml
environment:
  GF_SMTP_ENABLED: "true"
  GF_SMTP_HOST: smtp.gmail.com:587
  GF_SMTP_USER: alerts@yourcommunity.com
  GF_SMTP_PASSWORD: your-app-password
```

### Nostr DM (decentralized)

Use a Nostr alerting relay that supports direct messages. Configure as a webhook in Grafana.

---

## Daily Health Checks

Run these manually (or automate via cron) each morning:

```bash
#!/bin/bash
# daily-health.sh

echo "=== ArxMint Daily Health Check ==="
echo ""

echo "1. LND sync status:"
docker exec lnd lncli getinfo | grep -E '"synced_to_chain"|"block_height"'

echo ""
echo "2. Lightning channels:"
docker exec lnd lncli listchannels | python3 -c "
import json, sys
channels = json.load(sys.stdin)['channels']
total_local = sum(int(c['local_balance']) for c in channels)
total_remote = sum(int(c['remote_balance']) for c in channels)
active = sum(1 for c in channels if c['active'])
print(f'  Active channels: {active}/{len(channels)}')
print(f'  Local balance: {total_local:,} sats')
print(f'  Remote (inbound): {total_remote:,} sats')
"

echo ""
echo "3. Cashu mint status:"
curl -s http://localhost:3338/v1/info | python3 -c "
import json, sys
info = json.load(sys.stdin)
print(f'  Mint: {info.get(\"name\", \"unknown\")}')
print(f'  Version: {info.get(\"version\", \"unknown\")}')
"

echo ""
echo "4. Disk space:"
df -h / | awk 'NR==2{print "  Used: " $3 " / " $2 " (" $5 " full)"}'

echo ""
echo "5. Container health:"
docker compose ps --format "table {{.Name}}\t{{.Status}}"

echo ""
echo "=== Check complete ==="
```

---

## Incident Response Procedures

### P0: Federation below quorum

**Symptoms:** < 2/3 guardians responsive, transactions failing or stuck

**Immediate actions:**
1. Alert all guardians via Signal: "EMERGENCY: Federation below quorum. Check your node NOW."
2. Identify which guardian(s) are offline via Grafana
3. Contact offline guardian via all available channels (Signal, phone, in-person)

**If guardian unreachable >72h:**
1. Convene emergency quorum with remaining guardians
2. Begin guardian rotation procedure (see [Guardian Recruitment](./guardian-recruitment.md))
3. Communicate status to community (Telegram: "Maintenance mode — deposits/withdrawals paused")

### P1: LND offline

**Symptoms:** Lightning payments failing, `/api/health` returns LND unhealthy

**Immediate actions:**
```bash
# Check LND logs
docker compose logs lnd --tail 50

# Try restart
docker compose restart lnd

# Wait for sync (may take 5–15 min)
watch docker exec lnd lncli getinfo | grep synced_to_chain
```

**Common causes:**
- LND crashed (OOM, disk full) → check `docker stats`, `df -h`
- Neutrino peers disconnected → add more peers in `lnd.conf`
- Chain fork (rare) → check `lncli getinfo` block height vs mempool.space

### P2: Low payment success rate

**Symptoms:** Success rate < 90%, users reporting failed payments

**Immediate actions:**
```bash
# Check failed payments
docker exec lnd lncli listpayments --max_payments 20 | \
  python3 -c "
import json, sys
pays = json.load(sys.stdin)['payments']
failed = [p for p in pays if p['status'] == 'FAILED']
for p in failed[-5:]:
    print(p['failure_reason'], '-', p['value_sat'], 'sats')
"

# Check channel balances
docker exec lnd lncli listchannels | \
  python3 -c "
import json, sys
ch = json.load(sys.stdin)['channels']
for c in ch:
    print(c['active'], c['remote_balance'], c['chan_id'][:20])
"
```

**Common fixes:**
- Low inbound → Loop Out or Magma to rebalance
- Route not found → Open more channels to diverse nodes
- Peer offline → Wait for reconnection or force-close and reopen

### P3: Disk space warning

```bash
# Find large files
du -sh /var/lib/docker/volumes/*/* | sort -rh | head -20

# Clean Docker logs
docker compose down
docker system prune -f
docker compose up -d

# Prune LND invoice DB (if very large)
docker exec lnd lncli deletepayments --all --failed_payments_only
```

---

## Monthly Review Checklist

Each month, complete this review with the guardian council:

**Operational:**
- [ ] Review alert history — any recurring issues?
- [ ] Check channel health — rebalance if needed
- [ ] Verify backup integrity (restore test quarterly)
- [ ] Review disk usage trends — capacity planning

**Community:**
- [ ] Pull BCE metrics from dashboard
- [ ] Count active merchants (last 30d)
- [ ] Count MAU (monthly active spenders)
- [ ] Calculate spend velocity
- [ ] Prepare grant report if applicable (see `docs/grant-reporting/`)

**Security:**
- [ ] Review API key access logs
- [ ] Check for any unusual payment patterns
- [ ] Verify guardian node software is up to date
- [ ] Review and rotate any long-lived credentials

---

## Prometheus Metrics Reference

Key metrics to query in Prometheus:

```promql
# LND: channel count
lnd_channels_active_total

# LND: total inbound liquidity
sum(lnd_channel_remote_balance_sat)

# Cashu: tokens in circulation
cdk_mint_total_issued_sat - cdk_mint_total_redeemed_sat

# Payment success rate (last 15 min)
rate(arxmint_payments_success_total[15m]) /
  rate(arxmint_payments_total[15m])

# System health
up{job=~"lnd|cdk-mint|arxmint"}
```
