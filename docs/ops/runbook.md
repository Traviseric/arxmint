# ArxMint Operations Runbook

Operational procedures for the ArxMint production droplet (DigitalOcean, `167.71.189.144`).
Infrastructure: Phoenixd + LNbits on mainnet, Next.js on Vercel, Supabase for DB.

---

## Daily Checks

- [ ] **Grafana dashboard** — confirm 0 active alerts at `http://167.71.189.144:3030`
- [ ] **LNbits health** — `curl -sf https://arxmint.com/lnbits/health && echo OK`
- [ ] **App health** — `curl -sf https://arxmint.com/api/health-check && echo OK`
- [ ] **Webhook delivery log** — check Supabase `webhook_deliveries` for any `status = failed` rows from the last 24h
- [ ] **Pending session count** — confirm `arxmint_pending_sessions_count` gauge is below 10 in Grafana (no stuck sessions)

## Weekly

- [ ] **Payment volume KPIs** — review total sats received per merchant in Supabase `checkout_sessions` (status = paid, past 7d)
- [ ] **npm audit** — run `npm audit --audit-level=high` in repo; open an issue for any HIGH/CRITICAL findings
- [ ] **Supabase storage growth** — confirm DB size is growing at a reasonable rate; check for unexpected large tables
- [ ] **Log review** — scan Vercel function logs for recurring errors or warnings
- [ ] **LNbits wallet balances** — verify merchant wallet balances match expected payouts

## Monthly

- [ ] **Balance audit** — reconcile total sats received (checkout_sessions) against merchant LNbits wallet totals; discrepancies > 1000 sats need investigation
- [ ] **API key rotation** — rotate `ARXMINT_WEBHOOK_SECRET`, `LNBITS_INVOICE_KEY` if any exposure risk; update Vercel env vars and droplet `.env`
- [ ] **Dependency updates** — run `npm outdated`; apply minor/patch bumps via PR; review major bumps manually
- [ ] **Backup verification** — restore a Postgres backup to staging and confirm data integrity
- [ ] **SSL certificate check** — confirm Caddy-managed cert expiry is >30 days out (`caddy certificates` or check browser)
- [ ] **Droplet resource usage** — confirm CPU/RAM/disk headroom on the DigitalOcean droplet dashboard

---

## Incident Response

### LNbits Unreachable

1. SSH to droplet: `ssh -i ~/.ssh/arxmint-pilot root@167.71.189.144`
2. Check container: `docker compose -f docker-compose.yml ps lnbits`
3. View logs: `docker compose logs --tail=100 lnbits`
4. Restart if crashed: `docker compose restart lnbits`
5. If still down after restart, check Phoenixd: `docker compose logs --tail=50 phoenixd`

### Webhook Delivery Failures

1. Check Grafana alert: `WebhookDeliveryFailureRate`
2. Query Supabase `webhook_endpoints` to identify affected merchant
3. Test merchant URL manually: `curl -sf <merchant_url>`
4. If merchant URL is down, mark endpoint inactive in Supabase until they fix it
5. Failed deliveries are retried up to 3× (5s → 30s → 5min) — no manual replay needed for transient failures

### Stuck Checkout Sessions

1. Check Grafana: `CheckoutSessionsStuck` alert active
2. Query: `SELECT COUNT(*) FROM checkout_sessions WHERE status = 'pending' AND created_at < NOW() - INTERVAL '30 minutes'`
3. If > 0 old pending sessions, LNbits invoice polling may be broken
4. Check LNbits health (see above) and restart if needed
5. Stuck sessions auto-expire — no manual cleanup required unless count is rapidly growing

### Vercel Deployment Failure

1. Check Vercel dashboard for failed deployment
2. Review build logs for TypeScript or lint errors
3. Fix and push; Vercel auto-deploys on push to `master`
4. If env vars are missing, add them in Vercel → Settings → Environment Variables

---

## Reference

| Resource | Location |
|---|---|
| Droplet credentials | `internal/arxmint-internal/operations/droplet-credentials.md` |
| Vercel env vars | Vercel dashboard → arxmint → Settings → Environment Variables |
| Supabase console | Supabase dashboard → arxmint project |
| Grafana | `http://167.71.189.144:3030` |
| LNbits | `https://arxmint.com/lnbits` |
| Health check script | `scripts/check-droplet-health.sh` |
