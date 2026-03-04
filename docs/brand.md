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

## Merchant Kit (Light Variant)

The default dark theme works for developers, crypto audiences, and the ArxMint website. But merchant-facing materials — signup pages, in-store signage, counter cards, window stickers — live in bright physical spaces (ice cream shops, farms, storefronts). The **Merchant Kit** is a light variant of the brand designed for these contexts.

### When to Use

| Context | Theme |
|---------|-------|
| ArxMint website (landing, docs, dashboard) | Dark (default) |
| `/merchants` signup page | **Merchant Light** |
| In-store signage, counter cards, window stickers | **Merchant Light** |
| Print materials for merchant outreach | **Merchant Light** |
| Developer docs, API reference | Dark (default) |
| Social media (general) | Dark (default) |
| Social media (merchant-targeted) | **Merchant Light** |

### Merchant Light Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-base` | `#fafafa` | Page background |
| `--bg-surface` | `#f5f5f5` | Section backgrounds |
| `--bg-elevated` | `#ffffff` | Cards, panels, form inputs |
| `--border-default` | `rgba(0,0,0,0.10)` | Card borders, dividers |
| `--border-strong` | `rgba(0,0,0,0.18)` | Emphasized borders |
| `--text-primary` | `#171717` | Headlines, body text |
| `--text-secondary` | `#525252` | Supporting text |
| `--text-muted` | `#737373` | Labels, captions |
| `--accent` | `#F7931A` | Same Bitcoin orange (anchor color) |

### Button Treatment

- **Primary CTA:** Orange background (`#F7931A`) + white text — not the inverted white-on-black of the dark theme
- **Outline:** Dark border + dark text on light background

### Voice Adjustments

The merchant kit voice stays direct but shifts from "fortress" to "local network":

| Dark Theme Voice | Merchant Kit Voice |
|------------------|--------------------|
| "Build the citadel." | "Join the network." |
| "Sovereign infrastructure" | "Zero-fee payments" |
| "Accept Bitcoin payments." | "Your customers pay. You keep 100%." |
| "Self-custody" | "Your money, instantly" |

### Implementation

Applied via `data-theme="merchant"` on the page root element. All existing utility classes and component classes automatically adapt — defined in `app/globals.css` under the `[data-theme="merchant"]` selector.

### Logo

The ArxMint logo should have a **dark variant** for use on light backgrounds (reversed from the standard light-on-dark). The orange accent mark stays orange in both versions.

---

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
