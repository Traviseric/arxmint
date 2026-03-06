import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Shield,
  Wrench,
  Layers,
  Sparkles,
  Castle,
  Store,
  Lock,
  Github,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/scroll-reveal";

export const metadata = {
  title: "Roadmap — Sovereign Payment Network",
  description:
    "Current roadmap synced to the live codebase: NUC testnet deployment, live merchant prototypes, and the path from checkout prototype to sovereign merchant node.",
};

const currentState = [
  "TE NUC testnet deployment is running; first real end-to-end payment is the next gate.",
  "2 live merchants are on the public directory: Glacier and Teneo.",
  "13 ecosystem merchants are in the admin-only pipeline with generated logos.",
  "Prototype merchant surfaces are live: /pay, /badge, and the /create beta wizard.",
];

type RoadmapStatus = "done" | "current" | "pending";

type RoadmapTask = {
  id: string;
  title: string;
  humanTitle: string;
  description: string;
  status: RoadmapStatus;
};

type RoadmapPhase = {
  number: number;
  codename: string;
  title: string;
  status: RoadmapStatus;
  icon: LucideIcon;
  description: string;
  humanDescription: string;
  timeline: string;
  tasks: RoadmapTask[];
};

const phases: RoadmapPhase[] = [
  {
    number: 0,
    codename: "Fortify",
    title: "Security Hardening",
    status: "done" as const,
    icon: Shield,
    description:
      "All P0 security controls shipped and tested. Keyset validation, security tiers, and remote signer config complete.",
    humanDescription: "your sats and data are protected before anything else gets built",
    timeline: "Complete",
    tasks: [
      {
        id: "0.1",
        title: "Cashu keyset ID validation",
        humanTitle: "Verify your mint is who it says it is",
        description:
          "Verify keyset IDs against mint pubkeys. Prevent NUT-13 deterministic secret collisions — critical for agent wallets.",
        status: "done" as const,
      },
      {
        id: "0.2",
        title: "Fix Silent Payments status",
        humanTitle: "Honest reporting of what's available on each backend",
        description:
          "Honest per-backend SP availability. SP for Fedimint peg-outs requires a federation module (server-side).",
        status: "done" as const,
      },
      {
        id: "0.3",
        title: "Lightning agent security tiers",
        humanTitle: "Agents get the minimum access they need, nothing more",
        description:
          "WATCH_ONLY → PAY_ONLY → ADMIN tiers. Agents default to WATCH_ONLY. Never give agents admin macaroons.",
        status: "done" as const,
      },
      {
        id: "0.4",
        title: "Remote signer integration",
        humanTitle: "Agent processes never hold signing keys",
        description:
          "Signer config and fail-closed validation are shipped. Full isolated signer transport remains to be finalized.",
        status: "current" as const,
      },
    ],
  },
  {
    number: 1,
    codename: "Keystone",
    title: "Core Architecture",
    status: "done" as const,
    icon: Wrench,
    description:
      "Core architecture complete: spend routing, merchant onboarding, BCE metrics, NUT-24 paywalls, and scoped agent controls.",
    humanDescription: "merchants can accept payments, wallet auto-picks best way to pay",
    timeline: "Complete",
    tasks: [
      {
        id: "1.1",
        title: "NUT-24 ecash paywalls",
        humanTitle: "Pay for services with ecash, not just Lightning",
        description: "Dual L402 + Cashu flows are implemented; strict production enforcement and deeper testing are still being hardened.",
        status: "current" as const,
      },
      {
        id: "1.2",
        title: "Spend router",
        humanTitle: "Auto-pick the cheapest, most private way to pay",
        description: "Auto-select ecash → Lightning → Ark → on-chain based on amount and privacy score.",
        status: "done" as const,
      },
      {
        id: "1.3",
        title: "BCE metrics dashboard",
        humanTitle: "Real numbers showing community health",
        description: "Merchant count, active spenders, spend velocity, grant-ready export.",
        status: "done" as const,
      },
      {
        id: "1.4",
        title: "Merchant onboarding",
        humanTitle: "Step-by-step setup for any local business",
        description: "Multi-step form, QR codes, POS guidance, directory listings.",
        status: "done" as const,
      },
      {
        id: "1.5",
        title: "Macaroon bakery",
        humanTitle: "Generate limited-permission keys for different roles",
        description: "Generate scoped credentials: pay-only, invoice-only, read-only, agent-commerce.",
        status: "done" as const,
      },
      {
        id: "1.6",
        title: "Ephemeral agent wallets",
        humanTitle: "Temporary wallets that clean up after themselves",
        description: "In-memory, auto-expire, scoped. No persistent secrets.",
        status: "done" as const,
      },
      {
        id: "1.7",
        title: "G-Bot integration",
        humanTitle: "Guided federation setup, no DevOps required",
        description: "Fedimint G-Bot API for guided federation bootstrap with Docker fallback.",
        status: "done" as const,
      },
      {
        id: "1.8",
        title: "Nostr login (NIP-07)",
        humanTitle: "Sign in with your Nostr identity — no passwords, no database",
        description: "NIP-07 browser extension auth (Alby, nos2x). Session persists via localStorage. NIP-98 HTTP auth utilities for future API protection.",
        status: "done" as const,
      },
    ],
  },
  {
    number: 2,
    codename: "Spire",
    title: "Full Privacy + Commerce",
    status: "done" as const,
    icon: Layers,
    description:
      "Privacy and commerce stack complete: Fedimint v0.10, NUT-26 QR payments, monitoring, gateway bridge. Ark and CDK remain upstream-blocked.",
    humanDescription: "ecash across multiple mints, tap-to-pay, real-time monitoring",
    timeline: "Complete",
    tasks: [
      {
        id: "2.1",
        title: "Fedimint v0.10.0 upgrade",
        humanTitle: "Latest security and performance improvements",
        description: 'Generator paths target "Lighthouse" v0.10.0; root local compose still needs full parity.',
        status: "current" as const,
      },
      {
        id: "2.2",
        title: "Ark SDK integration",
        humanTitle: "High-privacy off-chain spending layer",
        description: "SovereignArkClient interface exists with stub-mode behavior pending full upstream integration.",
        status: "current" as const,
      },
      {
        id: "2.3",
        title: "CDK cloud-native mint",
        humanTitle: "Production-grade mint with real database and monitoring",
        description: "CDK generation path exists; default local stack still uses Nutshell for quick start.",
        status: "current" as const,
      },
      {
        id: "2.4",
        title: "Multi-mint support (Coco)",
        humanTitle: "Spread trust across multiple ecash providers",
        description: "Manager and swap scaffolding are in place; operational hardening and broader coverage continue.",
        status: "current" as const,
      },
      {
        id: "2.5",
        title: "NUT-26 QR/NFC payments",
        humanTitle: "Scan or tap to pay, just like a credit card",
        description: "cashu:// URI format for merchant QR codes and payment requests.",
        status: "done" as const,
      },
      {
        id: "2.6",
        title: "Silent Payments infrastructure",
        humanTitle: "Receive Bitcoin without reusing addresses",
        description: "Scanner/indexer/key-delegation scaffolding is implemented with remaining protocol-level hardening.",
        status: "current" as const,
      },
      {
        id: "2.7",
        title: "Monitoring stack",
        humanTitle: "Real-time health dashboards for community operators",
        description: "Prometheus/Grafana generation is implemented; deployment parity across all compose paths is ongoing.",
        status: "current" as const,
      },
      {
        id: "2.8",
        title: "Gateway bridge",
        humanTitle: "Ecash automatically converts to Lightning when needed",
        description: "Bridge flow is implemented with placeholder preimage handling pending final production wiring.",
        status: "current" as const,
      },
    ],
  },
  {
    number: 3,
    codename: "Aether",
    title: "Advanced Features",
    status: "pending" as const,
    icon: Sparkles,
    description:
      "Advanced capabilities are in experimental groundwork mode and depend on upstream protocol maturity for production use.",
    humanDescription: "programmable payments, hardware wallet support, tap-to-pay",
    timeline: "Research / Prototype",
    tasks: [
      {
        id: "3.1",
        title: "Guardian governance",
        humanTitle: "Rules for who runs the shared vault and how",
        description: "Selection criteria, rotation policy, incident response, quorum management.",
        status: "current" as const,
      },
      {
        id: "3.2",
        title: "Programmable eCash (STARK)",
        humanTitle: "Smart contracts for ecash — escrow, subscriptions, automated payments",
        description: "Conditional tokens: escrow, subscriptions, proof-of-service.",
        status: "current" as const,
      },
      {
        id: "3.3",
        title: "ZK verified reissuance",
        humanTitle: "Cryptographic proof that agent wallets are honest",
        description: "Audit-log + ZK reissuance for stateless agent wallets.",
        status: "current" as const,
      },
      {
        id: "3.4",
        title: "Hardware wallet (BIP392)",
        humanTitle: "Sign transactions with your hardware device",
        description: "SP descriptor support and PSBT spending for hardware signing devices.",
        status: "current" as const,
      },
      {
        id: "3.5",
        title: "Advanced Cashu (NUT-28)",
        humanTitle: "Multi-mint atomic swaps and proof verification",
        description: "P2BK, background proof state verification, multi-mint atomic swaps.",
        status: "current" as const,
      },
      {
        id: "3.6",
        title: "Numo NFC merchant integration",
        humanTitle: "Tap your card to pay at any merchant",
        description: "Tap-to-pay for merchants using Numo NFC cards.",
        status: "current" as const,
      },
    ],
  },
  {
    number: 4,
    codename: "Citadel",
    title: "Production + Grants",
    status: "current" as const,
    icon: Castle,
    description:
      "Pilot track is live: TE NUC testnet deployment is running, the public merchant directory is up, and grant/KPI materials are ready. The main remaining gate is the first verified end-to-end real payment.",
    humanDescription: "real merchants, real payments, real sats changing hands",
    timeline: "In Progress",
    tasks: [
      {
        id: "4.1",
        title: "Longmont pilot deployment",
        humanTitle: "Real businesses, real customers, real sats changing hands",
        description: "Directory is live, checkout prototypes are live, and the NUC testnet stack is running. Next: first real testnet payment, ops verification, and merchant activation flow.",
        status: "current" as const,
      },
      {
        id: "4.2",
        title: "Grant applications",
        humanTitle: "Funding to scale from pilot to production",
        description: "FBCE, OpenSats, and Fedi application templates and workflow support.",
        status: "current" as const,
      },
      {
        id: "4.3",
        title: "Grant reporting dashboard",
        humanTitle: "Transparent progress tracking for funders",
        description: "Export monthly/quarterly KPI snapshots and reporting artifacts.",
        status: "current" as const,
      },
      {
        id: "4.4",
        title: "Replication playbook",
        humanTitle: "Step-by-step guide for any community to copy this",
        description: 'Open-source "BCE in a box" playbook generated from pilot configuration.',
        status: "current" as const,
      },
      {
        id: "4.5",
        title: "Multi-city federation",
        humanTitle: "Connect Longmont to other cities on the same rails",
        description: "Expand pilot model into multi-city commerce via multi-mint and Lightning bridge routes.",
        status: "pending" as const,
      },
    ],
  },
  {
    number: 5,
    codename: "Bazaar",
    title: "Decentralized Merchant Platform",
    status: "current" as const,
    icon: Store,
    description:
      "Early Bazaar-adjacent prototypes are live now: merchant directory, checkout pages, merchant badge kit, and a beta merchant setup wizard. The remaining work is converting those centralized prototypes into the self-hosted, non-custodial merchant-node architecture.",
    humanDescription: "any merchant runs their own payment node — zero fees, zero middlemen",
    timeline: "Prototype / Build-out",
    tasks: [
      {
        id: "5.1",
        title: "Local auth tokens + scoped macaroons",
        humanTitle: "Your node, your keys — programmatic access with sandbox mode",
        description: "L402 macaroon-based auth tokens generated on the merchant's own node. Scoped permissions (read/invoice/pay/admin), key rotation, rate limits. Non-custodial by design.",
        status: "pending" as const,
      },
      {
        id: "5.2",
        title: "Webhook engine (local)",
        humanTitle: "Get notified instantly when a customer pays — on your own infrastructure",
        description: "Webhook engine runs on the merchant's node, watching their own LND/Cashu for invoice settlements. HMAC-SHA256 signed payloads, exponential backoff retry, delivery logs.",
        status: "pending" as const,
      },
      {
        id: "5.3",
        title: "Self-hosted checkout page",
        humanTitle: "A payment link on your own domain — no code required",
        description: "Prototype is live at /pay/[merchant-id] using /api/checkout, but it is still centralized, Lightning-only, poll-based, and demo-capable. Next step: merchant-local invoices, Cashu QR, and real-time updates.",
        status: "current" as const,
      },
      {
        id: "5.4",
        title: "Payment status API + real-time updates",
        humanTitle: "Know exactly when your customer paid",
        description: "Prototype status polling already exists for checkout sessions. Next step: merchant-local /api/v1/payments, deterministic state model, and SSE status_changed events.",
        status: "current" as const,
      },
      {
        id: "5.5",
        title: "Client-side SDK + React components",
        humanTitle: "Add payments to any website in 10 lines of code",
        description: "@arxmint/js and @arxmint/react — connects to the merchant's own endpoint, not a central server. PayButton, CheckoutForm, QRPayment components.",
        status: "pending" as const,
      },
      {
        id: "5.6",
        title: "LNURL-pay + Lightning Address",
        humanTitle: "name@pay.merchant.com — scan and pay at any register",
        description: "Lightning Address and LNURL-pay served from the merchant's own domain. Static QR codes for POS. NFC tag provisioning via Numo. No intermediary.",
        status: "pending" as const,
      },
      {
        id: "5.7",
        title: "Merchant dashboard (self-hosted)",
        humanTitle: "See every payment, manage your node, track your revenue",
        description: "Self-hosted dashboard with payments, analytics, auth token management, webhook config, node status. No data leaves the merchant's infrastructure.",
        status: "pending" as const,
      },
      {
        id: "5.8",
        title: "Merchant deploy wizard",
        humanTitle: "Three questions, fifteen minutes — your payment node is live",
        description: "/create already presents the merchant-first beta wizard shell. Next step: turn it into a real merchant init/export/provision path instead of a coming-soon funnel.",
        status: "current" as const,
      },
      {
        id: "5.9",
        title: "Public merchant directory",
        humanTitle: "Customers find you — searchable by category and location",
        description: "Live now at /merchants with 2 public merchants, 13 admin-only pipeline merchants, signup form, checkout links, and badge CTA. Next step: search, activation workflow, referral attribution, and cleaner public/live semantics.",
        status: "current" as const,
      },
      {
        id: "5.10",
        title: "Idempotency + production hardening",
        humanTitle: "No double charges, no duplicate records, hardened for the open internet",
        description: "Idempotency-Key header on all payment endpoints. Structured error codes. Caddy auto-HTTPS, CSP headers, rate limiting, firewall rules generated by setup wizard.",
        status: "pending" as const,
      },
      {
        id: "5.11",
        title: "Merchant node lifecycle",
        humanTitle: "Updates, backups, and disaster recovery — handled automatically",
        description: "Three sub-systems: (a) Appliance update engine — signed stack BOMs with auto-rollback on failed health checks, canary rings for staged rollout. (b) Zero-knowledge encrypted backups — LND SCB event-driven on every channel change, Cashu mint DB encrypted with seed-derived key, automated restore rehearsal. (c) One-click restore — fresh host + seed phrase = full recovery.",
        status: "pending" as const,
      },
      {
        id: "5.12",
        title: "Home node packaging (Umbrel + StartOS)",
        humanTitle: "One-click install from your home node app store",
        description: "Package the merchant stack for Umbrel and StartOS app stores. Umbrel is the fastest target — Docker Compose maps directly to its packaging format. Checkout endpoints public via App Proxy, admin behind Umbrel auth. StartOS as secondary with richer ops UX.",
        status: "pending" as const,
      },
      {
        id: "5.13",
        title: "Mobile merchant remote control",
        humanTitle: "Manage your node from your phone — the VPS is invisible",
        description: "React Native app as remote control for the merchant's VPS node. POS terminal, QR generation, daily sales, push notifications on invoice settlement. Wallet unlock via push notification (non-custodial — secret goes to node, never ArxMint). Near-term: PWA dashboard (5.7) covers 80%. Lite mode: LDK on mobile via Breez SDK for pop-up shops — no VPS needed.",
        status: "pending" as const,
      },
    ],
  },
];

