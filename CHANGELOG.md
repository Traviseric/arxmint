# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Escrow module (SPINE-ARX-02 Phase 1)
- Merchant payout automation (SPINE-ARX-03)
- PDF generation for org invoices (SPINE-ARX-01)
- Org invoice primitive
- Identity alias count exposed in /health endpoint
- DELETE /api/identity/unlink route + OpenAPI agent scope annotations
- Auto-link nostr ↔ teneo-auth identity on checkout (cross-auth)
- @te-btc/cashu-l402 swapped in (replaces inline cashu-paywall + l402 crypto)
- .env.template export to merchant setup wizard
- AGENTS.md entrypoint contract
- ROADMAP.md with sovereign stack SPINE items (ARX-01 through ARX-03)
- Packages/js and packages/react SDK contracts aligned with live server routes

### Changed
- Trimmed CLAUDE.md from 158 to 73 lines
- Reorganized docs into topic directories
- Documented ArxMint identity resolution responsibilities

### Fixed
- 3 failing CI checks (type-check, Docker, E2E)
- Mojibake Unicode symbols in README
- Merchant signup success message — no false promises
- Server-side id generation for merchant_pledges insert
- merchant_pledges remapped to snake_case columns matching Supabase
- defaultAmountSats type — null not assignable to number
- Phantom columns removed from merchant pledge insert/select
- Standalone output for Docker builds + lsp-bootstrap TS2365
- All remaining TS type errors in test files
- Migrations aligned to camelCase columns
- @te-btc/cashu-l402 file dependency removed (broke Vercel builds)
- Deployment errors — idempotent init migration, whitepaper path, webhook test types
- AnalyticsTab fake data replaced with real payments
