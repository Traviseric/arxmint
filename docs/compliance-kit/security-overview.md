# ArxMint Security Overview

**For IT and Security Review Teams**
**Version:** 1.0 | **Date:** March 2026

> This document provides a technical security overview for merchants, enterprise customers, and their IT/security review teams. It covers architecture, data flows, authentication, encryption, and planned security activities. For legal questions, see the [Legal Position Paper](./legal-position-paper.md).

---

## 1. Architecture Overview

ArxMint is a **self-hosted, split-plane payment infrastructure**. The merchant owns and operates their own node. ArxMint (the software company) does not operate infrastructure through which merchant funds or customer data pass.

### Components

```
Customer Browser
      â”‚
      â”‚ HTTPS (TLS 1.3)
      â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚              Merchant Server (self-hosted)       â”‚
â”‚                                                  â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚  Caddy   â”‚    â”‚ ArxMint  â”‚   â”‚    LND     â”‚  â”‚
â”‚  â”‚ (TLS     â”‚â”€â”€â”€â–¶â”‚ (Next.js â”‚â”€â”€â–¶â”‚ (Lightning â”‚  â”‚
â”‚  â”‚ termina- â”‚    â”‚  app)    â”‚   â”‚  node)     â”‚  â”‚
â”‚  â”‚ tion)    â”‚    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â””â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜          â”‚             â”‚          â”‚
â”‚                        â–¼             â”‚          â”‚
â”‚                  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”        â”‚          â”‚
â”‚                  â”‚ Cashu /  â”‚        â”‚          â”‚
â”‚                  â”‚Fedimint  â”‚â—€â”€â”€â”€â”€â”€â”€â”€â”˜          â”‚
â”‚                  â”‚  Mint    â”‚                   â”‚
â”‚                  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                   â”‚
â”‚                                                  â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                   â”‚
â”‚  â”‚Prometheusâ”‚    â”‚ Grafana  â”‚ (admin only)       â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
      â”‚
      â”‚ Lightning P2P (port 9735)
      â–¼
Bitcoin Lightning Network
```

### Split-Plane Trust Boundary

| Plane | Owner | Contents | ArxMint access |
|-------|-------|---------|----------------|
| **Data plane** | Merchant | Keys, funds, LND, mint database, customer data | None |
| **Control plane** | ArxMint | Provisioning, DNS, software updates | Configuration only |

ArxMint never has access to merchant private keys, wallet seeds, or funds.

---

## 2. Network Security

### Public Ports (exposed to internet)

| Port | Service | Protocol | Purpose |
|------|---------|---------|---------|
| 443 | Caddy | HTTPS/TLS 1.3 | Checkout pages, API endpoints |
| 80 | Caddy | HTTP (redirects to 443) | TLS redirect |
| 9735 | LND | TCP | Lightning peer-to-peer connections |

### Internal-Only Ports (never exposed publicly)

| Port | Service | Purpose |
|------|---------|---------|
| 10009 | LND gRPC | Node management (Docker internal only) |
| 3338 | Cashu mint | Mint admin API (Docker internal only) |
| 5432 | PostgreSQL | Database (Docker internal only) |
| 9090 | Prometheus | Metrics (restrict to admin IP) |
| 3001 | Grafana | Dashboards (restrict to admin IP) |

Docker Compose uses an internal bridge network. Only Caddy binds to public ports. All other services are unreachable from the internet by default.

### TLS Configuration

- **Protocol:** TLS 1.3 (TLS 1.2 as fallback)
- **Certificates:** Let's Encrypt via Caddy ACME (auto-renewed)
- **HSTS:** Enabled with 1-year max-age
- **Certificate transparency:** Required (CT logs)

---

## 3. Authentication

### Merchant Authentication: Nostr NIP-98

ArxMint uses **Nostr NIP-98** for admin authentication â€” cryptographic key-based auth with no passwords.

**Token format:** HMAC-SHA256 signed session token
```
pubkey_hex.expiry_unix.hmac_sha256_sig
```

**Properties:**
- Self-verifying â€” no database lookup required
- Stateless â€” no server-side session storage
- 7-day TTL with timing-safe comparison
- Signed with `NEXTAUTH_SECRET` (operator-configured)
- HttpOnly cookie â€” not accessible to JavaScript

### API Key Authentication

Merchant API keys use prefixed formats for easy identification:

| Prefix | Scope | Usage |
|--------|-------|-------|
| `arx_live_` | Full API access | Server-side only |
| `arx_pub_` | Invoice creation only | Safe for client-side |
| `arx_test_` | Testnet sandbox | Development only |

Keys are stored as HMAC-SHA256 hashes â€” the plaintext key is shown only at creation time.

### Agent Authentication: L402 Macaroons

AI agent access uses **L402 (Lightning Authorization)** with scoped macaroons:

| Tier | Scope | Capability |
|------|-------|-----------|
| Watch-only | Read metrics, check status | No spending |
| Invoice-only | Create invoices | Cannot send payments |
| Pay-limited | Send up to configured cap | No admin access |
| Admin | Full access | Requires hardware key |

Macaroon caveats enforce capability bounds at the cryptographic level.

---

## 4. Data Flow: What Data Goes Where

### Customer Payment Flow

```
1. Customer opens checkout page â†’ Caddy â†’ ArxMint app
   Data: No customer data at this point

2. Customer chooses amount â†’ ArxMint creates Lightning invoice
   Data: Amount in sats (no customer identity)

3. LND generates invoice (BOLT11 string)
   Data: Payment hash, amount, expiry â€” no customer PII

4. Customer scans QR â†’ pays with their Lightning wallet
   Data: Payment traverses Lightning Network (pseudonymous)

5. LND detects payment â†’ ArxMint marks session paid
   Data: Payment preimage stored locally (proves settlement)

6. Webhook fires to merchant's fulfillment system
   Data: sessionId, amountSats, paidAt â€” no customer PII
```