function StatusIcon({ status }: { status: "done" | "current" | "pending" }) {
  if (status === "done")
    return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  if (status === "current")
    return <Clock className="w-4 h-4 text-accent animate-pulse" />;
  return <Circle className="w-4 h-4 text-border-strong" />;
}

export default function RoadmapPage() {
  return (
    <div className="relative bg-bg-base text-text-primary overflow-x-hidden selection:bg-accent/30">

      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-[100vh] z-0 pointer-events-none origin-top overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/roadmap_bg.png')] bg-cover bg-center bg-no-repeat opacity-10" />
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] rounded-full bg-accent/5 blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-[size:32px_32px] opacity-[0.03]" />
        <div className="absolute inset-0 bg-gradient-to-b from-bg-base/50 via-bg-base/80 to-bg-base" />
      </div>

      <div className="relative z-10 w-full">
        {/* Whitepaper Header */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-12 font-mono">
          <ScrollReveal>
            <div className="border-b-2 border-text-primary pb-8 mb-8 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-3xl rounded-full" />
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-text-primary mb-6 uppercase !font-sans flex items-center gap-4">
                <img
                  src="/images/nav-logo-b.svg"
                  alt="ArxMint Citadel Logo"
                  className="w-12 h-12 rounded-lg"
                />
                ArxMint: Sovereign Payment Network Specification
              </h1>
              <div className="flex justify-between items-end text-xs text-text-secondary uppercase tracking-widest">
                <div>
                  <span className="block text-text-muted mb-1">Document Status</span>
                  <span className="text-accent flex items-center gap-2">
                    <Lock className="w-3 h-3" /> Draft / Technical Roadmap (Synced Mar 6, 2026)
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-text-muted mb-1">Architecture</span>
                  <span className="text-text-primary">Phase 0 - 5</span>
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="pl-6 border-l border-text-muted/30">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-primary mb-3">Abstract.</h2>
              <p className="text-sm leading-relaxed text-text-secondary pr-8">
                A purely peer-to-peer version of electronic cash and AI agent commerce would allow online payments and autonomous economic activities to be sent directly from one party to another without going through a financial institution or centralized API provider. This document outlines six phases of ArxMint&apos;s development, from foundational security hardening through a decentralized merchant payment platform. ArxMint integrates Fedimint, Cashu, Lightning L402, and the Model Context Protocol (MCP) into sovereign Bitcoin payment infrastructure that any merchant can self-host with a three-question wizard. Every task traces back to rigorous core research and 11 self-hosting UX studies, prioritized by security impact.
              </p>
            </div>
          </ScrollReveal>
        </section>

        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <ScrollReveal delay={0.15} direction="up">
            <div className="ml-6 rounded-sm border border-accent/20 bg-accent/5 p-5">
              <h3 className="text-[11px] font-mono font-bold uppercase tracking-widest text-accent mb-4">Current State</h3>
              <div className="space-y-3">
                {currentState.map((item) => (
                  <p key={item} className="text-sm text-text-secondary flex items-start gap-3">
                    <ArrowRight className="w-3 h-3 mt-1 text-accent flex-shrink-0" />
                    <span>{item}</span>
                  </p>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* Table of Contents */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <ScrollReveal delay={0.2} direction="up">
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-widest text-text-muted mb-4 ml-6">Table of Contents</h3>
            <div className="flex flex-col gap-1 p-4 bg-bg-surface/30 rounded-sm border border-border-default/50 font-mono text-sm">
              {phases.map((phase) => (
                <a
                  key={phase.number}
                  href={`#phase-${phase.number}`}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between items-start gap-2 sm:gap-0 px-4 py-3 sm:py-2 rounded-sm transition-all duration-[200ms] ${phase.status === "current"
                    ? "bg-accent/5 text-accent font-medium border-l-2 border-accent"
                    : phase.status === "done"
                      ? "text-text-secondary hover:bg-bg-elevated border-l-2 border-green-500/30"
                      : "text-text-muted hover:bg-bg-elevated hover:text-text-primary border-l-2 border-transparent"
                    }`}
                >
                  <span className="flex items-center gap-4">
                    <span className="opacity-60 text-xs">{phase.number}.0</span>
                    <span>{phase.codename}: {phase.title}</span>
                  </span>
                  <span className="text-[10px] uppercase tracking-widest opacity-50">
                    {phase.status === "done" ? "[completed]" : phase.status === "current" ? "[active]" : "[pending]"}
                  </span>
                </a>
              ))}
            </div>
          </ScrollReveal>
        </section>

        {/* Timeline Bar */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <ScrollReveal delay={0.3} direction="up">
            <div className="rounded-sm border border-border-default/50 p-6 bg-bg-surface/20">
              <h3 className="text-[11px] font-mono text-accent tracking-widest uppercase mb-6 flex items-center gap-2 border-b border-border-default/50 pb-2">
                <Clock className="w-3 h-3" /> Execution Timeline
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
                {phases.map((phase) => (
                  <div key={phase.number} className="text-left">
                    <span className="text-[10px] font-mono text-text-muted block mb-1 tracking-widest">PHASE {phase.number}.0</span>
                    <span className={`text-xs font-mono font-medium ${phase.status === "done" ? "text-green-400/70" :
                      phase.status === "current" ? "text-accent" : "text-text-secondary"
                      }`}>
                      {phase.timeline}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </section>

        <div className="h-px w-full bg-border-subtle" />

        {/* Document Body / Phases */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <StaggerContainer className="space-y-24">
            {phases.map((phase, phaseIdx) => (
              <StaggerItem key={phase.number}>
                <section
                  id={`phase-${phase.number}`}
                  className="scroll-mt-32 relative font-mono"
                >
                  {/* Connecting Line */}
                  {phaseIdx !== phases.length - 1 && (
                    <div className="absolute left-[27px] top-[70px] bottom-[-130px] w-px bg-border-strong rounded-full" />
                  )}

                  <div className="flex items-start gap-4 sm:gap-6 mb-8 relative z-10 w-full">
                    <div
                      className={`flex-shrink-0 w-14 h-14 rounded-sm flex items-center justify-center border shadow-lg ${phase.status === "current"
                        ? "bg-bg-base border-accent shadow-[0_0_15px_rgba(247,147,26,0.15)]"
                        : phase.status === "done"
                          ? "bg-bg-surface border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                          : "bg-bg-surface border-border-strong shadow-black/50"
                        }`}
                    >
                      <phase.icon
                        className={`w-6 h-6 ${phase.status === "current"
                          ? "text-accent"
                          : phase.status === "done"
                            ? "text-green-400"
                            : "text-text-muted"
                          }`}
                      />
                    </div>

                    <div className="flex-1 mb-[2px] border-b border-border-default/50 pb-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between items-start gap-3 sm:gap-0 mb-4">
                        <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight !font-sans uppercase">
                          <span className="text-text-muted mr-3 font-mono">{phase.number}.0</span>
                          {phase.codename}: {phase.title}
                        </h2>
                        <div className="flex items-center gap-3">
                          {phase.status === "done" && (
                            <span className="text-[10px] px-2 py-1 rounded-sm flex items-center gap-1 bg-green-500/10 text-green-400 border border-green-500/20 tracking-widest uppercase">
                              <CheckCircle2 className="w-3 h-3" /> VERIFIED
                            </span>
                          )}
                          {phase.status === "current" && (
                            <span className="text-[10px] px-2 py-1 rounded-sm flex items-center gap-1 bg-accent/10 text-accent border border-accent/20 tracking-widest uppercase">
                              <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" /> IN PROGRESS
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="pl-6 border-l-2 border-border-strong">
                        <p className="text-text-secondary text-sm leading-relaxed max-w-2xl font-light mb-3">
                          {phase.description}
                        </p>
                        {phase.humanDescription && (
                          <p className="text-xs text-accent/80 flex items-start gap-2 max-w-2xl">
                            <ArrowRight className="w-3 h-3 mt-[2px] flex-shrink-0" />
                            <span>{phase.humanDescription}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tasks styled as technical sub-sections */}
                  <div className="space-y-6 pl-[20px] sm:pl-[80px]">
                    {phase.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="group flex gap-4 pl-6 relative"
                      >
                        {/* Connecting line for sub-items */}
                        <div className="absolute left-[11px] top-6 bottom-[-24px] w-px bg-border-subtle group-last:hidden" />

                        <div className="mt-1 flex-shrink-0 z-10 bg-bg-base">
                          <StatusIcon
                            status={
                              phase.status === "done" ? "done" : phase.status === "current" ? "current" : task.status
                            }
                          />
                        </div>
                        <div className="flex-1 pb-2">
                          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 mb-1">
                            <span className="text-xs font-semibold text-text-primary">
                              {phase.number}.{task.id.split('.')[1]} {task.title}
                            </span>
                            <span className="text-[10px] text-text-muted opacity-50 tracking-widest">
                              [TK_{task.id.replace('.', '')}]
                            </span>
                          </div>

                          {task.humanTitle && (
                            <p className="text-[11px] text-accent/70 mb-2 flex items-center gap-1.5">
                              <ArrowRight className="w-3 h-3" /> {task.humanTitle}
                            </p>
                          )}

                          <p className="text-xs text-text-secondary leading-relaxed max-w-3xl">
                            {task.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>

        {/* CTA / Appendix */}
        <section className="relative py-24 border-t border-border-default mt-8">
          <div className="absolute inset-0 bg-bg-surface/20 z-0" />
          <div className="relative z-10 max-w-4xl mx-auto px-4 font-mono text-center">
            <h2 className="text-xl font-bold text-text-primary mb-4 tracking-tight uppercase">
              Appendix A: Contribute
            </h2>
            <p className="text-text-secondary text-sm mb-8 max-w-xl mx-auto">
              ArxMint is open source infrastructure. Review the specification, audit the code, or submit proposals for the active phase.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
              <a href="https://github.com/Traviseric/arxmint" target="_blank" rel="noopener noreferrer" className="antigravity-btn !px-8 !py-3 w-full sm:w-auto">
                <Github className="w-4 h-4 mr-2" />
                View Source Repository
              </a>
              <a href="/create" className="antigravity-btn-outline !px-8 !py-3 w-full sm:w-auto text-text-secondary">
                Initialize Reference Deployment
              </a>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
