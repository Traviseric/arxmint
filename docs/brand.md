# ArxMint — Brand Guide

## Name

**ArxMint** — Arx (Latin for citadel, fortress) + Mint (ecash mint). The name conveys sovereign protection over private money.

## Taglines

- "Accept Bitcoin payments. Zero fees. No middleman."
- "Build the citadel."

## Voice

- **Confident builder.** We ship infrastructure, not vaporware.
- **Direct over clever.** Say what it does. Skip the wordplay.
- **Protective over aggressive.** Fortress energy, not attack posture.

## Visual Theme

- **Palette:** Dark, minimal. Black backgrounds (`#0a0a0a`), Bitcoin orange accents (`#F7931A`).
- **Energy:** Fortress, cathedral arches, vault geometry.
- **Typography:** Monospace for code/data, clean sans-serif for UI.

## Color Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| `btc-orange` | `#F7931A` | Primary accent, CTAs, highlights |
| `sovereign-dark` | `#0a0a0a` | Page background |
| `sovereign-panel` | `#111111` | Card/panel backgrounds |
| `sovereign-text` | `#e5e5e5` | Primary text |
| `sovereign-muted` | `#737373` | Secondary text, labels |

## CSS Classes

Defined in `app/globals.css`:
- `.sovereign-card` — Panel container with dark bg + border
- `.sovereign-btn` — Primary button (orange)
- `.sovereign-btn-outline` — Outline variant
- `.sovereign-input` — Form inputs (dark bg)

## Audience

- **Bitcoiners** building circular economies for communities
- **AI agent developers** who need private commerce rails (L402, ecash)
- **Privacy advocates** who want ecash + federation defaults out of the box
- **Grant applicants** (OpenSats, HRF) building sovereignty tools

## Positioning

### The Integration Layer

OpenSats funds Cashu TS, CDK, Nutshell, Fedimint, and Coco as individual tools. HRF funds Cashu, KVAC, Fedimint contributors, and Bitsacco. Spiral funds LDK, BDK, and core protocol work.

**ArxMint is the integration layer.** It makes these funded tools work together as a single deployable system. More ArxMint deployments = more real-world users for every ecash and federation project in the ecosystem.

This isn't a competitor to any funded project — it's the multiplier that turns library downloads into running community economies.

### Key Positioning Angles

| Audience | Lead With |
|----------|-----------|
| **OpenSats / Spiral** | Integration layer for tools you already fund. More deployments = more users for Cashu TS, CDK, Nutshell, Fedimint. |
| **HRF** | Censorship-resistant community finance. Ecash eliminates surveillance. Fedimint distributes custody. Silent Payments prevent address reuse. All deployable from one prompt. |
| **Maelstrom** | Bitcoin resilience and privacy infrastructure. Federation model + ecash = no single point of failure or surveillance. |
| **FBCE** | "BCE in a box" replication toolkit. Longmont pilot proves the model. Playbook lets any community copy it. |
| **AI/Agent devs** | Bearer payment instruments for machines. L402 + ecash paywalls. Ephemeral wallets with TTL. No identity, no accounts, no custody. |
| **Bitcoin community** | Your community's private payment system in one afternoon. Docker compose up. No permission needed. |

### What ArxMint Is Not

- Not a custodial service (everything is self-hosted)
- Not a new protocol (integrates existing ones: Fedimint, Cashu, Lightning, Silent Payments)
- Not a wallet app (it's infrastructure tooling that generates deployments)
- Not competing with Fedi, Minibits, or Nutstash (those are end-user wallets; ArxMint deploys the backend they connect to)
