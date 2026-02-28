---
id: 147
title: "Write docs/VPS_SETUP.md (VPS provisioning checklist for Longmont pilot)"
priority: P1
severity: high
status: completed
source: human_tasks_switch_blocked
file: docs/VPS_SETUP.md
created: "2026-02-28T16:00:00Z"
execution_hint: parallel
context_group: deploy_prep
group_reason: "Infrastructure preparation tasks alongside 145 and 146"
---

# Write docs/VPS_SETUP.md (VPS provisioning checklist for Longmont pilot)

**Priority:** P1 (high)
**Source:** human_tasks.md — "Provision Vultr VPS" and "Register domain + point DNS" (Credential & Infrastructure Setup section)
**Location:** docs/VPS_SETUP.md (new file)

## Problem

Human tasks include:
- "Provision Vultr VPS — 16GB/6-core plan ($80/mo). Set up SSH keys, disable password auth, configure UFW firewall (allow 22/80/443/9735 only)."
- "Register domain + point DNS — Need domain for Caddy HTTPS."

Both tasks require human action (no agent can provision a VPS or buy a domain). However, there is currently no checklist document for what to do once Travis has access to the VPS console. Without it, the provisioning is ad hoc and error-prone. Missing a firewall rule or Docker configuration could expose the pilot to security risk.

Research #2 (`docs/research/2-Pilot VPS & Deployment Architecture for ArxMint.md`) made the architectural decisions: Vultr 16GB/6-core, Caddy reverse proxy, UFW firewall, no password auth. These decisions are locked. The VPS_SETUP.md translates them into actionable steps.

## How to Fix

Create `docs/VPS_SETUP.md` with the following content:

### Document structure:

1. **Spec Summary** — Confirmed choices from Research #2:
   - Provider: Vultr (preferred) or DigitalOcean 8GB ($48/mo) as fallback
   - Plan: 16GB RAM / 6 vCPUs / 320GB NVMe SSD, ~$80/mo
   - OS: Ubuntu 22.04 LTS
   - Region: US (closest to Longmont, CO — Denver or Chicago)
   - Note: Hetzner requires written ToS approval for Lightning node hosting

2. **Phase 1: VPS Creation (Vultr UI — human action)**
   - Create Vultr account, add payment method
   - Deploy server: Ubuntu 22.04, 16GB plan, Denver/Chicago region
   - Add SSH public key during provisioning (generate with `ssh-keygen -t ed25519`)
   - Note the server IP address

3. **Phase 2: Initial Security Hardening (SSH commands)**
   ```bash
   # Disable password auth
   sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
   systemctl restart sshd

   # UFW firewall
   ufw default deny incoming
   ufw default allow outgoing
   ufw allow 22/tcp    # SSH
   ufw allow 80/tcp    # HTTP (Caddy redirect)
   ufw allow 443/tcp   # HTTPS (Caddy)
   ufw allow 9735/tcp  # LND P2P
   ufw enable

   # Verify
   ufw status verbose
   ```

4. **Phase 3: Docker Installation**
   - Install Docker Engine (official repo, not snap)
   - Install Docker Compose v2 plugin
   - Add deploy user to docker group
   - Verify: `docker compose version`

5. **Phase 4: DNS Configuration (domain registrar — human action)**
   - Register domain (suggested: `arxmint.community` or `yourdomain.org`)
   - Add A record: `@` → VPS IP
   - Add A record: `www` → VPS IP
   - Add A record: `grafana` → VPS IP (for monitoring subdomain)
   - TTL: 300 (5 min for initial testing)
   - Verify propagation: `dig @8.8.8.8 yourdomain.org`

6. **Phase 5: ArxMint Deployment**
   - Clone repo: `git clone https://github.com/your-org/arxmint`
   - Run secrets script: `bash scripts/generate-secrets.sh` (after task 145)
   - Configure `.env` with domain, LND seed phrase (after `lncli create`)
   - Start stack: `docker compose up -d`
   - Verify health: `curl https://yourdomain.org/api/health`

7. **Phase 6: Post-Deploy Verification Checklist**
   - [ ] `https://yourdomain.org` loads ArxMint landing page
   - [ ] `/api/health` returns 200 with all services healthy
   - [ ] Grafana dashboard accessible at `https://grafana.yourdomain.org`
   - [ ] LND wallet created and synced (`lncli getinfo`)
   - [ ] Test Cashu mint: generate invoice, pay, verify token
   - [ ] UFW active with correct ports only (`ufw status`)
   - [ ] Fail2ban or similar brute-force protection installed

8. **Cost Reference** — Monthly infrastructure budget:
   - Vultr 16GB: ~$80/mo
   - Domain: ~$12-15/yr
   - Backups (S3-compatible, e.g. Backblaze B2): ~$5/mo
   - Total: ~$85-90/mo operating cost

Reference existing project artifacts:
- `docs/research/2-Pilot VPS & Deployment Architecture for ArxMint.md` — architectural decisions
- `docker/docker-compose.yml` — services being deployed
- `docker/Caddyfile` — reverse proxy config
- `scripts/generate-secrets.sh` — (task 145) secret generation
- `.env.example` — required environment variables

## Acceptance Criteria

- [ ] `docs/VPS_SETUP.md` created with all 8 sections
- [ ] UFW rules are accurate for ArxMint's required ports (22, 80, 443, 9735)
- [ ] Vultr spec matches Research #2 locked decisions (16GB/6-core, Ubuntu 22.04)
- [ ] Docker installation uses official Docker Engine repo (not snap)
- [ ] DNS instructions specify both apex and www records
- [ ] Cost reference matches human_tasks.md budget estimates
- [ ] Post-deploy checklist references task 145 (generate-secrets.sh)
- [ ] Document notes Hetzner ToS restriction for Lightning nodes

## Notes

_Generated from human_tasks.md switch-blocked items. The VPS provisioning itself is human-only (requires Vultr account, payment method, domain purchase). This document provides a complete checklist so Travis doesn't have to research the steps from scratch during live setup. The architectural decisions are locked per Research #2 — this doc just operationalizes them._
