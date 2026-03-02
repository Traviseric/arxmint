# ArxMint — Deployment Guide

Deploy ArxMint to a VPS: from a fresh Ubuntu server to a running Bitcoin circular economy in under an hour.

---

## Table of Contents

1. [Server Requirements](#1-server-requirements)
2. [Initial Server Setup](#2-initial-server-setup)
3. [Install Docker](#3-install-docker)
4. [Clone and Configure](#4-clone-and-configure)
5. [Database Setup](#5-database-setup)
6. [Start the Full Stack](#6-start-the-full-stack)
7. [First-Time LND Setup](#7-first-time-lnd-setup)
8. [Domain and SSL](#8-domain-and-ssl)
9. [Regtest vs Testnet vs Mainnet](#9-regtest-vs-testnet-vs-mainnet)
10. [Monitoring](#10-monitoring)
11. [Updating](#11-updating)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Server Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| CPU | 2 vCPUs | 4 vCPUs |
| RAM | 4 GB | 8 GB |
| Storage | 50 GB SSD | 100 GB SSD |
| Bandwidth | 1 TB/mo | Unmetered |

**Required software:**
- Docker Engine 24+
- Docker Compose v2 (included with Docker Desktop / `docker compose` plugin)
- Git

**Ports to open in your firewall:**

| Port | Service |
|------|---------|
| 22 | SSH |
| 80 | HTTP (for SSL cert issuance) |
| 443 | HTTPS (reverse proxy) |
| 9735 | LND P2P |

All other service ports (3000, 3338, 8080, etc.) should be kept private — traffic flows through the reverse proxy.

---

## 2. Initial Server Setup

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Create a non-root user (replace "arxmint" with your username)
sudo adduser arxmint
sudo usermod -aG sudo arxmint

# Switch to the new user
su - arxmint
```

---

## 3. Install Docker

```bash
# Install Docker Engine
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to the docker group (log out and back in to take effect)
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

---

## 4. Clone and Configure

```bash
# Clone the repository
git clone https://github.com/your-org/arxmint.git
cd arxmint

# Copy the environment template
cp .env.example .env
```

Edit `.env` and fill in the required values:

```bash
nano .env
```

**Required values to set:**

```bash
# PostgreSQL — see Section 5 for setup
DATABASE_URL="postgresql://arxmint:yourpassword@localhost:5432/arxmint"

# Bitcoin network: bitcoin | testnet | signet | regtest
BITCOIN_NETWORK=testnet

# Cashu mint — matches the Docker service
CASHU_MINT_URL=http://localhost:3338

# Aperture L402 proxy — matches the Docker service
APERTURE_URL=http://localhost:8081

# Cashu mint private key — CHANGE THIS for production (64 hex chars)
# The default in docker-compose is a placeholder; override it here:
CASHU_PRIVATE_KEY=your64hexcharsprivatekey

# Grafana admin password
GRAFANA_PASSWORD=changeme

# L402 pricing
L402_PRICE_SATS=100
```

**Optional values (for full Lightning functionality):**

```bash
# LNC pairing phrase from Lightning Terminal (for browser-side LNC-Web)
LNC_PAIRING_PHRASE=word1 word2 ... word10
LNC_PASSWORD=yourpassword
LNC_SECURITY_TIER=watch-only   # watch-only | pay-only | admin

# LND REST for server-side invoice generation (real L402 flow)
LND_REST_URL=https://localhost:8080
LND_MACAROON_HEX=02...  # lncli bakemacaroon invoices:read invoices:write

# Fedimint federation invite code
FEDIMINT_INVITE_CODE=fed11...

# Glassnode API key for premium cycle metrics
GLASSNODE_API_KEY=
```

> **Security note:** Never commit `.env` to version control. Keep `SKIP_PAYMENT_VERIFY` empty in production — setting it to `true` disables the paywall entirely.

---

## 5. Database Setup

ArxMint uses PostgreSQL for persisting communities, wallet proofs, merchants, and transactions.

### Option A: Docker PostgreSQL (simplest)

Add a `postgres` service to your stack by creating `docker-compose.override.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: sf-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: arxmint
      POSTGRES_USER: arxmint
      POSTGRES_PASSWORD: yourpassword
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - sovereign

volumes:
  postgres-data:
```

Set `DATABASE_URL="postgresql://arxmint:yourpassword@postgres:5432/arxmint"` in `.env`.

### Option B: Managed PostgreSQL

Use a managed database (Supabase, Railway, Neon, etc.) and set `DATABASE_URL` to the connection string they provide.

### Run migrations

Once the database is reachable, run the Prisma migrations:

```bash
# Install Node.js dependencies (required for Prisma CLI)
npm install

# Run migrations
npx prisma migrate deploy
```

This creates the `communities`, `wallet_proofs`, `merchants`, `transactions`, and `users` tables.

---

## 6. Start the Full Stack

### Option A: Full stack (recommended)

Starts LND, Cashu mint (Nutshell), Fedimint guardians, Aperture, Prometheus, Grafana, and the ArxMint web app:

```bash
docker compose up -d
```

Or using the npm shortcut:

```bash
npm run setup:full
```

### Option B: Cashu-only (lighter weight, no Fedimint)

Starts just LND + Cashu mint — faster setup for development or communities that don't need Fedimint:

```bash
npm run setup:cashu
# equivalent to: docker compose -f docker/docker-compose.cashu.yml up -d
```

### Check service status

```bash
# View all running services
docker compose ps

# Check LND health (may take 60s to start)
docker compose exec lnd lncli --network=testnet getinfo

# View logs for the web app
docker compose logs -f web

# View all logs
docker compose logs -f
```

### Service URLs (internal to server)

| Service | URL |
|---------|-----|
| ArxMint web | `http://localhost:3000` |
| Cashu mint | `http://localhost:3338` |
| LND REST | `https://localhost:8080` |
| LND gRPC | `localhost:10009` |
| Aperture L402 | `http://localhost:8081` |
| Grafana | `http://localhost:3001` |
| Prometheus | `http://localhost:9090` |
| Fedimint Guardian 0 API | `ws://localhost:18174` |

---

## 7. First-Time LND Setup

After `docker compose up -d`, LND starts without a wallet. **You must create the wallet and save the seed phrase before funds can be received.**

```bash
# Wait for LND to start (takes ~60 seconds on first run), then:
docker exec -it sf-lnd lncli --network=testnet create
```

Follow the prompts:
1. Enter a wallet password (you'll need this to unlock LND on each restart)
2. Choose **n** when asked if you have an existing seed
3. **SAVE THE 24-WORD SEED PHRASE SECURELY** — write it down and store it offline

> **Critical:** This seed phrase is the only way to recover funds if the Docker volume (`lnd-data`) is lost. No seed phrase = permanent loss of all channel funds.

For the Cashu-only stack (`sf-lnd-lite`):
```bash
docker exec -it sf-lnd-lite lncli --network=testnet create
```

**Subsequent restarts:** LND will require wallet unlock. Either run `lncli unlock` manually or configure an auto-unlock password file.

---

## 8. Domain and SSL

Use [Caddy](https://caddyserver.com/) as a reverse proxy — it handles TLS automatically via Let's Encrypt.

### Install Caddy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

### Configure Caddy

```bash
sudo nano /etc/caddy/Caddyfile
```

```caddyfile
yourdomain.com {
    reverse_proxy localhost:3000
}

# Optional: expose Grafana on a subdomain
grafana.yourdomain.com {
    reverse_proxy localhost:3001
}
```

```bash
sudo systemctl reload caddy
```

Caddy automatically provisions and renews TLS certificates. Your site will be live at `https://yourdomain.com`.

> **Alternative:** If you prefer nginx + certbot, proxy `localhost:3000` and use `certbot --nginx -d yourdomain.com`.

---

## 9. Regtest vs Testnet vs Mainnet

### Testnet (default)

No configuration needed — the default `docker-compose.yml` runs LND on testnet with neutrino.

Set in `.env`:
```bash
BITCOIN_NETWORK=testnet
```

### Regtest (local development)

Run a local Bitcoin node and connect LND to it. Modify the LND command in `docker-compose.yml`:

```yaml
command: >
  lnd
  --bitcoin.active
  --bitcoin.regtest
  --bitcoin.node=bitcoind
  --bitcoind.rpchost=bitcoind:8332
  --bitcoind.rpcuser=rpcuser
  --bitcoind.rpcpass=rpcpass
  --bitcoind.zmqpubrawblock=tcp://bitcoind:28332
  --bitcoind.zmqpubrawtx=tcp://bitcoind:28333
  ...
```

Set in `.env`:
```bash
BITCOIN_NETWORK=regtest
SKIP_PAYMENT_VERIFY=true   # OK for local dev only
```

### Mainnet (production)

Edit `docker-compose.yml` and change the LND command from `--bitcoin.testnet` to `--bitcoin.mainnet`, and update neutrino peers to mainnet peers:

```yaml
command: >
  lnd
  --bitcoin.active
  --bitcoin.mainnet
  --bitcoin.node=neutrino
  --neutrino.addpeer=btcd-mainnet.lightning.computer
  --neutrino.addpeer=mainnet1-lnd.zaphq.io
  ...
```

Also update in `.env`:
```bash
BITCOIN_NETWORK=bitcoin
SKIP_PAYMENT_VERIFY=   # empty — never skip on mainnet
CASHU_PRIVATE_KEY=<strong-random-64-hex-chars>
```

> **Warning:** On mainnet, the `CASHU_PRIVATE_KEY` controls all mint keys. Use a cryptographically random value and back it up securely. Loss of this key means loss of the ability to redeem proofs.

The Cashu mint's `testnet` vs mainnet macaroon path also changes — update `MINT_LND_REST_MACAROON` in the `cashu-mint` service:
```yaml
# testnet:
- MINT_LND_REST_MACAROON=/root/.lnd/data/chain/bitcoin/testnet/admin.macaroon
# mainnet:
- MINT_LND_REST_MACAROON=/root/.lnd/data/chain/bitcoin/mainnet/admin.macaroon
```

---

## 10. Monitoring

Prometheus and Grafana are included in the full stack.

### Access Grafana

```
http://localhost:3001   (or https://grafana.yourdomain.com if configured)
```

Log in with `admin` and the `GRAFANA_PASSWORD` you set in `.env` (required — there is no default).

The ArxMint dashboard is pre-provisioned at `docker/grafana/dashboards/arxmint.yaml`.

### Access Prometheus

```
http://localhost:9090
```

Scrape config is at `docker/prometheus.yml`. Prometheus stores 30 days of metrics.

---

## 11. Updating

```bash
# Pull latest code
git pull origin main

# Rebuild the web app image and restart
docker compose build web
docker compose up -d web

# If dependencies or schema changed, also run:
npm install
npx prisma migrate deploy

# Full restart (all services)
docker compose down && docker compose up -d
```

---

## 12. Troubleshooting

### LND won't start / stays unhealthy

LND takes 60–120 seconds to sync neutrino headers on first start. Check logs:

```bash
docker compose logs -f lnd
```

If it fails with a wallet error, you need to create the LND wallet. See the **First-Time LND Setup** section above.

### Cashu mint can't connect to LND

The mint waits for LND to be healthy. If LND is still syncing, the mint will retry. Check:

```bash
docker compose logs -f cashu-mint
```

Common cause: LND TLS cert not yet generated. Give LND 60 seconds, then restart the mint:

```bash
docker compose restart cashu-mint
```

### Prisma migration failures

```bash
# Check the database is reachable
npx prisma db pull

# Reset and re-run migrations (destructive — dev only)
npx prisma migrate reset

# Production: deploy only
npx prisma migrate deploy
```

### Web app build fails inside Docker

If the `web` service fails to build, check available disk space and that `npm ci` can reach the registry:

```bash
docker compose build web --no-cache
docker system prune -f   # free up unused images/layers
```

### Port conflicts

If a port is already in use, either stop the conflicting service or change the host port mapping in `docker-compose.yml`:

```yaml
ports:
  - "3100:3000"   # Use 3100 on the host instead of 3000
```

### View all container logs at once

```bash
docker compose logs --tail=100 -f
```

---

## 13. Backup Automation

ArxMint includes two backup scripts in `scripts/`:

### Postgres backups (daily)

```bash
# Make the script executable (first time only)
chmod +x scripts/backup_postgres.sh

# Test it manually
./scripts/backup_postgres.sh /backups/postgres

# Add to crontab (runs daily at 2am)
crontab -e
# Add this line:
0 2 * * * /app/scripts/backup_postgres.sh /backups/postgres >> /var/log/arxmint-backup.log 2>&1
```

Backup files are stored as `arxmint_YYYYMMDD_HHMMSS.sql.gz`. Backups older than 7 days are pruned automatically. Override with `BACKUP_RETENTION_DAYS` env var.

### Postgres PITR backups (base + WAL)

`docker-compose.yml` enables Postgres WAL archiving to the `postgres-wal-archive` named volume.

Create periodic base backups:

```bash
chmod +x scripts/backup_postgres_pitr_base.sh
./scripts/backup_postgres_pitr_base.sh /backups/postgres-pitr/base
```

Restore to latest WAL state:

```bash
chmod +x scripts/restore_postgres_pitr.sh
./scripts/restore_postgres_pitr.sh /backups/postgres-pitr/base/base_YYYYMMDD_HHMMSS.tar.gz
```

Restore to a specific timestamp:

```bash
./scripts/restore_postgres_pitr.sh \
  /backups/postgres-pitr/base/base_YYYYMMDD_HHMMSS.tar.gz \
  "2026-03-02 18:30:00+00"
```

Prune archived WAL files:

```bash
chmod +x scripts/prune_postgres_wal_archive.sh
PITR_WAL_RETENTION_DAYS=7 \
  ./scripts/prune_postgres_wal_archive.sh /var/lib/docker/volumes/arxmint_postgres-wal-archive/_data
```

For full procedure and validation steps, see `docs/PITR_RUNBOOK.md`.

### LND channel.backup watcher (continuous)

The `channel.backup` file must be copied every time LND channels change — losing it means losing all Lightning channels.

```bash
# Make executable
chmod +x scripts/watch_channel_backup.sh

# Run as a background service (add to /etc/systemd/system/arxmint-channel-backup.service)
nohup ./scripts/watch_channel_backup.sh /backups/lnd >> /var/log/arxmint-channel-backup.log 2>&1 &

# Or set LND_DATA_DIR to match your Docker volume path
LND_DATA_DIR=/var/lib/docker/volumes/arxmint_lnd_data/_data \
  ./scripts/watch_channel_backup.sh /backups/lnd
```

Uses `inotifywait` (inotify-tools) when available for efficient event-driven watching. Falls back to 60-second polling on macOS or systems without inotify.
