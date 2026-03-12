# Contributing to ArxMint

ArxMint is an open-source tool for deploying private Bitcoin circular economies. Contributions are welcome â€” especially from people building with Fedimint, Cashu, Lightning, or Silent Payments.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Docker (for regtest testing)
- Git

### Setup

```bash
git clone https://github.com/Traviseric/arxmint.git
cd arxmint
npm install
npm run setup:githooks
npm run dev
```

The app runs at `http://localhost:3000`.

### Build

```bash
npm run build
```

Must pass with 0 errors before submitting a PR.

## Project Structure

```
arxmint/
â”œâ”€â”€ app/            # Next.js 15 App Router pages
â”œâ”€â”€ components/     # React components (wallet, privacy, merchant, etc.)
â”œâ”€â”€ lib/            # Core SDK wrappers and business logic
â”‚   â”œâ”€â”€ fedimint-sdk.ts      # Fedimint client + gateway bridge
â”‚   â”œâ”€â”€ cashu-sdk.ts          # Cashu wallet + multi-mint + NUT-24/26
â”‚   â”œâ”€â”€ lightning-sdk.ts       # LNC-Web wrapper
â”‚   â”œâ”€â”€ spend-router.ts       # Privacy-aware payment routing
â”‚   â”œâ”€â”€ silent-payments.ts     # BIP-352 + BIP-392
â”‚   â”œâ”€â”€ community-generator.ts # Docker Compose generator
â”‚   â”œâ”€â”€ bce-metrics.ts         # Community health metrics
â”‚   â””â”€â”€ ...
â”œâ”€â”€ api/            # API route handlers
â”œâ”€â”€ docker/         # Docker configs for regtest
â”œâ”€â”€ docs/           # Documentation and blog posts
â”œâ”€â”€ tests/          # Test suite
â””â”€â”€ CLAUDE.md       # Agent onboarding (read this first)
```

## How to Contribute

### Issues

- Check existing issues before opening a new one
- Use clear titles: "NUT-24 paywall returns 500 on expired token" not "paywall broken"
- Include steps to reproduce, expected behavior, and actual behavior
- Label with appropriate tags: `bug`, `feature`, `docs`, `testing`

### Pull Requests

1. Fork the repo and create a branch from `master`
2. Name your branch descriptively: `fix/nut24-expired-token` or `feat/ark-vtxo-refresh`
3. Make focused changes â€” one PR per concern
4. Ensure `npm run build` passes with 0 errors
5. Add or update tests if your change affects behavior
6. Write a clear PR description explaining what and why

### Commit Messages

Use conventional format:

```
feat: add NUT-26 QR code generation for merchant POS
fix: handle expired Cashu tokens in paywall middleware
docs: add Fedimint guardian setup guide
test: add integration tests for spend router
refactor: split cashu-sdk into wallet and mint modules
```

### Code Style

- TypeScript strict mode
- Tailwind for styling (no CSS modules)
- `'use client'` directive required for any component using WASM (Fedimint, LNC-Web)
- No `any` types without a comment explaining why
- Prefer explicit types over inference for function signatures

## Areas Where Help is Needed

### Testing (High Priority)

- Integration tests for community generator output
- Regtest verification of Cashu mint/melt against real Nutshell
- NUT-24 paywall end-to-end test
- Fedimint invite code join flow test

### Documentation

- Deployment guides for different hosting providers
- Guardian onboarding walkthrough
- Merchant setup video/screenshots

### Upstream Contributions

We actively contribute to the projects we depend on. If you find issues in these libraries while working on ArxMint, please file upstream:

- [cashu-ts](https://github.com/cashubtc/cashu-ts) â€” TypeScript Cashu library
- [fedimint](https://github.com/fedimint/fedimint) â€” Federated ecash mint
- [cdk](https://github.com/cashubtc/cdk) â€” Cashu Development Kit
- [lnc-web](https://github.com/lightninglabs/lnc-web) â€” Lightning Node Connect

Track your upstream work in `docs/development/upstream-contributions.md`.

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --grep "spend-router"

# Run with coverage
npm test -- --coverage
```

### Regtest Testing

```bash
# Start regtest environment
cd docker && docker compose up -d

# Run integration tests against regtest
npm run test:integration
```

## License

MIT. By contributing, you agree that your contributions will be licensed under the same license.
