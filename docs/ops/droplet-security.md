# Droplet Security — LNbits Port Hardening

**Droplet:** 167.71.189.144 (DigitalOcean, Ubuntu 22.04)
**SSH key:** `~/.ssh/arxmint-pilot` (ed25519)

## Problem

LNbits runs on port 5000. Without hardening, anyone on the internet can call the LNbits API directly (e.g., `http://167.71.189.144:5000/api/v1/payments`) using the invoice key. The key is in Vercel env vars, so exposure is limited, but the LNbits admin UI and wallet management APIs are also accessible.

## Fix: Route LNbits Behind Caddy

Config files are in `droplet/` in this repo:
- `droplet/Caddyfile` — Caddy config (proxies lnbits.arxmint.com → localhost:5000)
- `droplet/docker-compose.yml` — Docker Compose with LNbits bound to `127.0.0.1:5000`

## Apply Steps (Human Required — HT-009)

```bash
# 1. SSH into the droplet
ssh -i ~/.ssh/arxmint-pilot root@167.71.189.144

# 2. Copy updated config files to droplet
# (run from local machine before SSH, or git pull on droplet)
scp -i ~/.ssh/arxmint-pilot droplet/Caddyfile root@167.71.189.144:/opt/arxmint/Caddyfile
scp -i ~/.ssh/arxmint-pilot droplet/docker-compose.yml root@167.71.189.144:/opt/arxmint/docker-compose.yml

# 3. Close port 5000 to the public internet
ufw deny 5000
ufw allow from 127.0.0.1 to any port 5000
ufw status verbose   # verify 5000 is denied from public

# 4. Restart docker-compose with the updated config
cd /opt/arxmint
docker compose down
docker compose up -d

# 5. Verify LNbits is NOT accessible on raw port 5000 from outside
# (run from local machine — should fail/timeout)
curl --connect-timeout 5 http://167.71.189.144:5000/api/v1/health  # expected: connection refused

# 6. Verify LNbits IS accessible via Caddy
curl https://lnbits.arxmint.com/api/v1/health  # expected: {"status": "alive"}
```

## After Applying: Update Vercel Env Var

Once Caddy is serving `lnbits.arxmint.com`, update `LNBITS_URL` in the Vercel dashboard:

```
LNBITS_URL=https://lnbits.arxmint.com
```

(Previously: `http://167.71.189.144:5000` — the raw port binding, which will be blocked after UFW hardening.)

See also: HUMAN_TASKS.md HT-008 (initial Vercel env var setup) and HT-009 (this hardening step).

## Firewall Baseline (UFW Rules After Hardening)

| Port | Protocol | From    | Action | Purpose                   |
|------|----------|---------|--------|---------------------------|
| 22   | TCP      | any     | ALLOW  | SSH                       |
| 80   | TCP      | any     | ALLOW  | Caddy HTTP → HTTPS redirect |
| 443  | TCP/UDP  | any     | ALLOW  | Caddy HTTPS + HTTP/3      |
| 5000 | TCP      | any     | DENY   | LNbits (internal only)    |
| 9740 | TCP      | any     | DENY   | Phoenixd API (internal only) |

## Verification Checklist

- [ ] `ufw status` shows port 5000 denied
- [ ] `curl http://167.71.189.144:5000` times out from external network
- [ ] `curl https://lnbits.arxmint.com/api/v1/health` returns `{"status": "alive"}`
- [ ] Vercel `LNBITS_URL` updated to `https://lnbits.arxmint.com`
- [ ] ArxMint checkout (arxmint.com/pay/seed-black-bear) still creates invoices
- [ ] Test payment completes end-to-end via Caddy-proxied LNbits
