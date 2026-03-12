# ArxMint — VPS Provisioning Checklist (Longmont Pilot)

Operational runbook for setting up the Longmont pilot VPS. All architectural decisions are locked per `docs/research/2-Pilot VPS & Deployment Architecture for ArxMint.md`. This document translates those decisions into step-by-step actions.

**Audience:** Travis (or whoever holds the Vultr credentials)
**Estimated time:** 90–120 minutes for a clean setup

---

## Spec Summary (locked decisions from Research #2)

| Parameter | Decision |
|-----------|----------|
| **Provider** | Vultr (primary) · DigitalOcean 8GB ($48/mo) as emergency fallback |
| **Plan** | Regular 16GB / 6 vCPUs / 320 GB NVMe SSD — ~$80/mo |
| **OS** | Ubuntu 22.04 LTS |
| **Region** | US — Denver or Chicago (closest to Longmont, CO) |
| **Reverse proxy** | Caddy (automatic HTTPS via Let's Encrypt) |
| **Firewall** | UFW — default-deny inbound; allow 22/80/443/9735 only |

> **Hetzner warning:** Hetzner's ToS and support threads prohibit crypto node hosting (including LND/Bitcoin). Do NOT use Hetzner unless you have explicit written approval for your workload. Account termination risk is real.

---

## Phase 1: VPS Creation (Vultr UI — human action required)

1. Log into [Vultr](https://www.vultr.com) (or create account, add payment method)
2. Click **Deploy New Server** → **Cloud Compute — Optimized Cloud Compute**
3. Choose settings:
   - **Region:** Chicago (IL) or Dallas (TX) — closest to Longmont, CO
   - **OS:** Ubuntu 22.04 LTS x64
   - **Plan:** 16 GB RAM / 6 vCPU / 320 GB SSD — ~$80/mo
   - **Additional options:** Disable IPv6 (simplifies firewall), enable backups is optional (+$16/mo)
4. **SSH Keys:** Add your public key during provisioning
   ```bash
   # Generate an ed25519 key pair locally (skip if you already have one)
   ssh-keygen -t ed25519 -C "arxmint-pilot" -f ~/.ssh/arxmint_pilot
   # Copy the public key to paste into Vultr
   cat ~/.ssh/arxmint_pilot.pub
   ```
5. Set a hostname (e.g., `arxmint-pilot-01`)
6. Click **Deploy Now**
7. **Note the server IP address** — you'll need it for DNS records

---

## Phase 2: Initial Security Hardening (SSH into new server)

Connect as root:
```bash
ssh -i ~/.ssh/arxmint_pilot root@<SERVER_IP>
```

### 2a. Create a non-root deploy user

```bash
adduser deploy
usermod -aG sudo deploy

# Copy SSH authorized keys to new user
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

### 2b. Disable password authentication and root SSH login

```bash
# Disable password auth and root login
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

systemctl restart sshd

# Verify (open a NEW terminal to test before closing this session)
# ssh -i ~/.ssh/arxmint_pilot deploy@<SERVER_IP>
```

> **Warning:** Test SSH access as `deploy` in a second terminal *before* closing your root session. If locked out, use Vultr console to fix.

### 2c. UFW firewall

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (Caddy ACME challenge + redirect to HTTPS)
ufw allow 443/tcp   # HTTPS (Caddy TLS termination)
ufw allow 9735/tcp  # LND P2P (Lightning node discovery + inbound channels)
ufw enable

# Verify
ufw status verbose
```

Expected output:
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
9735/tcp                   ALLOW IN    Anywhere
```

> **Ports intentionally NOT opened:**
> - `5432` (Postgres) — internal Docker network only
> - `9090` (Prometheus) — internal Docker network only
> - `3000` (Grafana) — served through Caddy at `grafana.yourdomain.org`
> - `10009`/`8080` (LND gRPC/REST) — access via `docker exec` or SSH tunnel

### 2d. Unattended security updates

```bash
apt update && apt upgrade -y
apt install -y unattended-upgrades fail2ban
dpkg-reconfigure --priority=low unattended-upgrades
# Accept defaults — enables security-only auto-updates
```

---

## Phase 3: Docker Installation (official Docker Engine — not snap)

> **Important:** Use the official Docker Engine repo, not Ubuntu's snap package. The snap version has known issues with Docker Compose and file permissions.

```bash
# As deploy user (or root)
apt update
apt install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Add the Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine + Compose plugin
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add deploy user to docker group (avoids needing sudo for every docker command)
usermod -aG docker deploy

# Log out and back in for group change to take effect, then verify
docker compose version
# Expected: Docker Compose version v2.x.x
```

---

## Phase 4: DNS Configuration (domain registrar — human action required)

### 4a. Register a domain

Suggested registrars: Namecheap, Porkbun, Cloudflare Registrar
Suggested domain: `arxmint.community`, `yourtown.community`, or your own

### 4b. Add DNS records

In your registrar's DNS panel, add:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` (apex) | `<SERVER_IP>` | 300 |
| A | `www` | `<SERVER_IP>` | 300 |
| A | `grafana` | `<SERVER_IP>` | 300 |

> **TTL 300** (5 minutes) is intentional for initial setup — easy to change if the IP needs updating. Increase to 3600 once stable.

### 4c. Verify propagation

```bash
# From your local machine (or the VPS)
dig @8.8.8.8 yourdomain.org
dig @8.8.8.8 grafana.yourdomain.org

# Both should return your SERVER_IP in the A record
```

---

## Phase 5: ArxMint Deployment

All commands as the `deploy` user on the VPS.

### 5a. Clone the repository

```bash
cd /home/deploy
git clone https://github.com/your-org/arxmint
cd arxmint
```

### 5b. Generate secrets

```bash
# Run the secrets generation script (task 145)
bash scripts/generate-secrets.sh

# This creates .env from .env.example and fills in:
#   NEXTAUTH_SECRET, MACAROON_ROOT_KEY, CASHU_PRIVATE_KEY, GRAFANA_PASSWORD
```

### 5c. Configure `.env`

Edit `.env` and fill in the remaining required values:

```bash
nano .env
```

Required fields to set manually:

```bash
# Domain (must match DNS records from Phase 4)
DOMAIN=yourdomain.org
CADDY_EMAIL=admin@yourdomain.org
NEXT_PUBLIC_BASE_URL=https://yourdomain.org
ALLOWED_ORIGINS=https://yourdomain.org

# Bitcoin network (testnet for pilot, bitcoin for mainnet)
BITCOIN_NETWORK=testnet

# Cashu database (change from defaults)
CASHU_DB_PASSWORD=<generate with: openssl rand -base64 20>

# Postgres password
POSTGRES_PASSWORD=<generate with: openssl rand -base64 20>
DATABASE_URL=postgresql://arxmint:<POSTGRES_PASSWORD>@postgres:5432/arxmint
```

> **LND seed is generated separately.** See Phase 5e below — `lncli create` must run after the LND container starts.

### 5d. Start the stack

```bash
# Start all services (detached)
docker compose -f docker/docker-compose.cashu.yml up -d

# Check all containers are running
docker compose -f docker/docker-compose.cashu.yml ps

# Follow logs for any startup errors
docker compose -f docker/docker-compose.cashu.yml logs -f --tail=50
```

### 5e. Initialize the LND wallet (first-time only)

```bash
# Create a new LND wallet (generates your seed phrase)
docker exec -it sf-lnd lncli create

# CRITICAL: Write down the 24-word seed phrase and store it offline
# This is the only way to recover funds if the VPS is lost

# After wallet creation, unlock it on every restart:
docker exec -it sf-lnd lncli unlock
```

### 5f. Configure LND macaroon in `.env`

```bash
# Extract the invoice macaroon for ArxMint's server-side invoice creation
docker exec sf-lnd lncli bakemacaroon invoices:read invoices:write \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['macaroon'])"

# Add to .env:
LND_REST_URL=https://localhost:8080
LND_MACAROON_HEX=<paste macaroon hex here>
```

### 5g. Verify deployment

```bash
# Check HTTPS is working (Caddy obtains TLS cert automatically)
curl -I https://yourdomain.org

# Check health endpoint
curl https://yourdomain.org/api/health
# Expected: {"status":"ok"} or similar
```

---

## Phase 6: Post-Deploy Verification Checklist

Work through this top to bottom before onboarding any Longmont pilot users.

**Infrastructure**
- [ ] VPS is running Ubuntu 22.04 on Vultr 16GB plan
- [ ] UFW active — only ports 22, 80, 443, 9735 open (`ufw status verbose`)
- [ ] SSH password authentication disabled (`PasswordAuthentication no` in sshd_config)
- [ ] Root SSH login disabled (`PermitRootLogin no`)
- [ ] `fail2ban` installed and running (`systemctl status fail2ban`)
- [ ] Unattended security updates enabled

**Docker & Services**
- [ ] `docker compose version` shows v2.x (not v1/standalone)
- [ ] All containers running: `docker compose ps` shows no `Exit` status
- [ ] No critical errors in logs: `docker compose logs --tail=100 | grep -i error`

**Networking & TLS**
- [ ] `https://yourdomain.org` loads ArxMint landing page (green padlock)
- [ ] `https://www.yourdomain.org` redirects or resolves correctly
- [ ] `https://grafana.yourdomain.org` shows Grafana login
- [ ] Caddy TLS cert is valid (check expiry: `curl -vI https://yourdomain.org 2>&1 | grep "expire date"`)

**Application**
- [ ] `/api/health` returns 200 with services listed as healthy
- [ ] Community creation flow works end-to-end (create a test community)
- [ ] Merchant onboarding page loads without errors

**LND & Cashu**
- [ ] LND wallet created and synced: `docker exec sf-lnd lncli getinfo` shows `synced_to_chain: true`
- [ ] LND wallet unlocked (status shows `synced_to_chain`, not `waiting for wallet password`)
- [ ] Cashu mint responds: `curl http://localhost:3338/v1/info` returns mint info
- [ ] Test Cashu flow: generate a mint quote, pay invoice, verify token minted
- [ ] L402 endpoint responds correctly: `curl -I https://yourdomain.org/api/l402` returns `402`

**Monitoring**
- [ ] Grafana dashboard loads and shows metrics (`https://grafana.yourdomain.org`)
- [ ] Prometheus scraping LND and app metrics (visible in Grafana)

**Backups (pre-launch requirement)**
- [ ] LND seed phrase (24 words) written down and stored offline (NOT on the VPS)
- [ ] `channel.backup` location confirmed: `/root/.lnd/data/chain/bitcoin/testnet/channel.backup`
- [ ] Offsite backup destination configured (Backblaze B2 or S3-compatible)
- [ ] `scripts/watch_channel_backup.sh` running (auto-uploads channel.backup on change)
- [ ] `.env` backed up to encrypted offline storage (password manager or encrypted USB)

---

## Cost Reference

| Item | Cost |
|------|------|
| Vultr 16GB / 6 vCPU / 320 GB NVMe | ~$80/mo |
| Domain registration | ~$12–15/yr (~$1/mo) |
| Backblaze B2 backups (~10 GB) | ~$1–2/mo |
| Vultr automatic backups (optional) | +$16/mo (~20% of instance) |
| **Total (without provider backups)** | **~$82–85/mo** |
| **Total (with provider backups)** | **~$98–99/mo** |

> Budget envelope for the Longmont pilot: **$80–90/mo operating cost** (from `human_tasks.md`).
> Provider backups are optional — app-level backups via `scripts/watch_channel_backup.sh` + Backblaze B2 cover the most critical state (LND channels, Postgres DB) for ~$2/mo.

---

## References

- `docs/research/2-Pilot VPS & Deployment Architecture for ArxMint.md` — architectural decisions (Vultr choice, sizing rationale, Hetzner warning)
- `docker/docker-compose.cashu.yml` — production Docker Compose stack
- `docker/Caddyfile` — reverse proxy config (DOMAIN and CADDY_EMAIL from `.env`)
- `scripts/generate-secrets.sh` — generates NEXTAUTH_SECRET, MACAROON_ROOT_KEY, CASHU_PRIVATE_KEY, GRAFANA_PASSWORD
- `scripts/watch_channel_backup.sh` — LND channel backup watcher (run after wallet creation)
- `scripts/backup_postgres.sh` — Postgres backup script
- `.env.example` — all required environment variables with documentation
