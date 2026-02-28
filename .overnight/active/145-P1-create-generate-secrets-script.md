---
id: 145
title: "Create scripts/generate-secrets.sh (one-command secret generation)"
priority: P1
severity: high
status: completed
source: human_tasks_switch_blocked
file: scripts/generate-secrets.sh
created: "2026-02-28T16:00:00Z"
execution_hint: parallel
context_group: deploy_prep
group_reason: "Infrastructure preparation tasks alongside 146 and 147"
---

# Create scripts/generate-secrets.sh (one-command secret generation)

**Priority:** P1 (high)
**Source:** human_tasks.md — Credential & Infrastructure Setup section
**Location:** scripts/generate-secrets.sh (new file)

## Problem

ArxMint production deployment requires four secrets that must be generated securely before launch:
- `NEXTAUTH_SECRET` — Auth.js session encryption (`openssl rand -base64 32`)
- `MACAROON_ROOT_KEY` — L402 macaroon signing (`openssl rand -hex 32`)
- `CASHU_PRIVATE_KEY` — Cashu mint private key (`openssl rand -hex 32`)
- `GRAFANA_PASSWORD` — Monitoring dashboard password (human-chosen or generated)

Currently there is no script for this. Travis must remember four separate commands and manually add them to `.env`. The risk is using placeholder keys (e.g., the `deadbeef` test key in `.env.example`) in production by mistake.

The existing scripts in `scripts/` follow a consistent style: `#!/usr/bin/env bash`, `set -euo pipefail`, banner output, and clear status messages. A `generate-secrets.sh` script fits naturally alongside `setup-federation.sh`, `backup_postgres.sh`, etc.

## How to Fix

Create `scripts/generate-secrets.sh` with the following behavior:

1. **Banner** — Print ArxMint branding header (match style of `scripts/setup-federation.sh`)
2. **Safety check** — If `.env` already exists, warn and ask for confirmation before overwriting. Provide a `--force` flag to skip the prompt.
3. **Generate secrets** — Use `openssl rand` to generate all four values:
   ```bash
   NEXTAUTH_SECRET=$(openssl rand -base64 32)
   MACAROON_ROOT_KEY=$(openssl rand -hex 32)
   CASHU_PRIVATE_KEY=$(openssl rand -hex 32)
   GRAFANA_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 20)
   ```
4. **Write to .env** — Append generated values to `.env` (or create it from `.env.example` if it doesn't exist). Use `sed` to replace placeholder values if `.env.example` already has the keys.
5. **Display summary** — Print each key name and a masked value (show first 4 chars + `****`) so the human can confirm generation without exposing full secrets.
6. **Reminder** — Print a reminder: "Save these secrets securely. Losing them means wallet recovery is impossible. Back up .env to an offline location."
7. **Never echo full secret values** to stdout (security best practice).
8. **Add executable permission** — Ensure `chmod +x scripts/generate-secrets.sh`.

The script must NOT generate `LND_SEED` — that must be created via `docker exec sf-lnd lncli create` after the stack is running (cannot be automated safely).

## Acceptance Criteria

- [ ] `scripts/generate-secrets.sh` created and executable
- [ ] Script generates all 4 secrets using `openssl rand`
- [ ] Safety check prevents accidental `.env` overwrite without `--force`
- [ ] Full secret values are NOT echoed to stdout (only masked preview)
- [ ] `.env` is updated with generated values
- [ ] Reminder about offline backup is printed
- [ ] Script follows same style/conventions as `scripts/setup-federation.sh`

## Notes

_Generated from human_tasks.md switch-blocked items. This prep script allows Travis to run one command instead of four manual `openssl` commands when setting up production. The script does NOT provision the VPS or deploy — it only generates `.env` secrets. LND seed generation remains human-only._
