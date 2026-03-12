# Plan: Rebuild /create as Merchant Setup Wizard

## Problem
The /create page is a freeform community prompt generator (describe your community → get Docker YAML). The homepage now sells a merchant-first flow: "Accept Bitcoin Payments. Zero Fees." with a three-question wizard. The "Get Started" CTA leads to /create, which is misaligned.

## Approach
Replace the freeform prompt with a **step-by-step merchant onboarding wizard** that matches what the homepage promises. Keep the existing `community-generator.ts` backend — the wizard will call it with structured inputs instead of a freeform prompt.

## New /create Flow (3 steps + output)

### Step 1: Business Info
- **Store Name** (text input, required)
- **Domain** (text input, optional — e.g. `pay.longmontcoffee.com`)
- **Network** (testnet/signet/mainnet toggle — default testnet)

### Step 2: Payment Methods
- **Lightning** (toggle, default ON)
- **Ecash (Cashu)** (toggle, default ON)
- **On-chain** (toggle, default OFF)
- Brief explanation under each option

### Step 3: Review & Generate
- Summary card showing selections
- "Deploy My Node" button → calls the existing `/api/community` endpoint with a structured prompt built from wizard inputs
- Shows the generated Docker Compose, setup instructions, and L402 endpoints (reuses the existing collapsible output sections)

## Files Changed

1. **`app/create/page.tsx`** — Update heading copy from "Forge your sovereign community" to merchant-focused language ("Set Up Your Payment Node")
2. **`components/create-community-form.tsx`** — Full rewrite: replace textarea + example prompts with 3-step wizard. Reuse the CollapsibleSection component and output display from the existing file. Build a structured prompt string from wizard inputs to feed the existing `POST /api/community` endpoint.

## What Stays
- `lib/community-generator.ts` — unchanged, receives a prompt string
- `app/api/community/route.ts` — unchanged, same endpoint
- `lib/types.ts` — unchanged
- Output display (Docker Compose, Aperture config, L402 endpoints, setup instructions) — migrated from current form component
- CollapsibleSection subcomponent — kept as-is

## What's Removed
- Freeform textarea
- Example prompt pills
- "Describe your sovereign community" language

## Design
- Same dark theme, glass-heavy cards, accent colors
- Step indicator bar at top (1 → 2 → 3)
- Each step in its own card
- Matches the existing component style (antigravity-btn, glass, glow-card)