**PII collected:** None by default. Optional email/shipping address collected only if merchant enables it, stored only on merchant's own server.

### Supabase (Optional Cloud Database)

When using the Supabase-hosted database option:
- Stores: community configs, merchant pledges, transaction ledger entries
- Does NOT store: private keys, wallet seeds, ecash proofs, Lightning channel data
- Data location: Supabase region selected at account creation (US or EU available)
- Encryption: AES-256 at rest, TLS in transit (Supabase default)

Self-hosted PostgreSQL (via Docker Compose) keeps all data on the merchant's own server.

---

## 5. Cryptographic Standards

| Component | Algorithm | Standard |
|-----------|-----------|---------|
| TLS | TLS 1.3 with X25519 key exchange | IETF RFC 8446 |
| Session tokens | HMAC-SHA256 | FIPS 198-1 |
| Lightning invoices | secp256k1 ECDSA | BOLT11 |
| Ecash blinding | Chaumian blind signatures | Cashu NUT specifications |
| Cashu proof ECDH | secp256k1 | BIP-340 / NUT-00 |
| Fedimint threshold | FROST threshold signatures | Fedimint protocol |
| Client-side vault | AES-256-GCM + PBKDF2-SHA256 | NIST SP 800-132 |
| Webhook signatures | HMAC-SHA256 | Industry standard |
| API key hashing | HMAC-SHA256 | FIPS 198-1 |

---

## 6. Encryption

### Data at Rest

| Data | Encryption | Location |
|------|-----------|---------|
| LND wallet (private keys) | AES-256 (wallet password) | Merchant server |
| Cashu mint keys | Encrypted at rest (mint DB) | Merchant server |
| PostgreSQL database | AES-256 (tablespace encryption or Supabase) | Merchant or Supabase |
| Client-side ecash proofs | AES-256-GCM (browser IndexedDB vault) | User's browser |
| PBKDF2 iterations | 600,000 (OWASP recommended) | Client-side |

LND wallet encryption key is the **wallet unlock password** â€” set by the merchant operator and never transmitted to ArxMint.

### Data in Transit

- All external traffic: TLS 1.3 (enforced by Caddy)
- Internal Docker network: plaintext (isolated to localhost; no external exposure)
- LND gRPC: mTLS (client certificate required for remote access if enabled)

---

## 7. Backup and Recovery

### What Gets Backed Up

| Component | Backup method | Criticality |
|-----------|--------------|------------|
| LND static channel backup (SCB) | Automated daily export | **Critical** â€” losing this risks channel funds |
| LND wallet seed | Written down at setup (24 words) | **Critical** â€” recovery of on-chain funds |
| Cashu mint database | Docker volume backup | High â€” losing this breaks ecash redemptions |
| Fedimint guardian state | Per-guardian backup | High â€” needed for DKG participation |
| ArxMint database | Supabase point-in-time recovery or pg_dump | Medium |

### Recovery Procedures

See [docs/deployment/restore.md](../deployment/restore.md) for step-by-step recovery procedures.

**RTO (Recovery Time Objective):** 2â€“4 hours for full stack recovery from backup
**RPO (Recovery Point Objective):** 24 hours (daily backup cadence)

### Encrypted Backup Engine

ArxMint supports **zero-knowledge encrypted backups**: backup archives are encrypted with the merchant's own key before upload. ArxMint cannot decrypt backup content even with bucket access.

---

## 8. Vulnerability Management

### Dependency Security

- Node.js dependencies: audited via `npm audit` in CI on every commit
- Docker base images: Renovate Bot or Dependabot for automated update PRs
- LND/Fedimint/CDK: version-pinned with manual review before upgrades

### Responsible Disclosure

Security vulnerabilities should be reported to **travis@arxmint.com** with:
- Description of the vulnerability
- Steps to reproduce
- Affected component and version

We aim to acknowledge reports within 48 hours and provide a fix timeline within 7 days for critical issues.

### Planned Security Activities

| Activity | Timeline | Status |
|----------|---------|--------|
| External penetration test | Roadmap 6.1 | Planned (budget allocated) |
| Bug bounty program | Post-audit | Planned |
| SOC 2 Type I | Enterprise phase | Future |

---

## 9. PCI-DSS Scope Analysis

**Bitcoin Lightning is NOT in PCI-DSS scope.**

PCI-DSS applies to systems that store, process, or transmit **cardholder data** (credit/debit card numbers, CVV, PINs, etc.). Bitcoin Lightning payments:

- Do not involve card numbers, CVV codes, or bank account numbers
- Are not issued or processed by a card network (Visa, Mastercard, etc.)
- Do not fall under any PCI Council definition of "cardholder data"

Merchants using ArxMint for Bitcoin-only payments have **zero PCI-DSS obligations** related to those Bitcoin transactions. If you also accept cards (via a separate system), PCI-DSS applies to the card system only.

---

## 10. Compliance Framework Summary

| Framework | Applicability | ArxMint Position |
|-----------|-------------|-----------------|
| PCI-DSS | Not applicable | Bitcoin not in scope |
| GDPR | Applicable if collecting EU customer PII | Minimal PII by design; merchant is data controller |
| CCPA | Applicable to CA merchants | Pseudonymous payments; low PII footprint |
| SOX | Not applicable | Not a public company |
| ISO 27001 | Not certified (planned) | Security practices aligned |
| NIST CSF | Reference standard | Architecture follows CSF principles |

---

*This document is provided for IT review purposes. For a compliance review call, contact [travis@arxmint.com](mailto:travis@arxmint.com).*
